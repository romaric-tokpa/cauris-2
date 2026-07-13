/* ============================================================
   MaCaisse — logique applicative (multi-mois / cycles)
   • Juin 2026 = cycle d'origine (window.MACAISSE), inchangé.
   • Chaque mois suivant = nouveau cycle, soldes & coffres reportés.
   • Historique par jour / mois / année.
   ============================================================ */
(function(){
  const S = window.MACAISSE;
  const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

  /* ---------- storage helpers ---------- */
  function load(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
  function bucketKey(id){ return 'macaisse-m-'+id; }
  function loadBucket(id){ return load(bucketKey(id), {newOps:[],dettePaid:{},ventilations:null,coffreOverrides:{},opOverrides:{},opDeletes:[]}); }

  /* ---------- cycles registry ---------- */
  function defaultCycles(){ return { activeId:'2026-06', months:[ {id:'2026-06',label:'Juin 2026',mm:'06',year:2026,monthName:'juin',seed:true} ] }; }
  function migrateJune(){
    if(localStorage.getItem('macaisse-m-2026-06')) return;
    const b={ newOps:load('macaisse-newops-v1',[]), dettePaid:load('macaisse-dettes-v1',{}),
              ventilations:load('macaisse-ventilations-v2',null), coffreOverrides:load('macaisse-coffres-v1',{}) };
    try{ localStorage.setItem('macaisse-m-2026-06', JSON.stringify(b)); }catch(e){}
  }
  let cycles = load('macaisse-cycles-v1', null);
  if(!cycles){ cycles=defaultCycles(); migrateJune(); try{ localStorage.setItem('macaisse-cycles-v1',JSON.stringify(cycles)); }catch(e){} }
  function saveCycles(){ try{ localStorage.setItem('macaisse-cycles-v1',JSON.stringify(cycles)); }catch(e){} }

  /* ---------- active-month state ---------- */
  let M, newOps, dettePaid, ventilations, coffreOverrides, userDettes, opOverrides, opDeletes;
  let ventEditId=null, editingCoffre=null, editIdx=null;
  let filterText='', filterCat='', filterType='all';
  let opPage=0, opPageSize=25, xMode='pay';
  let histView='jour';

  function setActive(id){
    M = cycles.months.find(m=>m.id===id) || cycles.months[0];
    cycles.activeId = M.id; saveCycles();
    const b = loadBucket(M.id);
    newOps = b.newOps||[];
    dettePaid = b.dettePaid||{};
    ventilations = (b.ventilations!=null) ? b.ventilations : (M.seed ? seedVentilations() : []);
    coffreOverrides = b.coffreOverrides||{};
    userDettes = b.userDettes||[];
    opOverrides = b.opOverrides||{};
    opDeletes = b.opDeletes||[];
  }
  function saveBucket(){ try{ localStorage.setItem(bucketKey(M.id), JSON.stringify({newOps,dettePaid,ventilations,coffreOverrides,userDettes,opOverrides,opDeletes})); }catch(e){} }
  const persist=saveBucket, persistV=saveBucket, persistCoffres=saveBucket;
  function coffreObjectif(c){ const o=coffreOverrides[c.nom]; return (o!=null&&o>0)?o:c.objectif; }

  /* ---------- base providers (seed vs derived) ---------- */
  function positionsValue(c){ return (c.positions||[]).reduce((s,p)=>s+(Number(p.quantite)||0)*(Number(p.coursActuel)||0),0); }
  function baseComptes(){ return (M.seed? S.comptes : M.opening.comptes).map(c=>{ const cc={...c}; if(c.positions) cc.positions=c.positions.map(p=>({...p})); if(cc.type==='placement') cc.solde=positionsValue(cc); return cc; }); }
  function baseCoffres(){ return (M.seed? S.coffres : M.opening.coffres).map(c=>({...c})); }
  function baseCategories(){ const m={}; archivedOps().forEach(o=>{ if(o.type==='dépense'){ const l=o.cat||'Divers'; m[l]=(m[l]||0)+Math.abs(o.montant); } }); return m; }
  function baseRevCategories(){ const m={}; if(M.seed && S.revCategories){ S.revCategories.forEach(x=>m[x.label]=x.value); } else { archivedOps().forEach(o=>{ if(o.type==='revenu'){ const l=o.cat||o.lib||'Divers'; m[l]=(m[l]||0)+Math.abs(o.montant); } }); } return m; }
  function baseDepense(){ return archivedOps().reduce((s,o)=> o.type==='dépense'? s+Math.abs(o.montant): s, 0); }
  function baseRevenus(){ return archivedOps().reduce((s,o)=> o.type==='revenu'? s+Math.abs(o.montant): s, 0); }
  /* Opérations importées (historique). Le seed juin vient de S.operations ; les
     autres mois portent leur log dans meta.archive. Ces opérations n'affectent
     PAS les soldes (soldes = comptes/opening, valeur courante partagée) ; seules
     les nouvelles opérations saisies (newOps) font évoluer les soldes. */
  function archivedOpsRaw(){ return M.seed? S.operations : (M.archive||[]); }
  function archivedOps(){
    const raw=archivedOpsRaw();
    return raw.map((o,i)=>{
      if((opDeletes||[]).includes(i)) return null;
      const ov=opOverrides&&opOverrides[i];
      return ov ? {...ov,_origIndex:i} : {...o,_origIndex:i};
    }).filter(Boolean);
  }
  function monthDettes(){ return M.seed? S.dettes : []; }

  /* ---------- format ---------- */
  function fmt(n){ return Math.round(n).toLocaleString('fr-FR').replace(/\u00A0|\s/g,'\u202F'); }
  function parseDate(d){ const m=(d||'').match(/(\d+)\/(\d+)/); return m? (+m[2])*100+(+m[1]) : 0; }
  function dayOfWeek(dd,mm,year){ const dows=['DIM','LUN','MAR','MER','JEU','VEN','SAM']; const dt=new Date(year, parseInt(mm,10)-1, parseInt(dd,10)); return dows[dt.getDay()]; }
  function hhmm(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  /* Date par défaut d'une nouvelle opération = date du jour, dans le mois du cycle
     actif (JJ/MM). L'utilisateur peut la modifier dans le formulaire. */
  function defaultOpDate(){ return String(new Date().getDate()).padStart(2,'0')+'/'+M.mm; }
  function normName(s){ return (s||'').toLowerCase().replace(/coffre|\(.*?\)/g,'').replace(/[^a-zàâçéèêëîïôûùüÿñæœ' ]/g,'').trim(); }

  /* ---------- corrections sur les opérations archivées (modif./suppr.) ---------- */
  function reverseOp(o){
    if(o.type==='virement') return {type:'virement', compte:o.compteDest, compteDest:o.compte, montant:Math.abs(o.montant), cat:''};
    if(o.type==='dépense') return {type:'revenu', compte:o.compte, montant:Math.abs(o.montant), cat:o.cat};
    if(o.type==='revenu') return {type:'dépense', compte:o.compte, montant:-Math.abs(o.montant), cat:o.cat};
    return {type:o.type, compte:o.compte, montant:0};
  }
  function archAdjOps(){
    const out=[]; const arch=archivedOpsRaw();
    (opDeletes||[]).forEach(i=>{ const o=arch[i]; if(o) out.push(reverseOp(o)); });
    Object.keys(opOverrides||{}).forEach(k=>{ const i=+k; const o=arch[i]; if(o){ out.push(reverseOp(o)); out.push(opOverrides[k]); } });
    return out;
  }

  /* ---------- live state ---------- */
  function liveComptes(){
    const map = {}; baseComptes().forEach(c=> map[c.nom]={...c});
    newOps.concat(archAdjOps()).forEach(o=>{ const a=Math.abs(o.montant);
      if(o.type==='dépense'){ if(map[o.compte]) map[o.compte].solde-=a; }
      else if(o.type==='revenu'){ if(map[o.compte]) map[o.compte].solde+=a; }
      else if(o.type==='virement'){ if(map[o.compte]) map[o.compte].solde-=a; if(o.compteDest&&map[o.compteDest]) map[o.compteDest].solde+=a; }
      // titres : le compte "placement" tire sa valeur de ses positions (marché),
      // les opérations ne bougent que le CASH des comptes source/destination.
      else if(o.type==='achat_titre'){ if(map[o.compte]) map[o.compte].solde-=a; }
      else if(o.type==='dividende'){ if(map[o.compte]) map[o.compte].solde+=a; }
      else if(o.type==='vente_titre'){ if(map[o.compte]) map[o.compte].solde+=a; }
    });
    return Object.values(map);
  }
  function sumType(c,t){ return c.filter(x=>x.type===t).reduce((s,x)=>s+x.solde,0); }
  function liveKpis(){
    const c=liveComptes();
    const dispo=sumType(c,'disponible'), coffres=sumType(c,'épargne'), bloque=sumType(c,'bloqué'), placement=sumType(c,'placement');
    const newDep=newOps.filter(o=>o.type==='dépense').reduce((s,o)=>s+Math.abs(o.montant),0);
    const newRev=newOps.filter(o=>o.type==='revenu'||o.type==='dividende').reduce((s,o)=>s+Math.abs(o.montant),0);
    const depense = baseDepense()+newDep;
    const revenus = baseRevenus()+newRev;
    const epargneNette = revenus-depense;
    const tauxEpargne = revenus>0 ? epargneNette/revenus : 0;
    return { patrimoine:dispo+coffres+bloque+placement, disponible:dispo, epargne:coffres+bloque, coffres, bloque, placement, depense, revenus, epargneNette, tauxEpargne, comptes:c };
  }
  function liveCategories(){
    const map=baseCategories();
    newOps.filter(o=>o.type==='dépense').forEach(o=>{ const l=o.cat||'Divers'; map[l]=(map[l]||0)+Math.abs(o.montant); });
    return Object.entries(map).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  }
  function liveRevCategories(){
    const map=baseRevCategories();
    newOps.filter(o=>o.type==='revenu').forEach(o=>{ const l=o.cat||'Divers'; map[l]=(map[l]||0)+Math.abs(o.montant); });
    return Object.entries(map).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  }
  /* coffre épargne vivant = solde du compte correspondant si trouvé */
  function liveCoffres(){
    const comptes=liveComptes();
    return baseCoffres().map(c=>{ const acct=comptes.find(a=>normName(a.nom)===normName(c.nom)); return {...c, epargne: acct?acct.solde:c.epargne}; });
  }

  /* ============================================================
     PLACEMENTS / PORTEFEUILLE TITRES (BRVM) — structure réutilisable
     ------------------------------------------------------------
     Un compte de type "placement" porte une liste `positions`
     [{code,nom,quantite,pru,coursActuel}]. Son solde = Σ quantite×coursActuel
     (valeur de marché), calculé dans baseComptes(). Les opérations ne
     déplacent que le CASH des comptes source/destination ; les titres
     eux-mêmes vivent dans les positions du compte placement.
     ============================================================ */
  function placementSource(){ return M.seed? S.comptes : M.opening.comptes; }
  function ensurePlacement(nom){
    const src=placementSource();
    let acct=src.find(c=>c.nom===nom);
    if(!acct){ acct={nom, type:'placement', solde:0, positions:[]}; src.push(acct); saveCycles(); }
    if(!acct.positions) acct.positions=[];
    return acct;
  }
  /* Achat : sort le cash du compte source, crée/augmente la position (PRU moyen
     pondéré, hors frais), enregistre les frais en dépense (cat "Frais"). */
  function recordAchatTitre(o){
    const acct=ensurePlacement(o.portefeuille||'Portefeuille BRVM');
    const qty=Number(o.quantite)||0, pu=Number(o.prixUnitaire)||0;
    let pos=acct.positions.find(p=>p.code===o.code);
    if(pos){ const totCost=pos.quantite*pos.pru + qty*pu; pos.quantite+=qty; pos.pru=pos.quantite? Math.round(totCost/pos.quantite*100)/100:0; if(o.coursActuel!=null) pos.coursActuel=Number(o.coursActuel); }
    else { pos={code:o.code, nom:o.nom||o.code, quantite:qty, pru:pu, coursActuel:o.coursActuel!=null?Number(o.coursActuel):pu}; acct.positions.push(pos); }
    saveCycles();
    const gid='t'+Date.now(), cout=qty*pu, frais=Math.abs(Number(o.frais)||0);
    newOps.push({date:o.date, lib:'Achat '+qty+' × '+(o.nom||o.code), type:'achat_titre', compte:o.source, cat:'', montant:-cout, note:'PRU '+fmt(pu)+' · '+o.code, portefeuille:acct.nom, titre:o.code, _xlink:gid, _ts:Date.now(), _t:hhmm()});
    if(frais>0) newOps.push({date:o.date, lib:'Frais — Achat '+o.code, type:'dépense', compte:o.source, cat:'Frais', montant:-frais, note:'Frais de courtage', _xlink:gid, _ts:Date.now()-1, _t:hhmm()});
    persist(); refreshAll(); return pos;
  }
  /* Dividende : entre du cash en revenu (catégorie "Dividendes"), rattaché à une position. */
  function recordDividende(o){
    newOps.push({date:o.date, lib:o.lib||('Dividende '+o.code), type:'dividende', compte:o.dest, cat:'Dividendes', montant:Math.abs(Number(o.montant)||0), note:o.note||'', portefeuille:o.portefeuille||'Portefeuille BRVM', titre:o.code, _ts:Date.now(), _t:hhmm()});
    persist(); refreshAll();
  }
  /* Vente : réduit/solde une position, rentre le cash brut sur le compte dest,
     frais en dépense, calcule la +/- value réalisée (hors frais). */
  function recordVenteTitre(o){
    const acct=ensurePlacement(o.portefeuille||'Portefeuille BRVM');
    const pos=acct.positions.find(p=>p.code===o.code);
    if(!pos){ toast('Position introuvable : '+o.code); return null; }
    const qty=Math.min(Number(o.quantite)||0, pos.quantite), pu=Number(o.prixUnitaire)||0, frais=Math.abs(Number(o.frais)||0);
    const brut=qty*pu, net=brut-frais, plReal=Math.round(qty*(pu-pos.pru)*100)/100;
    pos.quantite-=qty; if(pos.quantite<=0) acct.positions=acct.positions.filter(p=>p!==pos);
    saveCycles();
    const gid='t'+Date.now();
    newOps.push({date:o.date, lib:'Vente '+qty+' × '+(pos.nom||o.code), type:'vente_titre', compte:o.dest, cat:'', montant:brut, note:'Net '+fmt(net)+' F · +/- value '+(plReal>=0?'+':'−')+fmt(Math.abs(plReal))+' F', portefeuille:acct.nom, titre:o.code, plReal:plReal, _xlink:gid, _ts:Date.now(), _t:hhmm()});
    if(frais>0) newOps.push({date:o.date, lib:'Frais — Vente '+o.code, type:'dépense', compte:o.dest, cat:'Frais', montant:-frais, note:'Frais de courtage', _xlink:gid, _ts:Date.now()-1, _t:hhmm()});
    persist(); refreshAll(); return {plReal, net};
  }

  /* ============================================================ DASHBOARD */
  function renderDash(){
    const k=liveKpis(); const added=newOps.length;
    const baseMap={}; baseComptes().forEach(c=>baseMap[c.nom]=c.solde);
    document.getElementById('asof-label').innerHTML = M.seed
      ? (added? 'Mis à jour · <b>'+added+' op. ajoutée'+(added>1?'s':'')+'</b>' : 'Snapshot au <b>'+S.asOf+'</b>')
      : 'Cycle <b>'+M.label+'</b>'+(added?' · '+added+' op.':' · démarré');

    const fraisMois=allOps().filter(o=>o.type==='dépense' && (o.cat||'').toLowerCase()==='frais').reduce((s,o)=>s+Math.abs(o.montant),0);
    document.getElementById('kpiRow').innerHTML = `
      <div class="kpi dark"><div class="k">Patrimoine total</div><div class="v num">${fmt(k.patrimoine)}<span class="cur">FCFA</span></div><div class="d">Disponible + épargne, tous comptes</div></div>
      <div class="kpi"><div class="k">Disponible</div><div class="v num">${fmt(k.disponible)}<span class="cur">F</span></div><div class="d">Hors épargne</div></div>
      <div class="kpi"><div class="k">Épargne</div><div class="v num">${fmt(k.epargne)}<span class="cur">F</span></div><div class="d">Coffres + bloquée</div></div>
      <div class="kpi accent"><div class="k">Dépensé en ${M.monthName}</div><div class="v num">${fmt(k.depense)}<span class="cur">F</span></div><div class="d">${fraisMois>0?`dont <b style="color:var(--red)">${fmt(fraisMois)} F de frais</b>`:(M.seed?('1er → '+S.asOf.split(' ')[0]+' '+M.monthName):'Cycle en cours')}${added&&fraisMois>0?'':(added?' · maj':'')}</div></div>`;

    const tauxPct=(k.tauxEpargne*100);
    const tauxCls = tauxPct>=20 ? 'good' : (tauxPct>=0 ? 'mid' : 'bad');
    document.getElementById('kpiRow2').innerHTML = `
      <div class="kpi rev"><div class="k">Revenus en ${M.monthName}</div><div class="v num" style="color:var(--green)">${fmt(k.revenus)}<span class="cur">F</span></div><div class="d">Toutes sources confondues</div></div>
      <div class="kpi"><div class="k">Épargne nette du mois</div><div class="v num" style="color:${k.epargneNette>=0?'var(--green)':'var(--red)'}">${k.epargneNette>=0?'+':'−'}${fmt(Math.abs(k.epargneNette))}<span class="cur">F</span></div><div class="d">Revenus − dépenses</div></div>
      <div class="kpi"><div class="k">Taux d'épargne</div><div class="v num tx-${tauxCls}">${tauxPct.toFixed(1)}<span class="cur">%</span></div><div class="d">Épargne nette / revenus</div></div>`;

    const split=[
      {label:'Disponible', value:k.disponible, color:'var(--orange)'},
      {label:'Coffres (urgence + scolarité)', value:k.coffres, color:'var(--anthracite)'},
      {label:'Épargne bloquée', value:k.bloque, color:'var(--acier)'}
    ];
    if(k.placement>0) split.push({label:'Placements (BRVM)', value:k.placement, color:'var(--violet)'});
    const tot=split.reduce((s,x)=>s+x.value,0)||1; let acc=0;
    const segs=split.map(s=>{ const a=acc,b=acc+s.value/tot*100; acc=b; return `${s.color} ${a.toFixed(2)}% ${b.toFixed(2)}%`; }).join(', ');
    document.getElementById('donut').style.background=`conic-gradient(${segs})`;
    document.getElementById('donutCenter').innerHTML=`<b class="num">${fmt(k.patrimoine/1000)}k</b><span>FCFA</span>`;
    document.getElementById('donutLegend').innerHTML=split.map(s=>`
      <div class="li"><span class="dot" style="background:${s.color}"></span>${s.label}
      <span class="lv num">${fmt(s.value)}</span><span class="lp">${(s.value/tot*100).toFixed(1)}%</span></div>`).join('');

    const cats=liveCategories(); const max=cats.length?cats[0].value:1;
    document.getElementById('catBars').innerHTML = cats.length? cats.map(c=>`
      <div class="bar-row"><div class="bl" title="${c.label}">${c.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(c.value/max*100).toFixed(1)}%"></div></div>
      <div class="bv num">${fmt(c.value)}</div></div>`).join('')
      : '<div class="vempty" style="padding:22px">Aucune dépense ce mois-ci pour l’instant.</div>';

    const revs=liveRevCategories(); const maxRev=revs.length?revs[0].value:1;
    const revBox=document.getElementById('revBars');
    if(revBox){
      revBox.innerHTML = revs.length? revs.map(c=>`
        <div class="bar-row"><div class="bl" title="${c.label}">${c.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(c.value/maxRev*100).toFixed(1)}%;background:var(--green)"></div></div>
        <div class="bv num">${fmt(c.value)}</div></div>`).join('')
        : '<div class="vempty" style="padding:22px">Aucun revenu ce mois-ci pour l’instant.</div>';
    }

    const groups=[{t:'Comptes disponibles',type:'disponible',pill:'dispo'},{t:'Coffres (épargne accessible)',type:'épargne',pill:'epargne'},{t:'Placements (BRVM)',type:'placement',pill:'placement'},{t:'Épargne bloquée',type:'bloqué',pill:'bloque'}];
    const totalPatr=k.patrimoine||1;
    const accent={'disponible':'var(--orange)','épargne':'var(--blue)','bloqué':'var(--acier)','placement':'var(--violet)'};
    const ICON={
      phone:'<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4"/>',
      bank:'<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3.5 20.5h17"/>',
      cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
      safe:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="13" cy="12" r="3"/><path d="M3 8h2M3 16h2"/>',
      chart:'<path d="M4 20V4M4 20h16"/><path d="M8 16l3.5-4 3 3L20 8"/>'
    };
    const svg=k2=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k2]||ICON.safe}</svg>`;
    function brandFor(nom,type){
      const n=nom.toLowerCase();
      if(type==='placement') return {color:'#7A4FD0',icon:'chart'};
      if(type!=='disponible'){ if(/urgence/.test(n)) return {color:'#E2541A',icon:'safe'}; if(/scolar/.test(n)) return {color:'#2A6FDB',icon:'safe'}; return {color:'#6C737B',icon:'safe'}; }
      if(/banque|sgbci/.test(n)) return {color:'#1F3A5F',icon:'bank',logo:'assets/logo-sgbci.png'};
      if(/djamo/.test(n)) return {color:'#0A0A0A',icon:'phone',logo:'assets/logo-djamo.png'};
      if(/wave/.test(n)) return {color:'#1DC8F0',icon:'phone',logo:'assets/logo-wave.png'};
      if(/orange money|\bom\b/.test(n)) return {color:'#FF7900',icon:'phone',logo:'assets/logo-om.png'};
      if(/cash|esp/.test(n)) return {color:'#1F8A5B',icon:'cash'};
      return {color:'#6C737B',icon:'phone'};
    }
    document.getElementById('acctList').innerHTML=groups.map(g=>{
      const items=k.comptes.filter(c=>c.type===g.type); const sub=items.reduce((s,c)=>s+c.solde,0);
      if(!items.length) return '';
      const grpMax=Math.max(1,...items.map(c=>Math.abs(c.solde)));
      return `<div class="acg" style="--ac:${accent[g.type]}">
        <div class="acg-h"><div class="acg-l">${g.t}</div><div class="acg-r"><div class="acg-sub num">${fmt(sub)} F</div><div class="acg-pct">${(sub/totalPatr*100).toFixed(0)}% du patrimoine</div></div></div>
        <div class="acg-rows">`+
        items.map(c=>{ const dlt=Math.round(c.solde-(baseMap[c.nom]||0)); const w=Math.min(100,Math.abs(c.solde)/grpMax*100); const br=brandFor(c.nom,c.type);
          return `<div class="acrow${c.solde<0?' neg':''}" style="--ac:${br.color}" data-acct="${c.nom.replace(/"/g,'&quot;')}" role="button" tabindex="0" title="Voir les opérations de ce compte">
            <div class="acrow-top">
              <span class="acbadge" style="background:${br.logo?'#fff':'var(--ac)'};${br.logo?'border:1px solid var(--line)':''}">${br.logo?`<img src="${br.logo}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`:svg(br.icon)}</span>
              <div class="acmid"><div class="acname">${c.nom}</div>${c.note?`<div class="acnote">${c.note}</div>`:''}</div>
              <span class="acgo">→</span>
            </div>
            <div class="acbal-row">
              <div class="acbal num">${fmt(c.solde)}<span class="acbal-c">F</span></div>
              ${dlt?`<span class="delta ${dlt>0?'up':'dn'}" title="Variation depuis l'ouverture du cycle">${dlt>0?'+':'−'}${fmt(Math.abs(dlt))}</span>`:''}
            </div>
            <div class="acbar"><div class="acbar-f" style="width:${w.toFixed(1)}%"></div></div>
            ${c.type==='placement'&&c.positions&&c.positions.length?`<div class="acpos">`+c.positions.map(p=>{ const val=(Number(p.quantite)||0)*(Number(p.coursActuel)||0); const cost=(Number(p.quantite)||0)*(Number(p.pru)||0); const pl=val-cost; const plc=pl>=0?'up':'dn';
              return `<div class="acpos-row">
                <div class="acpos-h"><b>${p.code}</b> <span class="acpos-nom">${p.nom||''}</span> <span class="acpos-q">×${p.quantite}</span></div>
                <div class="acpos-grid">
                  <div><span>Valorisation</span><b class="num">${fmt(val)} F</b></div>
                  <div><span>PRU</span><b class="num">${fmt(p.pru)}</b></div>
                  <div><span>Cours</span><b class="num">${fmt(p.coursActuel)}</b></div>
                  <div class="acpos-pl ${plc}"><span>+/- value latente</span><b class="num">${pl>=0?'+':'−'}${fmt(Math.abs(pl))} F</b></div>
                </div>
              </div>`; }).join('')+`</div>`:''}
          </div>`; }).join('')+
        `</div></div>`;
    }).join('');
    document.querySelectorAll('#acctList [data-acct]').forEach(el=>{ const go=()=>{ filterText=el.dataset.acct; const sb=document.getElementById('opSearch'); if(sb) sb.value=filterText; filterCat=''; filterType='all'; document.querySelectorAll('#typeChips .typechip').forEach(x=>x.classList.toggle('active',x.dataset.type==='all')); opPage=0; document.querySelector('[data-tab=ops]').click(); renderOps(); const f=document.getElementById('opFeed'); if(f) f.scrollIntoView({block:'start'}); toast('Journal filtré : '+filterText); }; el.onclick=go; el.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }; });
    renderCoherence(k); renderUrgence(); renderTrend();
  }

  /* ---------- contrôle de cohérence ---------- */
  function renderCoherence(k){
    const box=document.getElementById('cohCard'); if(!box) return;
    const comptes=k.comptes; const patr=comptes.reduce((s,c)=>s+c.solde,0);
    const validNames=comptes.map(c=>c.nom);
    const orphans=newOps.filter(o=>o.type==='virement' && (!o.compteDest || !validNames.includes(o.compteDest) || !validNames.includes(o.compte)));
    const neg=comptes.filter(c=>c.solde<0);
    const cofs=liveCoffres(); const mism=cofs.filter(c=>{ const a=comptes.find(x=>normName(x.nom)===normName(c.nom)); return a && Math.round(a.solde)!==Math.round(c.epargne); });
    const checks=[
      {ok:true, label:'Patrimoine = somme des comptes'},
      {ok:orphans.length===0, label: orphans.length? orphans.length+' virement(s) sans destination valide — l’argent ne boucle pas' : 'Chaque virement boucle (source → destination)', act: orphans.length?'orphan':null},
      {ok:neg.length===0, label: neg.length? neg.length+' compte(s) à découvert — une opération manque ?' : 'Aucun compte à découvert', act: neg.length?('neg:'+neg[0].nom):null},
      {ok:mism.length===0, label: mism.length? mism.length+' coffre(s) non réconcilié(s)' : 'Coffres alignés sur leurs comptes'}
    ];
    const allOk=checks.every(c=>c.ok);
    box.className='coh '+(allOk?'ok':'warn');
    box.innerHTML=`
      <div class="coh-badge"><span class="dot">${allOk?'✓':'⚠'}</span>${allOk?'Comptes cohérents':'À vérifier'}</div>
      <div class="coh-checks">${checks.map(c=>`<span class="coh-chk ${c.ok?'good':'bad'}${c.act?' clk':''}"${c.act?` data-coh="${c.act}"`:''}><span class="ci">${c.ok?'✓':'✕'}</span>${c.label}${c.act?' <span class="goarrow">→</span>':''}</span>`).join('')}</div>
      <div class="coh-patr">${fmt(patr)} F</div>`;
    box.querySelectorAll('[data-coh]').forEach(el=>el.onclick=()=>{
      const v=el.dataset.coh;
      if(v==='orphan'){ filterType='virement'; document.querySelectorAll('#typeChips .typechip').forEach(x=>x.classList.toggle('active',x.dataset.type==='virement')); }
      else if(v.startsWith('neg:')){ const nom=v.slice(4); filterText=nom; const sb=document.getElementById('opSearch'); if(sb) sb.value=nom; }
      document.querySelector('[data-tab=ops]').click(); renderOps();
      const f=document.getElementById('opFeed'); if(f) f.scrollIntoView({block:'start'});
      toast('Filtré sur l’opération à vérifier');
    });
  }

  function renderUrgence(){
    const fu=liveCoffres().find(c=>/urgence/i.test(c.nom)); if(!fu){ document.getElementById('urgenceGauge').innerHTML=''; return; }
    const obj=coffreObjectif(fu); const pct=obj?Math.min(100,fu.epargne/obj*100):0; const reste=Math.max(0,obj-fu.epargne);
    document.getElementById('urgenceGauge').innerHTML=`<div class="gauge-wrap">
      <div class="ring" style="background:conic-gradient(var(--orange) ${pct.toFixed(1)}%, #E7E3DA ${pct.toFixed(1)}% 100%)"><div class="ring-c"><b class="num">${pct.toFixed(0)}%</b><span>atteint</span></div></div>
      <div class="gauge-meta">
        <div class="gm"><span>Épargné</span><b class="num">${fmt(fu.epargne)} F</b></div>
        <div class="gm"><span>Objectif</span><b class="num">${fmt(obj)} F</b></div>
        <div class="gm"><span>Reste à épargner</span><b class="num">${fmt(reste)} F</b></div>
        <div class="gm-note">Réserve de 3 mois · sert aussi de coussin anti-agios. Objectif modifiable dans « Coffres ».</div>
      </div></div>`;
  }

  function renderTrend(){
    const mm=M.mm; const days={};
    let lastDay=0;
    allOps().filter(o=>o.type==='dépense' && String(o.date||'').endsWith('/'+mm)).forEach(o=>{ const dd=+String(o.date).split('/')[0]; if(dd>=1&&dd<=31){ days[dd]=(days[dd]||0)+Math.abs(o.montant); if(dd>lastDay) lastDay=dd; } });
    lastDay=Math.min(31,Math.max(lastDay, M.seed?15:10));
    let cum=0; const cumVals=[]; let peakDay=1,peakVal=0;
    for(let d=1;d<=lastDay;d++){ cum+=(days[d]||0); cumVals.push(cum); if((days[d]||0)>peakVal){peakVal=days[d];peakDay=d;} }
    const total=cum, maxC=total||1;
    const bars=cumVals.map((v,i)=>{ const d=i+1; const h=Math.max(2,v/maxC*100); return `<div class="tcol" title="${d}/${mm} — cumul ${fmt(v)} F"><div class="tbar" style="height:${h.toFixed(1)}%"></div><span class="tlbl">${d%2===1?d:''}</span></div>`; }).join('');
    document.getElementById('trendBox').innerHTML=`<div class="trend"><div class="trend-bars">${bars}</div>
      <div class="trend-foot"><span>Total <b class="num">${fmt(total)} F</b></span><span>Moy. <b class="num">${fmt(total/lastDay)} F</b>/j</span><span>${peakVal?('Pic le <b>'+peakDay+'/'+mm+'</b> · '+fmt(peakVal)+' F'):'—'}</span></div></div>`;
  }

  /* ============================================================ OPÉRATIONS */
  function allOps(){
    const arch=archivedOps().map(o=>({...o,_new:false,_edited:!!(opOverrides&&opOverrides[o._origIndex]),_i:o._origIndex,_seq:o._origIndex}));
    const nw=newOps.map((o,i)=>({...o,_new:true,_i:i,_seq:o._ts||(1e12+i)}));
    return arch.concat(nw).sort((a,b)=> parseDate(b.date)-parseDate(a.date) || (b._seq-a._seq));
  }
  function renderOps(){
    const rows=allOps().filter(o=>{
      if(filterType!=='all' && o.type!==filterType) return false;
      if(filterCat && o.cat!==filterCat) return false;
      if(filterText){ const t=filterText.toLowerCase(); return (o.lib+' '+(o.note||'')+' '+(o.compte||'')+' '+(o.cat||'')).toLowerCase().includes(t); }
      return true;
    });
    const dep=rows.filter(o=>o.type==='dépense').reduce((s,o)=>s+Math.abs(o.montant),0);
    const rev=rows.filter(o=>o.type==='revenu').reduce((s,o)=>s+Math.abs(o.montant),0);
    const opSum=document.getElementById('opSummary'); if(opSum) opSum.innerHTML=`
      <div class="minik"><div class="k">Dépenses${filterType!=='all'||filterCat||filterText?' (filtré)':''}</div><div class="v num" style="color:var(--red)">${fmt(dep)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
      <div class="minik"><div class="k">Revenus</div><div class="v num" style="color:var(--green)">${fmt(rev)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
      <div class="minik"><div class="k">Opérations affichées</div><div class="v num">${rows.length}</div></div>`;

    const feed=document.getElementById('opFeed');
    const pager=document.getElementById('opPager');
    if(!rows.length){ feed.innerHTML='<div class="vempty">Aucune opération'+(M.seed?' ne correspond à votre recherche.':' ce mois-ci. Ajoutez-en une, ou ventilez un revenu.')+'</div>'; if(pager) pager.innerHTML=''; return; }
    const total=rows.length;
    const size = opPageSize===0? total : opPageSize;
    const pages = Math.max(1, Math.ceil(total/size));
    if(opPage>=pages) opPage=pages-1; if(opPage<0) opPage=0;
    const start=opPage*size, end=Math.min(total,start+size);
    const slice=rows.slice(start,end);
    const groups=[]; let cur=null;
    slice.forEach(o=>{ if(!cur||cur.day!==o.date){ cur={day:o.date,items:[]}; groups.push(cur);} cur.items.push(o); });
    feed.innerHTML=groups.map(g=>{
      const dayDep=g.items.filter(x=>x.type==='dépense').reduce((s,x)=>s+Math.abs(x.montant),0);
      const rowsHtml=g.items.map(o=>{
        let cls,ic,sign;
        if(o.type==='dépense'){ cls='dep'; ic='↓'; sign='−'; }
        else if(o.type==='revenu'||o.type==='dividende'){ cls='rev'; ic='↑'; sign='+'; }
        else if(o.type==='achat_titre'){ cls='vir'; ic='◆'; sign='−'; }
        else if(o.type==='vente_titre'){ cls='rev'; ic='◆'; sign='+'; }
        else { cls='vir'; ic='⇄'; sign=''; }
        let dest='';
        if(o.type==='virement'&&o.compteDest) dest=' → '+o.compteDest;
        else if(o.type==='achat_titre'&&o.portefeuille) dest=' → '+o.portefeuille;
        else if(o.type==='vente_titre'&&o.portefeuille) dest=' ← '+o.portefeuille;
        return `<div class="op">
          <span class="op-mark ${cls}">${ic}</span>
          <div class="op-main"><div class="op-lib">${o.lib}${o._new?'<span class="newtag">ajout</span>':''}${o._edited?'<span class="grouptag">modifiée</span>':''}${o._xlink?'<span class="grouptag">liée</span>':''}</div>${o.note?`<div class="op-note">${o.note}</div>`:''}</div>
          <div class="op-tags">${o._t?`<span class="op-time">${o._t}</span>`:''}<span class="op-compte">${o.compte||''}${dest}</span>${o.cat?`<span class="tcat">${o.cat}</span>`:''}</div>
          <div class="op-amt ${cls}">${sign}${fmt(Math.abs(o.montant))}</div>
          <div class="op-act"><button class="iconbtn" data-edit="${o._new?'n':'a'}-${o._i}">Modif.</button><button class="iconbtn" data-del="${o._new?'n':'a'}-${o._i}">Suppr.</button></div>
        </div>`;
      }).join('');
      const dd=g.day.split('/')[0];
      const dow=dayOfWeek(dd,M.mm,M.year);
      return `<div class="feed-day">
        <div class="fd-head">
          <div class="fd-daybadge"><b>${dd}</b><span>${dow}</span></div>
          <span class="fd-date">${dd} ${M.monthName}</span>
          <div class="fd-meta"><span class="fd-count">${g.items.length} opération${g.items.length>1?'s':''}</span>${dayDep?`<span class="fd-daytotal">−${fmt(dayDep)} F</span>`:''}</div>
        </div>
        <div class="fd-rows">${rowsHtml}</div></div>`;
    }).join('');
    feed.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(b.dataset.edit));
    if(pager){
      const sizeSel=`<select id="opPageSizeBottom" title="Opérations par page" class="pg-size">
          <option value="25" ${opPageSize===25?'selected':''}>25 / page</option>
          <option value="50" ${opPageSize===50?'selected':''}>50 / page</option>
          <option value="0" ${opPageSize===0?'selected':''}>Tout afficher</option>
        </select>`;
      if(opPageSize!==0 && total>size){
        pager.innerHTML=`<span class="pg-info">${start+1}\u2013${end} sur ${total}</span>
          <div class="pg-btns">${sizeSel}<button class="iconbtn" id="pgPrev" ${opPage===0?'disabled':''}>\u2039 R\u00e9cent</button>
          <span class="pg-num">Page ${opPage+1} / ${pages}</span>
          <button class="iconbtn" id="pgNext" ${opPage>=pages-1?'disabled':''}>Ancien \u203a</button></div>`;
        const pp=document.getElementById('pgPrev'), pn=document.getElementById('pgNext');
        if(pp) pp.onclick=()=>{ if(opPage>0){ opPage--; renderOps(); document.getElementById('opFeed').scrollIntoView({block:'start'}); } };
        if(pn) pn.onclick=()=>{ if(opPage<pages-1){ opPage++; renderOps(); document.getElementById('opFeed').scrollIntoView({block:'start'}); } };
      } else pager.innerHTML=`<span class="pg-info">${total} op\u00e9ration${total>1?'s':''} affich\u00e9e${total>1?'s':''}</span><div class="pg-btns">${sizeSel}</div>`;
      const sb=document.getElementById('opPageSizeBottom'); if(sb) sb.onchange=e=>{ opPageSize=parseInt(e.target.value,10); opPage=0; renderOps(); };
    }
    feed.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
      const key=b.dataset.del; const kind=key[0]; const idx=+key.slice(2);
      if(kind==='n'){
        const op=newOps[idx]; const xl=op&&op._xlink;
        if(xl){ const grp=newOps.filter(o=>o._xlink===xl); if(grp.length>1 && !confirm('Cette écriture fait partie d’une opération croisée de '+grp.length+' lignes. Supprimer tout le groupe ?')){ return; } newOps=newOps.filter(o=>o._xlink!==xl); userDettes=userDettes.filter(d=>d._xlink!==xl); }
        else newOps.splice(idx,1);
      } else {
        if(!confirm('Supprimer cette opération importée ? Les soldes et totaux seront recalculés en conséquence.')) return;
        delete opOverrides[idx];
        if(!opDeletes.includes(idx)) opDeletes.push(idx);
      }
      persist(); refreshAll(); toast('Opération supprimée');
    });
  }
  function fillCatFilter(){
    const cats=[...new Set(allOps().map(o=>o.cat).filter(Boolean))].sort();
    document.getElementById('catFilter').innerHTML='<option value="">Toutes catégories</option>'+cats.map(c=>`<option>${c}</option>`).join('');
  }
  function fillCompteSelects(){
    const opts=baseComptes().map(c=>`<option>${c.nom}</option>`).join('');
    document.getElementById('fCompte').innerHTML=opts;
    document.getElementById('fCompteDest').innerHTML='<option value="">—</option>'+opts;
  }

  function openForm(key){
    document.getElementById('opForm').classList.add('open');
    editIdx = (key!=null) ? String(key) : null;
    let o=null;
    if(editIdx){
      const kind=editIdx[0], idx=+editIdx.slice(2);
      if(kind==='n') o=newOps[idx];
      else o=(opOverrides&&opOverrides[idx]) || archivedOps()[idx];
    }
    document.getElementById('fDate').value=o?o.date:defaultOpDate();
    document.getElementById('fLib').value=o?o.lib:'';
    document.getElementById('fType').value=o?o.type:'dépense';
    document.getElementById('fCompte').value=o?o.compte:baseComptes()[0].nom;
    if(o){
      const sel=document.getElementById('fCat'); const known=[...sel.options].some(op=>op.value===o.cat);
      if(o.cat && known){ sel.value=o.cat; document.getElementById('fCatCustom').style.display='none'; }
      else if(o.cat){ sel.value='__custom__'; document.getElementById('fCatCustom').style.display=''; document.getElementById('fCatCustom').value=o.cat; }
      else { sel.value=''; document.getElementById('fCatCustom').style.display='none'; }
    } else { document.getElementById('fCat').value=''; document.getElementById('fCatCustom').style.display='none'; document.getElementById('fCatCustom').value=''; }
    document.getElementById('fMontant').value=o?Math.abs(o.montant):'';
    let fraisVal='';
    if(editIdx && editIdx[0]==='n' && o && o._xlink && o.cat!=='Frais'){
      const lf=newOps.find(x=>x!==o && x.cat==='Frais' && x._xlink===o._xlink);
      if(lf) fraisVal=Math.abs(lf.montant);
    }
    document.getElementById('fFrais').value=fraisVal;
    document.getElementById('fNote').value=o?(o.note||''):'';
    document.getElementById('fCompteDest').value=o&&o.compteDest?o.compteDest:'';
    document.getElementById('formTitle').textContent=(editIdx!=null)?(editIdx[0]==='a'?'Modifier l’opération importée':'Modifier l’opération'):'Nouvelle opération';
    document.getElementById('fFraisWrap').style.display=(editIdx!=null && editIdx[0]==='a')?'none':'';
    syncType(); document.getElementById('fLib').focus();
  }
  document.addEventListener('change', e=>{
    if(e.target && e.target.id==='fCat'){ document.getElementById('fCatCustom').style.display = e.target.value==='__custom__' ? '' : 'none'; }
    if(e.target && e.target.id==='xCat'){ document.getElementById('xCatCustom').style.display = e.target.value==='__custom__' ? '' : 'none'; renderXPreview(); }
  });
  function closeForm(){ document.getElementById('opForm').classList.remove('open'); editIdx=null; }
  function syncType(){ const t=document.getElementById('fType').value;
    document.getElementById('destWrap').style.display=(t==='virement')?'flex':'none';
    document.getElementById('catWrap').style.display=(t==='virement')?'none':'';
    document.getElementById('fFraisWrap').style.display=(editIdx!=null && editIdx[0]==='a')?'none':''; }
  function saveForm(){
    const date=document.getElementById('fDate').value.trim();
    const lib=document.getElementById('fLib').value.trim();
    const type=document.getElementById('fType').value;
    const compte=document.getElementById('fCompte').value;
    const catSel=document.getElementById('fCat').value;
    const cat = catSel==='__custom__' ? document.getElementById('fCatCustom').value.trim() : catSel;
    let montant=parseFloat(document.getElementById('fMontant').value);
    const note=document.getElementById('fNote').value.trim();
    const compteDest=document.getElementById('fCompteDest').value;
    if(!lib||!montant||!date){ toast('Libellé, date et montant requis'); return; }
    if(type==='virement' && !compteDest){ toast('Un virement exige un compte de destination'); return; }
    if(type==='virement' && compteDest===compte){ toast('Source et destination doivent différer'); return; }
    montant=Math.abs(montant)*(type==='dépense'?-1:1);
    const frais=Math.abs(parseFloat(document.getElementById('fFrais').value)||0);
    const op={date,lib,type,compte,cat:type==='virement'?'':cat,montant,note};
    if(type==='virement'&&compteDest) op.compteDest=compteDest;

    if(editIdx!=null){
      const kind=editIdx[0], idx=+editIdx.slice(2);
      if(kind==='n'){ const p=newOps[idx]||{}; op._ts=p._ts||Date.now(); op._t=p._t||hhmm(); if(p._xlink) op._xlink=p._xlink; newOps[idx]=op;
        let fi=newOps.findIndex(x=>x!==op && x.cat==='Frais' && x._xlink && op._xlink && x._xlink===op._xlink);
        if(frais>0){
          if(fi>=0){ const f=newOps[fi]; f.date=date; f.compte=compte; f.montant=-frais; f.lib='Frais — '+lib; }
          else { if(!op._xlink) op._xlink='x'+Date.now(); newOps.push({date,lib:'Frais — '+lib,type:'dépense',compte,cat:'Frais',montant:-frais,note:'Frais de '+(type==='virement'?'virement':'transaction'),_xlink:op._xlink,_ts:Date.now()-1,_t:hhmm()}); }
        } else if(fi>=0){ newOps.splice(fi,1); }
      }
      else { opOverrides[idx]=op; if(opDeletes.includes(idx)) opDeletes=opDeletes.filter(x=>x!==idx); }
      persist(); closeForm(); refreshAll(); toast('Opération modifiée');
      return;
    }
    if(frais>0){ const gid='x'+Date.now(); op._xlink=gid; op._ts=Date.now(); op._t=hhmm(); newOps.push(op);
      newOps.push({date,lib:'Frais — '+lib,type:'dépense',compte,cat:'Frais',montant:-frais,note:'Frais de '+(type==='virement'?'virement':'transaction'),_xlink:gid,_ts:Date.now()-1,_t:hhmm()}); }
    else { op._ts=Date.now(); op._t=hhmm(); newOps.push(op); }
    persist(); closeForm(); refreshAll(); toast(frais>0?'Opération + frais ('+fmt(frais)+' F) ajoutés':'Opération ajoutée');
  }

  /* ---------- assistant opération croisée ---------- */
  function xVal(id){ return document.getElementById(id).value.trim(); }
  function xNum(id){ const n=parseFloat(document.getElementById(id).value); return isNaN(n)?0:Math.abs(n); }
  function isCoffreAcct(nom){ const c=baseComptes().find(x=>x.nom===nom); return c && c.type!=='disponible'; }
  function computeX(){
    const date=xVal('xDate'), lib=xVal('xLib');
    const catSelX=document.getElementById('xCat').value;
    const cat = catSelX==='__custom__' ? xVal('xCatCustom') : catSelX;
    const cout=xNum('xCout'), from=document.getElementById('xFrom').value;
    const tendu=xNum('xTendu'), frais=xNum('xFrais');
    let recu=document.getElementById('xRecu').value;
    if(xMode==='don') recu='';
    const fraisSur=document.getElementById('xFraisSur').value || (recu||from);
    const dette=document.getElementById('xDette').checked, echeance=xVal('xEcheance');
    const lines=[]; const xid='x'+Date.now(); const tsB=Date.now(), tN=hhmm();
    if(cout>0 && from) lines.push({date,lib,type:'dépense',compte:from,cat:cat||'Divers',montant:-cout,note:'Croisée : '+lib,_xlink:xid});
    let change=0;
    if(recu && tendu>cout){ change=tendu-cout; lines.push({date,lib:'Monnaie reçue — '+lib,type:'virement',compte:from,compteDest:recu,cat:'',montant:change,note:'Croisée : '+lib,_xlink:xid}); }
    if(frais>0) lines.push({date,lib:(xMode==='don'?'Frais transfert — ':'Frais — ')+lib,type:'dépense',compte:fraisSur,cat:'Frais',montant:-frais,note:'Croisée : '+lib,_xlink:xid});
    lines.forEach((l,i)=>{ l._ts=tsB-i; l._t=tN; });
    // net par compte
    const net={}; const add=(a,v)=>{ if(a) net[a]=(net[a]||0)+v; };
    add(from,-cout); if(change){ add(from,-change); add(recu,change); } if(frais>0) add(fraisSur,-frais);
    const patr=-(cout+frais);
    const detteObj = (dette && from) ? {id:xid, nom:(/^coffre/i.test(from)?from:'Coffre '+from)+' — '+lib, montant:cout+((fraisSur===from)?frais:0), retrait:date, echeance:echeance||'à définir', paid:false, _xlink:xid} : null;
    return {lines, net, patr, change, dette:detteObj, xid, valid: !!(lib && cout>0 && from && (!recu || tendu>=cout)) };
  }
  function renderXPreview(){
    const r=computeX(); const box=document.getElementById('xPreview');
    if(!r.lines.length){ box.innerHTML='<div class="xp-empty">Renseignez le coût et le compte pour voir la décomposition.</div>'; return; }
    const COL={'dépense':'var(--red)','virement':'var(--acier)','revenu':'var(--green)'};
    const rows=r.lines.map(l=>{ const sign=l.type==='dépense'?'−':l.type==='revenu'?'+':''; const dest=l.compteDest?' → '+l.compteDest:'';
      return `<div class="xp-line"><span class="xp-dot" style="background:${COL[l.type]}"></span><span class="xp-lib">${l.lib}</span><span class="xp-cpt">${l.compte}${dest}</span><span class="xp-amt" style="color:${COL[l.type]}">${sign}${fmt(Math.abs(l.montant))}</span></div>`;
    }).join('');
    const nets=Object.entries(r.net).map(([a,v])=>`<span class="xp-net">${a} <b class="num" style="color:${v<0?'var(--red)':v>0?'var(--green)':'var(--muted)'}">${v>0?'+':v<0?'−':''}${fmt(Math.abs(v))}</b></span>`).join('');
    box.innerHTML=`<div class="xp-t">${r.lines.length} écriture${r.lines.length>1?'s':''} générée${r.lines.length>1?'s':''}</div>
      <div class="xp-lines">${rows}</div>
      <div class="xp-recap"><div class="xp-nets">${nets}</div>
      <div class="xp-patr">Patrimoine <b class="num" style="color:var(--red)">−${fmt(Math.abs(r.patr))} F</b></div></div>
      ${r.dette?`<div class="xp-dette">＋ Dette inscrite : <b>${fmt(r.dette.montant)} F</b> à remettre au coffre (${r.dette.echeance})</div>`:''}`;
  }
  function setXMode(mode){
    xMode=mode;
    document.querySelectorAll('#xModeSeg .xmode').forEach(b=>b.classList.toggle('active',b.dataset.m===mode));
    const don=mode==='don';
    document.getElementById('xMonnaieSub').style.display=don?'none':'';
    document.getElementById('xCoutLab').textContent=don?'Montant du don reçu (F)':'Coût réel (F)';
    document.getElementById('xFraisLab').textContent=don?'Frais totaux (ex. 2×50)':'Frais (F)';
    document.getElementById('xDetteTxt').textContent=don?'Argent pris dans un coffre — créer une dette à rembourser':'L’argent vient d’un coffre — créer une dette à rembourser';
    document.getElementById('xFormTitle').textContent=don?'Assistant — envoi / don':'Assistant — opération croisée';
    document.getElementById('xHelp').innerHTML = don
      ? 'Un envoi ou un don (souvent depuis un coffre, avec des frais à chaque saut) : on enregistre le don qui part, les frais, et la dette au coffre. <button type="button" class="xlink" id="xDonEx">Exemple don anniv.</button>'
      : 'Une transaction réelle (course payée avec monnaie rendue) décomposée en écritures qui bouclent. <button type="button" class="xlink" id="xYango">Exemple Yango</button>';
    const yb=document.getElementById('xYango'); if(yb) yb.onclick=quickYango;
    const db=document.getElementById('xDonEx'); if(db) db.onclick=quickDon;
    renderXPreview();
  }
  function openXForm(mode){
    document.getElementById('xForm').classList.add('open');
    const opts=baseComptes().map(c=>`<option>${c.nom}</option>`).join('');
    document.getElementById('xFrom').innerHTML=opts;
    document.getElementById('xRecu').innerHTML='<option value="">— aucune —</option>'+opts;
    document.getElementById('xFraisSur').innerHTML='<option value="">auto</option>'+opts;
    document.getElementById('xDate').value=defaultOpDate();
    ['xLib','xCout','xTendu','xFrais','xEcheance'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('xCat').value=''; document.getElementById('xCatCustom').value=''; document.getElementById('xCatCustom').style.display='none';
    document.getElementById('xDette').checked=false; document.getElementById('xEchWrap').style.display='none';
    setXMode(mode||'pay');
    document.getElementById('xLib').focus();
  }
  function closeXForm(){ document.getElementById('xForm').classList.remove('open'); }
  function saveXForm(){
    const r=computeX();
    if(!r.valid){ toast('Coût, libellé et compte requis (et montant tendu ≥ coût)'); return; }
    r.lines.forEach(l=>newOps.push(l));
    if(r.dette) userDettes.push(r.dette);
    persist(); closeXForm(); refreshAll(); toast(r.lines.length+' écritures liées ajoutées');
  }
  function quickYango(){
    openXForm('pay');
    document.getElementById('xLib').value='Yango maison→gare'; document.getElementById('xCat').value='Transport';
    document.getElementById('xCout').value='4200';
    const comptes=baseComptes(); const cash=comptes.find(c=>/cash|esp/i.test(c.nom)); const wave=comptes.find(c=>/wave/i.test(c.nom));
    if(cash) document.getElementById('xFrom').value=cash.nom;
    document.getElementById('xTendu').value='5000';
    if(wave) document.getElementById('xRecu').value=wave.nom;
    document.getElementById('xFrais').value='10';
    renderXPreview();
  }
  function quickDon(){
    openXForm('don');
    document.getElementById('xLib').value='Don anniversaire (BEAH)'; document.getElementById('xCat').value='Famille';
    document.getElementById('xCout').value='4995';
    const cofUrg=baseComptes().find(c=>/urgence/i.test(c.nom));
    if(cofUrg) document.getElementById('xFrom').value=cofUrg.nom;
    document.getElementById('xFrais').value='100';
    document.getElementById('xDette').checked=true; document.getElementById('xEchWrap').style.display='flex';
    document.getElementById('xEcheance').value='Samedi 20/06';
    renderXPreview();
  }

  /* ============================================================ COFFRES & DETTES */
  function renderCoffres(){
    const cofs=liveCoffres();
    const totalEp=cofs.reduce((s,c)=>s+c.epargne,0);
    const accessible=cofs.filter(c=>!c.bloque).reduce((s,c)=>s+c.epargne,0);
    const bloquee=cofs.filter(c=>c.bloque).reduce((s,c)=>s+c.epargne,0);
    const cfOv=document.getElementById('coffreOverview'); if(cfOv) cfOv.innerHTML=`
      <div class="cfo-item"><span class="cfo-k">Épargne totale</span><span class="cfo-v num">${fmt(totalEp)}<span class="cur">F</span></span></div>
      <div class="cfo-item"><span class="cfo-k">Accessible</span><span class="cfo-v num">${fmt(accessible)}<span class="cur">F</span></span></div>
      <div class="cfo-item"><span class="cfo-k">Bloquée</span><span class="cfo-v num">${fmt(bloquee)}<span class="cur">F</span></span></div>`;

    let prio=0;
    document.getElementById('coffreList').innerHTML=cofs.map(c=>{
      const obj=coffreObjectif(c); const pct=obj?Math.min(100,c.epargne/obj*100):0;
      const warn=/⚠/.test(c.note); const done=obj>0&&c.epargne>=obj; const reste=Math.max(0,obj-c.epargne);
      const editing=editingCoffre===c.nom;
      const rank=c.bloque?'Épargne bloquée':'Priorité '+(++prio);
      const tag = done?'✓ '+rank+' · Atteint' : warn?'⚠ '+rank+' · À surveiller' : rank;
      const ringCol = done?'var(--green)':(c.bloque?'var(--acier)':'var(--orange)');
      const cleanNote=(c.note||'').replace(/⚠\s*/,'');
      return `<div class="cf ${c.bloque?'bloque':''} ${warn?'warn':''} ${done?'done':''}">
        <div class="cf-row1">
          <span class="cf-name">${c.nom}</span>
        </div>
        <span class="cf-tag">${tag}</span>
        <div class="cf-body" style="margin-top:16px">
          <div class="cf-ring" style="background:conic-gradient(${ringCol} ${pct.toFixed(1)}%, #E7E3DA ${pct.toFixed(1)}% 100%)"><div class="cf-ring-c"><b class="num">${pct.toFixed(0)}%</b></div></div>
          <div class="cf-stats">
            <div class="cf-line"><span>Épargné</span><b class="num">${fmt(c.epargne)} F</b></div>
            <div class="cf-line"><span>Objectif</span><b class="num">${fmt(obj)} F</b></div>
            ${reste>0?`<div class="cf-line"><span>Reste à épargner</span><b class="num">${fmt(reste)} F</b></div>`:''}
            <button class="cf-objbtn" data-cfedit="${c.nom}">Modifier l'objectif</button>
          </div>
        </div>
        ${editing?`<div class="cf-edit"><label><span class="lab">Nouvel objectif (F)</span><input type="number" min="0" step="1000" id="cfObjInput" value="${obj}"></label><button class="btn btn-dark btn-sm" data-cfsave="${c.nom}">OK</button><button class="btn btn-ghost btn-sm" data-cfcancel="1">Annuler</button></div>`:''}
        ${cleanNote&&!editing?`<div class="cf-note">${cleanNote}</div>`:''}
      </div>`;
    }).join('');

    const dettes=monthDettes();
    const seedUnpaid=dettes.filter((d,i)=>!dettePaid[i]);
    const userUnpaid=(userDettes||[]).filter(d=>!d.paid);
    const reste=seedUnpaid.reduce((s,d)=>s+d.montant,0)+userUnpaid.reduce((s,d)=>s+d.montant,0);
    const nbDettes=dettes.length+(userDettes||[]).length;
    const echeance=seedUnpaid.length?seedUnpaid[0].echeance:(userUnpaid.length?userUnpaid[0].echeance:'');
    document.getElementById('detteAlert').innerHTML = reste>0
      ? `<div class="det-alert todo"><span class="al-amt num">${fmt(reste)} F</span><span>à rembourser à vos coffres</span><span class="al-when">Échéance<b>${echeance}</b></span></div>`
      : `<div class="det-alert clear"><span>${nbDettes?'✓ Tout est remboursé — vos coffres sont au complet.':'Aucune dette ce mois-ci.'}</span></div>`;
    document.getElementById('detteList').innerHTML=dettes.map((d,i)=>{
      const paid=!!dettePaid[i];
      return `<div class="dette ${paid?'paid':''}"><div><div class="dn">${d.nom}</div><div class="dmeta">Retrait ${d.retrait} · échéance ${d.echeance}</div></div>
        <span class="dmt num">${fmt(d.montant)} F</span><span class="statut ${paid?'ok':'todo'}">${paid?'✓ Remboursé':'À rembourser'}</span>
        <button class="iconbtn" data-dette="${i}">${paid?'Annuler':'Marquer payé'}</button></div>`;
    }).join('') + (userDettes||[]).map(d=>{
      return `<div class="dette ${d.paid?'paid':''}"><div><div class="dn">${d.nom}<span class="grouptag">auto</span></div><div class="dmeta">Retrait ${d.retrait} · échéance ${d.echeance}</div></div>
        <span class="dmt num">${fmt(d.montant)} F</span><span class="statut ${d.paid?'ok':'todo'}">${d.paid?'✓ Remboursé':'À rembourser'}</span>
        <button class="iconbtn" data-udette="${d.id}">${d.paid?'Annuler':'Marquer payé'}</button></div>`;
    }).join('');
    document.querySelectorAll('[data-dette]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.dette; dettePaid[i]=!dettePaid[i]; persist(); renderCoffres(); toast(dettePaid[i]?'Dette marquée remboursée':'Statut réinitialisé'); });
    document.querySelectorAll('[data-udette]').forEach(b=>b.onclick=()=>{ const d=(userDettes||[]).find(x=>x.id===b.dataset.udette); if(d){ d.paid=!d.paid; persist(); renderCoffres(); toast(d.paid?'Dette marquée remboursée':'Statut réinitialisé'); } });
    document.getElementById('detteNote').textContent = M.seed? S.dettesNote : '';
    document.getElementById('detteNote').style.display = M.seed? '' : 'none';

    const cl=document.getElementById('coffreList');
    cl.querySelectorAll('[data-cfedit]').forEach(b=>b.onclick=()=>{ editingCoffre=b.dataset.cfedit; renderCoffres(); const inp=document.getElementById('cfObjInput'); if(inp){ inp.focus(); inp.select(); inp.onkeydown=e=>{ if(e.key==='Enter'){ const sb=cl.querySelector('[data-cfsave]'); if(sb) sb.click(); } else if(e.key==='Escape'){ editingCoffre=null; renderCoffres(); } }; } });
    cl.querySelectorAll('[data-cfsave]').forEach(b=>b.onclick=()=>{ const name=b.dataset.cfsave; const val=parseFloat(document.getElementById('cfObjInput').value); if(!val||val<=0){ toast('Objectif invalide'); return; } coffreOverrides[name]=Math.round(val); editingCoffre=null; persistCoffres(); renderCoffres(); renderDash(); toast('Objectif mis à jour'); });
    cl.querySelectorAll('[data-cfcancel]').forEach(b=>b.onclick=()=>{ editingCoffre=null; renderCoffres(); });
  }

  /* ============================================================ VENTILATION */
  function seedVentilations(){
    const v=S.ventilation;
    const lines=v.charges.map(c=>({poste:c.poste,type:'charge',montant:c.montant,fait:true,archived:true,note:c.note}));
    lines.push({poste:'Coussin anti-agios (intouchable)',type:'coussin',montant:10000,fait:false,archived:true,note:'Éviter le découvert'});
    lines.push({poste:'Coussin imprévus du mois',type:'coussin',montant:40000,fait:false,archived:true,note:'Petites dépenses'});
    const used=lines.reduce((s,l)=>s+l.montant,0); const rest=Math.max(0,v.dispoAVentiler-used);
    lines.push({poste:"Virement vers Fonds d'urgence (Djamo)",type:'coffre',montant:rest,fait:true,archived:true,note:"Le reste alimente l'épargne"});
    return [{ id:'seed-juin', label:'Salaire — juin', date:'01/06', montant:v.dispoAVentiler, note:'Reste à couvrir hors salaire : Fibre 20 000 + Micro-ondes 22 500 (après le cours du 13/06).', lines }];
  }
  function typeLabel(t){ return t==='charge'?'Charge':t==='coffre'?'Coffre':'Coussin'; }
  function mapChargeCat(poste){ const p=poste.toLowerCase();
    if(/loyer/.test(p))return 'Loyer'; if(/transport|car\b|yango|taxi|abonnement car/.test(p))return 'Transport';
    if(/eau|électr|elect|cie|sodeci|fibre|facture|poubelle|recharge/.test(p))return 'Factures';
    if(/copine/.test(p))return 'Copine'; if(/maman|famille|aide|sœur|soeur|don/.test(p))return 'Aide famille';
    if(/nourri|provision|march|course/.test(p))return 'Provisions'; if(/santé|sante|soin/.test(p))return 'Santé';
    if(/outil|web|perplex|google/.test(p))return 'Outils/Web'; return poste; }
  function matchCoffre(poste){ const p=poste.toLowerCase();
    const comptes=baseComptes();
    if(/scolar/.test(p))return comptes.find(c=>/scolar/i.test(c.nom))?.nom||'Coffre Scolarité (Djamo)';
    if(/sgci|classique/.test(p))return comptes.find(c=>/sgci|classique/i.test(c.nom))?.nom||'Épargne classique SGCI';
    if(/forcé|force|prêt|pret/.test(p))return comptes.find(c=>/forc/i.test(c.nom))?.nom||'Épargne forcée (prêt)';
    return comptes.find(c=>/urgence/i.test(c.nom))?.nom||"Coffre Fonds d'urgence (Djamo)"; }
  function bankAccount(){ const c=baseComptes().find(x=>/banque|sgbci/i.test(x.nom)); return c?c.nom:baseComptes()[0].nom; }
  function vDate(v){ return v.date || ('01/'+M.mm); }
  function makeLinkOp(v,line,linkId){
    if(line.type==='coussin') return null;
    if(line.type==='charge') return { date:vDate(v), lib:line.poste, type:'dépense', compte:bankAccount(), cat:mapChargeCat(line.poste), montant:-Math.abs(line.montant), note:'Ventilation : '+v.label, _vlink:linkId, _ts:Date.now(), _t:hhmm() };
    return { date:vDate(v), lib:line.poste, type:'virement', compte:bankAccount(), compteDest:matchCoffre(line.poste), cat:'', montant:Math.abs(line.montant), note:'Ventilation : '+v.label, _vlink:linkId, _ts:Date.now(), _t:hhmm() };
  }

  function renderVent(){
    const host=document.getElementById('ventList'); const ov=document.getElementById('ventOverview');
    if(!ventilations||!ventilations.length){ if(ov) ov.innerHTML=''; host.innerHTML='<div class="vempty">Aucune ventilation pour l’instant. À chaque revenu, cliquez sur « Nouvelle ventilation » pour le répartir avant de dépenser.</div>'; return; }
    const totMontant=ventilations.reduce((s,v)=>s+v.montant,0);
    const totReparti=ventilations.reduce((s,v)=>s+v.lines.reduce((a,l)=>a+l.montant,0),0);
    const totFait=ventilations.reduce((s,v)=>s+v.lines.filter(l=>l.fait).reduce((a,l)=>a+l.montant,0),0);
    if(ov) ov.innerHTML=`
      <div class="cfo-item"><span class="cfo-k">Revenus ventilés</span><span class="cfo-v num">${fmt(totMontant)}<span class="cur">F</span></span></div>
      <div class="cfo-item"><span class="cfo-k">Affecté</span><span class="cfo-v num">${fmt(totReparti)}<span class="cur">F</span></span></div>
      <div class="cfo-item"><span class="cfo-k">Exécuté (au journal)</span><span class="cfo-v num" style="color:#7CD9AE">${fmt(totFait)}<span class="cur">F</span></span></div>`;
    const COL={charge:'var(--acier)',coffre:'var(--blue)',coussin:'var(--orange)'};
    const TYPICON={charge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
      coffre:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="12" cy="12" r="3"></circle><path d="M12 9v0"></path></svg>',
      coussin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.4 5.7 21l2.3-7.2-6-4.6h7.6z"></path></svg>'};
    const CATICON={
      'Loyer':'<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
      'Transport':'<rect x="3" y="9" width="18" height="8" rx="2"></rect><circle cx="7.5" cy="18.5" r="1.5"></circle><circle cx="16.5" cy="18.5" r="1.5"></circle><path d="M5 9l1.5-4h11L19 9"></path>',
      'Factures':'<path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2-1 1z"></path><path d="M8 8h8M8 12h8M8 16h5"></path>',
      'Copine':'<path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5 6.5 5c2 0 3.5 1.2 5.5 3.5C14 6.2 15.5 5 17.5 5c4 0 5.5 4 4 7.5C19 16.65 12 21 12 21z"></path>',
      'Aide famille':'<circle cx="9" cy="7" r="3"></circle><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"></path><circle cx="18" cy="9" r="2.3"></circle><path d="M17 21v-.6a4 4 0 0 1 4-4h.2"></path>',
      'Provisions':'<path d="M6 8h12l-1.2 12H7.2z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path>',
      'Santé':'<path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5 6.5 5c2 0 3.5 1.2 5.5 3.5C14 6.2 15.5 5 17.5 5c4 0 5.5 4 4 7.5C19 16.65 12 21 12 21z"></path><path d="M12 9v5M9.5 11.5h5"></path>',
      'Outils/Web':'<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>',
      'Frais':'<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5h.01M14.5 14.5h.01M15 9l-6 6"></path>',
      'Divers':'<circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle>'
    };
    const catIcon=cat=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CATICON[cat]||CATICON['Divers']}</svg>`;
    const spentByCat=liveCategories().reduce((m,c)=>{ m[c.label]=c.value; return m; },{});
    const budgetByCat={};
    ventilations.forEach(v=>v.lines.forEach(l=>{ if(l.type==='charge'){ const c=mapChargeCat(l.poste); budgetByCat[c]=(budgetByCat[c]||0)+l.montant; } }));
    host.innerHTML=ventilations.map(v=>{
      const reparti=v.lines.reduce((s,l)=>s+l.montant,0); const restant=v.montant-reparti;
      const fait=v.lines.filter(l=>l.fait).reduce((s,l)=>s+l.montant,0);
      const pctRep=v.montant?Math.min(100,reparti/v.montant*100):0;
      const ringCol=restant<0?'var(--red)':restant===0?'var(--green)':'var(--orange)';
      const tsum=t=>v.lines.filter(l=>l.type===t).reduce((s,l)=>s+l.montant,0);
      const segData=[['charge','Charges'],['coffre','Coffres'],['coussin','Coussins']].map(([t,lbl])=>({t,lbl,sum:tsum(t)}));
      const segs=segData.map(d=>{ const w=v.montant?Math.min(100,d.sum/v.montant*100):0; return w>0?`<div class="seg-${d.t}" style="width:${w.toFixed(2)}%"></div>`:''; }).join('');
      const legend=segData.filter(d=>d.sum>0).map(d=>`<div class="alloc-leg"><span class="dot" style="background:${COL[d.t]}"></span>${d.lbl} <b class="num">${fmt(d.sum)} F</b><span class="lp">${(d.sum/(v.montant||1)*100).toFixed(0)}%</span></div>`).join('');
      const restCls=restant>0?'left':restant<0?'over':'ok';
      const restTxt=restant>0?`Restant à affecter : ${fmt(restant)} F`:restant<0?`Dépassement : ${fmt(-restant)} F`:'Entièrement réparti';
      const lines=v.lines.map((l,i)=>{
        const isCharge=l.type==='charge';
        const cat=isCharge?mapChargeCat(l.poste):null;
        const spent=isCharge?(spentByCat[cat]||0):0;
        const budget=isCharge?(budgetByCat[cat]||0):0;
        const pctB=isCharge&&budget?Math.min(999,spent/budget*100):0;
        let budgetStatus='', budgetCls='';
        if(isCharge){
          if(spent===0){ budgetStatus='Pas encore dépensé'; budgetCls='none'; }
          else if(spent<budget*0.9){ budgetStatus='En cours'; budgetCls='ok'; }
          else if(spent<=budget){ budgetStatus='Atteint'; budgetCls='at'; }
          else { budgetStatus='Dépassé de '+fmt(spent-budget)+' F'; budgetCls='over'; }
        }
        const icon = isCharge ? catIcon(cat) : TYPICON[l.type];
        return `<div class="vline"><span class="vl-ic ${l.type}">${icon}</span>
          <div class="vl-main"><div class="vlp">${l.poste}${isCharge?`<span class="vl-cat">${cat}</span>`:''}</div>${l.note?`<div class="vln">${l.note}</div>`:''}${l.archived?'<div class="vln">déjà au journal ('+M.monthName+')</div>':(l.linkId?'<div class="vln" style="color:var(--green)">✓ inscrit au journal</div>':'')}
            ${isCharge?`<div class="vl-budget"><div class="vlb-track"><div class="vlb-fill ${budgetCls}" style="width:${Math.min(100,pctB).toFixed(1)}%"></div></div><span class="vlb-txt ${budgetCls}">${fmt(spent)} F dépensé / ${fmt(budget)} F alloué (catégorie) · ${budgetStatus}</span></div>`:''}
          </div>
          <span class="vtype ${l.type}">${typeLabel(l.type)}</span><div class="vlm num">${fmt(l.montant)} F</div>
          <button class="vstatbtn ${l.fait?'fait':''}" data-vfait="${v.id}|${i}">${l.fait?'✓ Fait':'Prévu'}</button>
          <button class="iconbtn" data-vdel="${v.id}|${i}">Suppr.</button></div>`;
      }).join('');
      return `<div class="vcard">
        <div class="vc-head"><div class="vc-id"><div class="vc-label">${v.label}</div><div class="vc-date">${v.date||''}</div></div>
          <div class="vc-money"><div class="vm num">${fmt(v.montant)} F</div><div class="vmk">à ventiler</div></div>
          <div class="vc-acts"><button class="iconbtn" data-vedit="${v.id}">Modif.</button><button class="iconbtn" data-vdelcard="${v.id}">Suppr.</button></div></div>
        <div class="vc-top">
          <div class="vc-ring" style="background:conic-gradient(${ringCol} ${pctRep.toFixed(1)}%, #E7E3DA ${pctRep.toFixed(1)}% 100%)"><div class="vrc"><b class="num">${pctRep.toFixed(0)}%</b><span>réparti</span></div></div>
          <div class="vc-breakdown">
            <div class="alloc-bar">${segs||'<div style="width:100%"></div>'}</div>
            <div class="alloc-legend">${legend||'<span class="lp" style="font-family:var(--mono);font-size:11px;color:var(--muted)">Aucune affectation — ajoutez une ligne ci-dessous</span>'}</div>
            <div class="vc-status"><span>Réparti <b class="num">${fmt(reparti)} F</b> / ${fmt(v.montant)} F</span><span class="${restCls}">${restTxt}</span></div>
          </div></div>
        <div class="vlines">${lines}
          <div class="vline-add">
            <label><span class="lab">Poste à affecter</span><input type="text" data-vaddposte="${v.id}" placeholder="Ex. Loyer, Coffre urgence, Coussin…"></label>
            <label><span class="lab">Type</span><select data-vaddtype="${v.id}"><option value="charge">Charge</option><option value="coffre">Coffre</option><option value="coussin">Coussin</option></select></label>
            <label><span class="lab">Montant (F)</span><input type="number" data-vaddmontant="${v.id}" min="0" step="1" placeholder="0"></label>
            <button class="btn btn-ghost btn-sm" data-vadd="${v.id}">+ Affecter</button></div></div>
        ${v.note?`<div class="vnote-line">${v.note}</div>`:''}
        <div class="vcard-foot"><span>Déjà effectué : <b class="num">${fmt(fait)} F</b></span><span>Reste prévu (non exécuté) : <b class="num">${fmt(reparti-fait)} F</b></span></div>
      </div>`;
    }).join('');

    host.querySelectorAll('[data-vfait]').forEach(b=>b.onclick=()=>{
      const[id,i]=b.dataset.vfait.split('|'); const v=ventilations.find(x=>x.id===id); const line=v.lines[+i];
      if(line.archived){ line.fait=!line.fait; persistV(); renderVent(); return; }
      if(!line.fait){ line.fait=true; const op=makeLinkOp(v,line,'vl'+Date.now()); if(op){ line.linkId=op._vlink; newOps.push(op); persist(); toast(op.type==='dépense'?'Fait — dépense ajoutée au journal':'Fait — virement ajouté au journal'); } else toast('Coussin gardé liquide sur la banque'); }
      else { line.fait=false; if(line.linkId){ newOps=newOps.filter(o=>o._vlink!==line.linkId); line.linkId=null; persist(); toast('Annulé — opération retirée du journal'); } }
      persistV(); refreshAll(); renderVent();
    });
    host.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=()=>{ const[id,i]=b.dataset.vdel.split('|'); const v=ventilations.find(x=>x.id===id); const line=v.lines[+i]; if(line&&line.linkId){ newOps=newOps.filter(o=>o._vlink!==line.linkId); persist(); } v.lines.splice(+i,1); persistV(); refreshAll(); renderVent(); toast('Ligne retirée'); });
    host.querySelectorAll('[data-vadd]').forEach(b=>b.onclick=()=>{ const id=b.dataset.vadd; const v=ventilations.find(x=>x.id===id); const poste=host.querySelector(`[data-vaddposte="${id}"]`).value.trim(); const type=host.querySelector(`[data-vaddtype="${id}"]`).value; const m=parseFloat(host.querySelector(`[data-vaddmontant="${id}"]`).value); if(!poste||!m){ toast('Poste et montant requis'); return; } v.lines.push({poste,type,montant:Math.abs(m),fait:false}); persistV(); renderVent(); toast('Affectation ajoutée'); });
    host.querySelectorAll('[data-vedit]').forEach(b=>b.onclick=()=>openVentForm(b.dataset.vedit));
    host.querySelectorAll('[data-vdelcard]').forEach(b=>b.onclick=()=>{ if(!confirm('Supprimer cette ventilation ? Les opérations qu’elle a créées dans le journal seront aussi retirées.')) return; const v=ventilations.find(x=>x.id===b.dataset.vdelcard); const ids=(v?v.lines:[]).map(l=>l.linkId).filter(Boolean); if(ids.length){ newOps=newOps.filter(o=>!ids.includes(o._vlink)); persist(); } ventilations=ventilations.filter(x=>x.id!==b.dataset.vdelcard); persistV(); refreshAll(); renderVent(); toast('Ventilation supprimée'); });
  }
  function fillRevSelect(){
    const sel=document.getElementById('vfFromRev');
    const revs=allOps().filter(o=>o.type==='revenu').sort((a,b)=>parseDate(b.date)-parseDate(a.date));
    sel.innerHTML='<option value="">— Saisie manuelle —</option>'+revs.map((o,i)=>`<option value="${i}">${o.date} · ${o.lib} · ${fmt(Math.abs(o.montant))} F</option>`).join('');
    sel._revs=revs;
  }
  function openVentForm(id){
    document.getElementById('ventForm').classList.add('open'); ventEditId=id||null;
    const v=id?ventilations.find(x=>x.id===id):null;
    document.getElementById('vfLabel').value=v?v.label:'';
    document.getElementById('vfDate').value=v?v.date:defaultOpDate();
    document.getElementById('vfMontant').value=v?v.montant:'';
    document.getElementById('vfFromRev').value='';
    document.getElementById('ventFormTitle').textContent=id?'Modifier la ventilation':'Nouvelle ventilation';
    document.getElementById('vfLabel').focus();
  }
  function closeVentForm(){ document.getElementById('ventForm').classList.remove('open'); ventEditId=null; }
  function saveVentForm(){
    const label=document.getElementById('vfLabel').value.trim();
    const date=document.getElementById('vfDate').value.trim();
    const montant=parseFloat(document.getElementById('vfMontant').value);
    if(!label||!montant){ toast('Libellé et montant requis'); return; }
    if(ventEditId){ const v=ventilations.find(x=>x.id===ventEditId); v.label=label; v.date=date; v.montant=Math.abs(montant); }
    else ventilations.unshift({ id:'v'+Date.now(), label, date, montant:Math.abs(montant), note:'', lines:[] });
    persistV(); closeVentForm(); renderVent(); toast(ventEditId?'Ventilation modifiée':'Ventilation créée');
  }

  /* ============================================================ HISTORIQUE */
  function monthOps(meta){
    const b=loadBucket(meta.id);
    const rawArch=meta.seed?S.operations:(meta.archive||[]);
    const ov=b.opOverrides||{}, del=b.opDeletes||[];
    const arch=rawArch.map((o,i)=>{ if(del.includes(i)) return null; return ov[i]?{...ov[i]}:o; }).filter(Boolean);
    return arch.concat(b.newOps||[]);
  }
  function monthTotals(meta){
    const ops=monthOps(meta);
    const depense=ops.filter(o=>o.type==='dépense').reduce((s,o)=>s+Math.abs(o.montant),0);
    const revenu=ops.filter(o=>o.type==='revenu'||o.type==='dividende').reduce((s,o)=>s+Math.abs(o.montant),0);
    return { depense, revenu, net:revenu-depense, count:ops.length };
  }
  function monthCategories(meta){
    const ops=monthOps(meta); const m={};
    ops.filter(o=>o.type==='d\u00e9pense').forEach(o=>{ const l=o.cat||'Divers'; m[l]=(m[l]||0)+Math.abs(o.montant); });
    return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  }
  function monthRevCategories(meta){
    const ops=monthOps(meta); const m={};
    ops.filter(o=>o.type==='revenu').forEach(o=>{ const l=o.cat||o.lib||'Divers'; m[l]=(m[l]||0)+Math.abs(o.montant); });
    return Object.entries(m).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  }

  /* ============================================================ SUIVI MENSUEL (pilotage) */
  function renderPilot(){
    const body=document.getElementById('pilotBody'); if(!body) return;
    const ms=cycles.months.slice().sort((a,b)=>a.id<b.id?-1:1);
    const rows=ms.map(meta=>({meta, ...monthTotals(meta)}));
    const totRev=rows.reduce((s,r)=>s+r.revenu,0), totDep=rows.reduce((s,r)=>s+r.depense,0), totNet=totRev-totDep;
    const pOv=document.getElementById('pilotOverview'); if(pOv) pOv.innerHTML=`
      <div class="minik"><div class="k">Revenus cumul\u00e9s</div><div class="v num" style="color:var(--green)">${fmt(totRev)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
      <div class="minik"><div class="k">D\u00e9penses cumul\u00e9es</div><div class="v num" style="color:var(--red)">${fmt(totDep)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
      <div class="minik"><div class="k">\u00c9pargne cumul\u00e9e</div><div class="v num" style="color:${totNet>=0?'var(--green)':'var(--red)'}">${totNet>=0?'+':'\u2212'}${fmt(Math.abs(totNet))}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>`;

    body.innerHTML=rows.map(r=>{
      const tx = r.revenu>0? (r.net/r.revenu*100) : 0;
      const txCls = tx>=20?'var(--green)':(tx>=0?'var(--hivis)':'var(--red)');
      return `<tr class="pilot-row" data-pm="${r.meta.id}">
        <td><span class="pm-name">${r.meta.label}</span>${r.meta.id===M.id?'<span class="pm-cur">actif</span>':''}</td>
        <td class="vamt num p-rev">+${fmt(r.revenu)}</td>
        <td class="vamt num p-dep">\u2212${fmt(r.depense)}</td>
        <td class="vamt num p-net" style="color:${r.net>=0?'var(--green)':'var(--red)'}">${r.net>=0?'+':'\u2212'}${fmt(Math.abs(r.net))}</td>
        <td class="vamt p-tx" style="color:${txCls}">${tx.toFixed(0)}%</td>
        <td class="p-chev"><button class="cf-link p-goto" data-goto="${r.meta.id}" title="Voir le journal de ce mois">Journal</button></td>
      </tr>
      <tr class="pilot-detail" data-pd="${r.meta.id}" style="display:none"><td colspan="6">
        <div class="pilot-detail-inner">
          <div class="pilot-cols">
            <div class="pilot-col">
              <div class="pilot-col-t">Revenus \u2014 ${fmt(r.revenu)} F</div>
              ${renderPilotCats(monthRevCategories(r.meta),'rev')}
            </div>
            <div class="pilot-col">
              <div class="pilot-col-t">D\u00e9penses \u2014 ${fmt(r.depense)} F, par poste</div>
              ${renderPilotCats(monthCategories(r.meta),'dep')}
            </div>
          </div>
        </div>
      </td></tr>`;
    }).join('');

    body.querySelectorAll('.pilot-row').forEach(tr=>tr.onclick=()=>{
      const id=tr.dataset.pm;
      const detail=body.querySelector(`.pilot-detail[data-pd="${id}"]`);
      const willOpen = detail.style.display==='none';
      body.querySelectorAll('.pilot-detail').forEach(d=>d.style.display='none');
      body.querySelectorAll('.pilot-row').forEach(x=>x.classList.remove('open'));
      if(willOpen){ detail.style.display=''; tr.classList.add('open'); }
    });
    body.querySelectorAll('.p-goto').forEach(b=>b.onclick=(e)=>{
      e.stopPropagation();
      const id=b.dataset.goto;
      if(id!==M.id) switchMonth(id);
      document.querySelector('[data-tab=ops]')?.click();
    });
  }
  function renderPilotCats(cats, kind){
    if(!cats.length) return `<div class="pilot-empty">Aucun${kind==='rev'?' revenu':'e d\u00e9pense'} ce mois-ci.</div>`;
    const max=cats[0].value;
    const fillCls = kind==='rev'?'pc-fill rev':'pc-fill';
    return cats.map(c=>`<div class="pilot-cat"><span class="pc-l" title="${c.label}">${c.label}</span>
      <div class="pc-track"><div class="${fillCls}" style="width:${(c.value/max*100).toFixed(1)}%"></div></div>
      <span class="pc-v num">${fmt(c.value)} F</span></div>`).join('');
  }
  function setHistView(v){ histView=v; document.querySelectorAll('#histSwitch .htab').forEach(b=>b.classList.toggle('active',b.dataset.h===v)); renderHist(); }
  function updateHistTabMeta(){
    const yrs=new Set(cycles.months.map(m=>m.year)).size;
    const j=document.getElementById('htsJour'), mo=document.getElementById('htsMois'), an=document.getElementById('htsAnnee');
    if(j) j.textContent=M.label;
    if(mo) mo.textContent=cycles.months.length+' cycle'+(cycles.months.length>1?'s':'');
    if(an) an.textContent=yrs+' année'+(yrs>1?'s':'');
  }
  function renderHist(){
    const box=document.getElementById('histBody'); if(!box) return;
    updateHistTabMeta();
    if(histView==='jour') return renderHistJour(box);
    if(histView==='mois') return renderHistMois(box);
    return renderHistAnnee(box);
  }
  function renderHistJour(box){
    const ops=allOps(); const byDay={};
    ops.forEach(o=>{ const dn=parseInt(o.date,10); if(!dn) return; if(!byDay[dn]) byDay[dn]={dep:0,rev:0,n:0}; const a=Math.abs(o.montant); if(o.type==='dépense')byDay[dn].dep+=a; else if(o.type==='revenu')byDay[dn].rev+=a; byDay[dn].n++; });
    const activeDays=Object.keys(byDay).map(Number).sort((a,b)=>a-b);
    const totDep=activeDays.reduce((s,d)=>s+byDay[d].dep,0), totRev=activeDays.reduce((s,d)=>s+byDay[d].rev,0);
    const maxDep=Math.max(1,...activeDays.map(d=>byDay[d].dep));
    const daysInMonth=new Date(M.year, parseInt(M.mm,10), 0).getDate();
    const firstDow=(new Date(M.year, parseInt(M.mm,10)-1, 1).getDay()+6)%7; // 0=lundi
    // heatmap
    const dow=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const dowRow=dow.map((d,i)=>`<span class="${i>=5?'we':''}">${d}</span>`).join('');
    let cells='';
    for(let p=0;p<firstDow;p++) cells+=`<div class="heatcell pad"></div>`;
    for(let d=1; d<=daysInMonth; d++){
      const m=byDay[d];
      if(!m || (!m.dep && !m.rev)){ cells+=`<div class="heatcell empty"><span class="hcd">${d}</span></div>`; continue; }
      const alpha=m.dep? (0.16+0.8*(m.dep/maxDep)) : 0.06;
      const light=alpha>0.55;
      cells+=`<div class="heatcell has" style="background:rgba(226,84,26,${alpha.toFixed(3)});color:${light?'#fff':'var(--ink)'}" title="${d}/${M.mm} — ${fmt(m.dep)} F dépensés${m.rev?(' · +'+fmt(m.rev)+' F'):''}">
        ${m.rev?'<span class="rev-dot"></span>':''}
        <span class="hcd">${d}</span>
        <span class="hca">${m.dep?('−'+fmt(m.dep)):''}</span></div>`;
    }
    box.innerHTML=`<div class="minikpis" style="margin-bottom:18px">
        <div class="minik"><div class="k">Jours d'activité — ${M.label}</div><div class="v num">${activeDays.length}</div></div>
        <div class="minik"><div class="k">Dépenses du mois</div><div class="v num" style="color:var(--red)">${fmt(totDep)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
        <div class="minik"><div class="k">Revenus du mois</div><div class="v num" style="color:var(--green)">${fmt(totRev)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div></div>
      <div class="heatcard">
        <div class="hc-t">Intensité des dépenses · ${M.monthName} ${M.year}</div>
        <div class="heatdow">${dowRow}</div>
        <div class="heatgrid">${cells}</div>
        <div class="heatlegend"><span>Moins</span><span class="scale"><i style="background:rgba(226,84,26,.10)"></i><i style="background:rgba(226,84,26,.32)"></i><i style="background:rgba(226,84,26,.55)"></i><i style="background:rgba(226,84,26,.80)"></i><i style="background:rgba(226,84,26,.98)"></i></span><span>Plus</span><span class="rev-leg"><b></b> Jour avec revenu</span></div>
      </div>`
      + (activeDays.length? `<div class="histlist"><div class="hl-head"><span>Jour</span><span>Dépenses</span><span class="r">Détail</span></div>`+activeDays.map(d=>{
          const m=byDay[d];
          return `<div class="hist-day"><div class="hd-date"><b>${d}</b> ${M.monthName}</div>
            <div class="hd-bar"><div class="hd-fill" style="width:${(m.dep/maxDep*100).toFixed(1)}%"></div></div>
            <div class="hd-vals"><span class="num" style="color:var(--red)">−${fmt(m.dep)}</span>${m.rev?`<span class="num" style="color:var(--green)">+${fmt(m.rev)}</span>`:''}<span class="hd-n">${m.n} op.</span></div></div>`;
        }).join('')+`</div>` : `<div class="vempty">Aucune opération ce mois-ci.</div>`);
  }
  function buildCumChart(rows){
    const W=1000,H=240,padL=46,padR=18,padT=18,padB=30, base=H-padB;
    let cumR=0,cumD=0;
    const pts=rows.map(r=>{ cumR+=r.revenu; cumD+=r.depense; return {label:r.meta.monthName, cumR, cumD}; });
    const n=pts.length, maxY=Math.max(1,cumR,cumD);
    const X=i=> n===1? (padL+(W-padL-padR)/2) : padL+i*(W-padL-padR)/(n-1);
    const Y=v=> base - v/maxY*(H-padT-padB);
    const lineR=pts.map((p,i)=>`${X(i).toFixed(1)},${Y(p.cumR).toFixed(1)}`).join(' ');
    const lineD=pts.map((p,i)=>`${X(i).toFixed(1)},${Y(p.cumD).toFixed(1)}`).join(' ');
    const areaR=`M ${X(0).toFixed(1)},${base} L ${lineR} L ${X(n-1).toFixed(1)},${base} Z`;
    const areaD=`M ${X(0).toFixed(1)},${base} L ${lineD} L ${X(n-1).toFixed(1)},${base} Z`;
    const grid=[0,.5,1].map(f=>{ const y=(base-f*(H-padT-padB)).toFixed(1); return `<line class="grid" x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}"></line>`; }).join('');
    const dotsR=pts.map((p,i)=>`<circle class="dotR" cx="${X(i).toFixed(1)}" cy="${Y(p.cumR).toFixed(1)}" r="4.5"></circle>`).join('');
    const dotsD=pts.map((p,i)=>`<circle class="dotD" cx="${X(i).toFixed(1)}" cy="${Y(p.cumD).toFixed(1)}" r="4.5"></circle>`).join('');
    const xlbls=pts.map((p,i)=>`<text class="xlbl" x="${X(i).toFixed(1)}" y="${H-9}" text-anchor="middle">${cap(p.label).slice(0,4)}</text>`).join('');
    return `<div class="cumcard"><div class="cc-head"><div class="cc-t">Cumul revenus vs dépenses</div>
        <div class="cc-leg"><span><i style="background:var(--green)"></i>Revenus cumulés</span><span><i style="background:var(--red)"></i>Dépenses cumulées</span></div></div>
      <svg class="cumchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
        ${grid}
        <line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${base}"></line>
        <line class="axis" x1="${padL}" y1="${base}" x2="${W-padR}" y2="${base}"></line>
        <text class="ymax" x="${padL-6}" y="${padT+4}" text-anchor="end">${fmt(maxY)}</text>
        <path class="areaR" d="${areaR}"></path><path class="areaD" d="${areaD}"></path>
        ${n>1?`<polyline class="lineR" points="${lineR}"></polyline><polyline class="lineD" points="${lineD}"></polyline>`:''}
        ${dotsD}${dotsR}${xlbls}
      </svg></div>`;
  }
  function renderHistMois(box){
    const ms=cycles.months.slice().sort((a,b)=>a.id<b.id?-1:1);
    const rows=ms.map(meta=>({meta, ...monthTotals(meta)}));
    const maxV=Math.max(1,...rows.map(r=>Math.max(r.depense,r.revenu)));
    const totDep=rows.reduce((s,r)=>s+r.depense,0), totRev=rows.reduce((s,r)=>s+r.revenu,0);
    box.innerHTML=`<div class="minikpis" style="margin-bottom:18px">
        <div class="minik"><div class="k">Mois suivis</div><div class="v num">${rows.length}</div></div>
        <div class="minik"><div class="k">Dépenses cumulées</div><div class="v num" style="color:var(--red)">${fmt(totDep)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div>
        <div class="minik"><div class="k">Revenus cumulés</div><div class="v num" style="color:var(--green)">${fmt(totRev)}<span style="font-size:12px;color:var(--muted)"> F</span></div></div></div>`
      + buildCumChart(rows)
      + `<div class="histmonths">`+rows.map(r=>{
          const active=r.meta.id===M.id;
          return `<div class="hist-month ${active?'on':''}" data-goto="${r.meta.id}">
            <div class="hm-top"><span class="hm-name">${r.meta.label}${active?' <span class="hm-cur">en cours</span>':''}</span><span class="hm-net num" style="color:${r.net>=0?'var(--green)':'var(--red)'}">${r.net>=0?'+':'−'}${fmt(Math.abs(r.net))} F</span></div>
            <div class="hm-bars">
              <div class="hm-bar"><span class="hm-lab">Revenus</span><div class="hm-track"><div class="hm-fill rev" style="width:${(r.revenu/maxV*100).toFixed(1)}%"></div></div><span class="hm-val num">${fmt(r.revenu)}</span></div>
              <div class="hm-bar"><span class="hm-lab">Dépenses</span><div class="hm-track"><div class="hm-fill dep" style="width:${(r.depense/maxV*100).toFixed(1)}%"></div></div><span class="hm-val num">${fmt(r.depense)}</span></div>
            </div></div>`;
        }).join('')+`</div>`;
    box.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>switchMonth(b.dataset.goto));
  }
  function renderHistAnnee(box){
    const byY={};
    cycles.months.forEach(meta=>{ const t=monthTotals(meta); if(!byY[meta.year]) byY[meta.year]={dep:0,rev:0,n:0}; byY[meta.year].dep+=t.depense; byY[meta.year].rev+=t.revenu; byY[meta.year].n++; });
    const years=Object.keys(byY).sort();
    const maxV=Math.max(1,...years.map(y=>Math.max(byY[y].dep,byY[y].rev)));
    box.innerHTML=`<div class="histmonths">`+years.map(y=>{
      const a=byY[y]; const net=a.rev-a.dep;
      return `<div class="hist-month"><div class="hm-top"><span class="hm-name">${y} <span class="hm-cur" style="background:var(--fill);color:var(--muted)">${a.n} mois</span></span><span class="hm-net num" style="color:${net>=0?'var(--green)':'var(--red)'}">${net>=0?'+':'−'}${fmt(Math.abs(net))} F</span></div>
        <div class="hm-bars">
          <div class="hm-bar"><span class="hm-lab">Revenus</span><div class="hm-track"><div class="hm-fill rev" style="width:${(a.rev/maxV*100).toFixed(1)}%"></div></div><span class="hm-val num">${fmt(a.rev)}</span></div>
          <div class="hm-bar"><span class="hm-lab">Dépenses</span><div class="hm-track"><div class="hm-fill dep" style="width:${(a.dep/maxV*100).toFixed(1)}%"></div></div><span class="hm-val num">${fmt(a.dep)}</span></div>
        </div></div>`;
    }).join('')+`</div>`;
  }

  /* ============================================================ CYCLES UI */
  function buildMonthSelect(){
    const sel=document.getElementById('monthSelect'); if(!sel) return;
    const ms=cycles.months.slice().sort((a,b)=>a.id<b.id?-1:1);
    sel.innerHTML=ms.map(m=>`<option value="${m.id}" ${m.id===M.id?'selected':''}>${m.label}${m.seed?' · origine':''}</option>`).join('');
  }
  function switchMonth(id){
    setActive(id); editingCoffre=null; filterText=''; filterCat=''; filterType='all'; opPage=0;
    const sb=document.getElementById('opSearch'); if(sb) sb.value='';
    document.querySelectorAll('#typeChips .typechip').forEach(x=>x.classList.toggle('active',x.dataset.type==='all'));
    fillCompteSelects(); refreshAll(); renderVent(); renderHist(); buildMonthSelect();
    document.querySelector('[data-tab=dash]')?.click();
    toast('Cycle : '+M.label);
  }
  function newCycle(){
    const closing=liveComptes();
    const coffresClose=liveCoffres().map(c=>({nom:c.nom,epargne:Math.round(c.epargne),objectif:c.objectif,bloque:c.bloque,note:''}));
    let y=M.year, mi=parseInt(M.mm,10); mi++; if(mi>12){mi=1;y++;}
    const mm=String(mi).padStart(2,'0'); const id=y+'-'+mm;
    if(cycles.months.find(m=>m.id===id)){ if(!confirm('Le cycle '+cap(MONTHS[mi-1])+' '+y+' existe déjà. Y aller ?')) return; switchMonth(id); return; }
    if(!confirm('Clôturer '+M.label+' et démarrer le cycle '+cap(MONTHS[mi-1])+' '+y+' ?\n\nLes soldes de comptes et coffres sont reportés comme point de départ. '+M.label+' reste consultable dans l’historique.')) return;
    const meta={ id, label:cap(MONTHS[mi-1])+' '+y, mm, year:y, monthName:MONTHS[mi-1], seed:false,
      opening:{ comptes: closing.map(c=>({nom:c.nom,solde:Math.round(c.solde),type:c.type,note:c.note||''})), coffres: coffresClose } };
    cycles.months.push(meta); saveCycles();
    try{ localStorage.setItem(bucketKey(id), JSON.stringify({newOps:[],dettePaid:{},ventilations:[],coffreOverrides:{...coffreOverrides}})); }catch(e){}
    switchMonth(id); toast('Nouveau cycle : '+meta.label);
  }
  function deleteCurrentCycle(){
    if(M.seed){ toast('Le cycle d’origine ne peut pas être supprimé'); return; }
    if(!confirm('Supprimer le cycle '+M.label+' et toutes ses opérations ? (Irréversible)')) return;
    const delId=M.id; cycles.months=cycles.months.filter(m=>m.id!==delId);
    try{ localStorage.removeItem(bucketKey(delId)); }catch(e){}
    saveCycles(); switchMonth(cycles.months[cycles.months.length-1].id);
  }

  /* ============================================================ misc */
  let toastT;
  function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1800); }
  function refreshAll(){ renderDash(); fillCatFilter(); renderOps(); renderCoffres(); fillRevSelect(); renderHist(); }
  function switchTab(name){
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active', x.dataset.tab===name));
    document.querySelectorAll('.bn-item').forEach(x=>x.classList.toggle('active', x.dataset.tab===name));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    const p=document.getElementById('panel-'+name); if(p) p.classList.add('active');
    if(name==='hist') renderHist();
    if(name==='pilot') renderPilot();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function initTabs(){
    document.querySelectorAll('.tab, .bn-item').forEach(tb=>tb.onclick=()=>switchTab(tb.dataset.tab));
  }
  function initQuickAdd(){
    const backdrop=document.getElementById('sheetBackdrop');
    const qa=document.getElementById('quickAddBtn');
    if(qa) qa.onclick=()=>{ switchTab('ops'); openForm(null); };
    if(backdrop) backdrop.onclick=()=>{ closeForm(); closeXForm(); closeVentForm(); };
    const obs=new MutationObserver(()=>{
      const anyOpen = document.getElementById('opForm')?.classList.contains('open')
        || document.getElementById('xForm')?.classList.contains('open')
        || document.getElementById('ventForm')?.classList.contains('open');
      document.body.classList.toggle('sheet-open', !!anyOpen);
    });
    ['opForm','xForm','ventForm'].forEach(id=>{ const el=document.getElementById(id); if(el) obs.observe(el,{attributes:true,attributeFilter:['class']}); });
  }
  function init(){
    setActive(cycles.activeId);
    initTabs(); initQuickAdd(); fillCompteSelects(); buildMonthSelect();
    renderDash(); renderOps(); renderCoffres(); renderVent(); fillRevSelect(); renderHist();
    document.getElementById('addBtn').onclick=()=>openForm(null);
    document.getElementById('xAddBtn').onclick=()=>openXForm('pay');
    document.getElementById('xDonBtn').onclick=()=>openXForm('don');
    document.getElementById('xSave').onclick=saveXForm;
    document.getElementById('xCancel').onclick=closeXForm;
    document.querySelectorAll('#xModeSeg .xmode').forEach(b=>b.onclick=()=>setXMode(b.dataset.m));
    document.getElementById('xDette').onchange=e=>{ document.getElementById('xEchWrap').style.display=e.target.checked?'flex':'none'; renderXPreview(); };
    ['xLib','xCat','xCout','xFrom','xTendu','xRecu','xFrais','xFraisSur','xEcheance'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.oninput=renderXPreview; el.onchange=renderXPreview; } });
    const pgSizeBtm=document.getElementById('opPageSizeBottom'); if(pgSizeBtm) pgSizeBtm.onchange=e=>{ opPageSize=parseInt(e.target.value,10); opPage=0; renderOps(); };
    document.getElementById('fCancel').onclick=closeForm;
    document.getElementById('fSave').onclick=saveForm;
    document.getElementById('fType').onchange=syncType;
    document.querySelectorAll('#fTypeSeg .typeopt').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#fTypeSeg .typeopt').forEach(x=>x.classList.remove('active')); b.classList.add('active'); document.getElementById('fType').value=b.dataset.t; syncType(); });
    document.getElementById('ventAddBtn').onclick=()=>openVentForm(null);
    document.getElementById('vfCancel').onclick=closeVentForm;
    document.getElementById('vfSave').onclick=saveVentForm;
    document.getElementById('vfFromRev').onchange=e=>{ const revs=e.target._revs||[]; const o=revs[+e.target.value]; if(o){ document.getElementById('vfLabel').value=o.lib; document.getElementById('vfDate').value=o.date; document.getElementById('vfMontant').value=Math.abs(o.montant); } };
    document.getElementById('opSearch').oninput=e=>{ filterText=e.target.value; opPage=0; renderOps(); };
    document.getElementById('catFilter').onchange=e=>{ filterCat=e.target.value; opPage=0; renderOps(); };
    document.querySelectorAll('#typeChips .typechip').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#typeChips .typechip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); filterType=b.dataset.type; opPage=0; renderOps(); });
    document.querySelectorAll('#histSwitch .htab').forEach(b=>b.onclick=()=>setHistView(b.dataset.h));
    document.getElementById('monthSelect').onchange=e=>switchMonth(e.target.value);
    document.getElementById('newMonthBtn').onclick=newCycle;
    // API réutilisable pour les opérations sur titres (BRVM & autres placements).
    // Ex. : CaurisBRVM.achat({date:'JJ/MM', source:'Wave', code:'BOABF', nom:'BOA BF', quantite:3, prixUnitaire:5970, coursActuel:6050, frais:1154})
    window.CaurisBRVM = { achat:recordAchatTitre, dividende:recordDividende, vente:recordVenteTitre, ensure:ensurePlacement };
  }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded',init);
})();
