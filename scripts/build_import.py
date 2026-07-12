"""Construit, depuis le fichier Excel corrigé, les données de l'app :
   - le seed Juin 2026 (comptes/coffres/opérations/etc.)
   - le cycle Juillet 2026 (opening = clôture juin, newOps = 132 ops de juillet)
Écrit build/seed.json et build/state.json + diagnostics. N'écrit PAS en base."""
import sys, json, os
sys.path.insert(0, "scripts")
from xlsx_read import read_sheet
from datetime import datetime, timedelta

F = "Cauris_Suivi_juin_2026_corrige (4).xlsx"
os.makedirs("build", exist_ok=True)


def dser(s):
    return datetime(1899, 12, 30) + timedelta(days=int(s)) if isinstance(s, (int, float)) else None


def ddmm(s):
    d = dser(s)
    return d.strftime("%d/%m")


def num(x):
    if isinstance(x, float) and x.is_integer():
        return int(x)
    return x


TYPE_MAP = {"Disponible": "disponible", "Coffre": "épargne", "Bloquée": "bloqué"}


# ---------- Comptes (soldes ACTUELS = au 11/07) ----------
comptes_rows = read_sheet(F, "Comptes")
accounts = []  # {nom, solde_actuel, type}
for r in comptes_rows[2:]:
    if len(r) < 7:
        continue
    nom, s1607, mvt, sactuel, part, typ = r[1], r[2], r[3], r[4], r[5], r[6]
    if not nom or not isinstance(nom, str):
        continue
    if nom.strip().startswith("Sous-total") or nom.strip().startswith("PATRIMOINE"):
        continue
    if typ not in TYPE_MAP:
        continue
    accounts.append({"nom": nom.strip(), "solde_actuel": num(sactuel or 0), "type": TYPE_MAP[typ]})

acc_names = {a["nom"] for a in accounts}


# ---------- Opérations ----------
def read_ops(sheet, hdr):
    ops = []
    for r in read_sheet(F, sheet)[hdr + 1:]:
        if len(r) < 7:
            continue
        date, lib, typ, cpt, cat, mont = r[1], r[2], r[3], r[4], r[5], (r[6] if len(r) > 6 else None)
        note = r[7] if len(r) > 7 else None
        if not isinstance(date, (int, float)) or lib is None or mont is None:
            continue
        op = {
            "date": ddmm(date),
            "lib": str(lib),
            "type": str(typ),
            "compte": str(cpt) if cpt is not None else "",
            "cat": str(cat) if cat is not None else "",
            "montant": num(mont),
        }
        if note is not None and str(note).strip():
            op["note"] = str(note)
        ops.append(op)
    return ops


june_ops = read_ops("Journal juin (archive)", 1)
july_ops = read_ops("Journal", 2)

# La feuille "Comptes" (Solde actuel = Solde 16/06 + Mouvements, cache figé)
# correspond aux soldes de FIN JUIN (30/06) — confirmé : Banque=782 = seed d'origine.
# Le journal de juillet n'y est PAS reflété. Donc :
#   solde fin juin = Solde actuel   (base du seed juin ET ouverture de juillet)
for a in accounts:
    a["solde_fin_juin"] = a["solde_actuel"]

# ---------- Mouvements de juillet par compte (pour diagnostic live) ----------
july_mvt = {}
unmatched = {}
for o in july_ops:
    c = o["compte"]
    july_mvt[c] = july_mvt.get(c, 0) + o["montant"]
    if c not in acc_names:
        unmatched[c] = unmatched.get(c, 0) + o["montant"]


# ---------- Reconstruction des virements (2 lignes -> 1 virement [+ frais]) ----------
# Le journal logue chaque transfert en 2 lignes adjacentes (source négative,
# destination positive). Quand la source perd plus que la destination ne reçoit,
# la différence est un frais de transfert (modèle "opération croisée" de l'app) :
#   virement(source -> dest, montant = reçu)  +  frais dépense(source, écart)
def pair_virements(ops):
    out, i, unpaired = [], 0, 0
    while i < len(ops):
        o = ops[i]
        nxt = ops[i + 1] if i + 1 < len(ops) else None
        if o["type"] == "virement" and nxt and nxt["type"] == "virement" \
           and (o["montant"] < 0) != (nxt["montant"] < 0):
            src, dst = (o, nxt) if o["montant"] < 0 else (nxt, o)
            X, Y = abs(src["montant"]), abs(dst["montant"])  # perdu / reçu
            recu = min(X, Y)
            v = {"date": src["date"], "lib": src["lib"], "type": "virement",
                 "compte": src["compte"], "compteDest": dst["compte"], "cat": "",
                 "montant": num(recu)}
            if src.get("note") or dst.get("note"):
                v["note"] = src.get("note") or dst.get("note")
            out.append(v)
            if X - Y > 0:  # frais de transfert prélevé sur la source
                out.append({"date": src["date"], "lib": "Frais — " + src["lib"], "type": "dépense",
                            "compte": src["compte"], "cat": "Frais de transfert",
                            "montant": num(-(X - Y)), "note": "frais de transfert"})
            i += 2
            continue
        if o["type"] == "virement":  # leg orphelin -> transfert externe (dépense/revenu)
            unpaired += 1
            oo = dict(o)
            oo["type"] = "dépense" if o["montant"] < 0 else "revenu"
            oo["cat"] = o.get("cat") or "Transfert"
            out.append(oo)
            i += 1
            continue
        out.append(o)
        i += 1
    return out, unpaired


def simulate_live(opening, newops):
    """Reproduit liveComptes() de app.js : soldes après application des newOps."""
    bal = {a["nom"]: a["solde_fin_juin"] for a in opening}
    for o in newops:
        a = abs(o["montant"])
        if o["type"] == "dépense":
            if o["compte"] in bal:
                bal[o["compte"]] -= a
        elif o["type"] == "revenu":
            if o["compte"] in bal:
                bal[o["compte"]] += a
        elif o["type"] == "virement":
            if o["compte"] in bal:
                bal[o["compte"]] -= a
            if o.get("compteDest") in bal:
                bal[o["compteDest"]] += a
    return {k: num(round(v, 2)) for k, v in bal.items()}


# ---------- Coffres ----------
coffres_rows = read_sheet(F, "Coffres")
coffre_goals = {}
for r in coffres_rows[2:]:
    if len(r) < 4 or not isinstance(r[1], str):
        continue
    nm = r[1].strip()
    if r[3] is None:
        continue
    coffre_goals[nm] = {"epargne": num(r[2] or 0), "objectif": num(r[3] or 0)}


def acct_solde(pred, when="fin_juin"):
    for a in accounts:
        if pred(a["nom"].lower()):
            return a["solde_" + when]
    return 0


# 4 coffres : 2 objectifs réels + 2 épargnes bloquées (comme le design d'origine)
def build_coffres(when):
    fu = acct_solde(lambda n: "urgence" in n, when)
    sc = acct_solde(lambda n: "scolar" in n, when)
    sgci = acct_solde(lambda n: "sgci" in n or "classique" in n, when)
    forcee = acct_solde(lambda n: "forc" in n, when)
    return [
        {"nom": "Fonds d'urgence", "objectif": coffre_goals.get("Fonds d'urgence", {}).get("objectif", 940000),
         "epargne": fu, "bloque": False,
         "note": "Objectif = 6 mois de salaire. Priorité absolue avant tout autre projet. Bloque-le dans un coffre à terme pour le rendre intouchable."},
        {"nom": "Scolarité", "objectif": coffre_goals.get("Scolarité", {}).get("objectif", 50000),
         "epargne": sc, "bloque": False, "note": "À provisionner — priorité après le fonds d'urgence."},
        {"nom": "Épargne classique SGCI", "objectif": sgci or 25000, "epargne": sgci, "bloque": True, "note": "Bloqué"},
        {"nom": "Épargne forcée (prêt)", "objectif": forcee or 660189, "epargne": forcee, "bloque": True,
         "note": "Bloqué, récupérable en fin de prêt"},
    ]


# ---------- KPIs & agrégats pour un jeu d'opérations + soldes ----------
def agg(ops, accts, when):
    dispo = sum(a["solde_" + when] for a in accts if a["type"] == "disponible")
    coffres = sum(a["solde_" + when] for a in accts if a["type"] == "épargne")
    bloque = sum(a["solde_" + when] for a in accts if a["type"] == "bloqué")
    dep = sum(abs(o["montant"]) for o in ops if o["type"] == "dépense")
    rev = sum(abs(o["montant"]) for o in ops if o["type"] == "revenu")
    net = rev - dep
    cats = {}
    for o in ops:
        if o["type"] == "dépense":
            cats[o["cat"] or "Divers"] = cats.get(o["cat"] or "Divers", 0) + abs(o["montant"])
    revcats = {}
    for o in ops:
        if o["type"] == "revenu":
            revcats[o["cat"] or o["lib"] or "Divers"] = revcats.get(o["cat"] or o["lib"] or "Divers", 0) + abs(o["montant"])
    catl = sorted(([{"label": k, "value": num(round(v, 2))} for k, v in cats.items()]), key=lambda x: -x["value"])
    revl = sorted(([{"label": k, "value": num(round(v, 2))} for k, v in revcats.items()]), key=lambda x: -x["value"])
    return {
        "dispo": num(round(dispo, 2)), "coffres": num(round(coffres, 2)), "bloque": num(round(bloque, 2)),
        "patrimoine": num(round(dispo + coffres + bloque, 2)),
        "dep": num(round(dep, 2)), "rev": num(round(rev, 2)), "net": num(round(net, 2)),
        "taux": (net / rev) if rev else 0, "cats": catl, "revcats": revl,
    }


# Reconstruction des virements de juillet, puis soldes live simulés (comme app.js)
july_new, july_unpaired = pair_virements(july_ops)

# Ré-attribution des retraits SGCI/SGBCI : le journal les source depuis le compte
# courant Banque (SGBCI) (782 F fin juin) alors qu'ils proviennent de l'épargne SG.
# On corrige la source -> "Épargne forcée (prêt)" pour rendre juillet cohérent.
SG_SAVINGS = "Épargne forcée (prêt)"
reattrib = 0
for o in july_new:
    if o["type"] == "virement" and o["compte"] == "Banque (SGBCI)" \
       and ("SGCI" in o["lib"] or "SGBCI" in o["lib"]):
        o["compte"] = SG_SAVINGS
        note = o.get("note", "") or ""
        o["note"] = (note + " · source ré-attribuée à l'épargne SG").strip(" ·")
        reattrib += 1

_live = simulate_live(accounts, july_new)

# Régularisation (choix utilisateur) : chaque compte DISPONIBLE encore à découvert
# en juillet (sur-dépense cash/OM) est renfloué par un retrait du Coffre Fonds
# d'urgence (via Djamo). Rend juillet 100 % cohérent, sans découvert.
DEST_LABELS = {"Cash (espèces)": "espèces", "Orange Money": "Orange Money"}
_ts_reg = 1_760_000_100_000
for a in accounts:
    if a["type"] != "disponible":
        continue
    v = _live.get(a["nom"], 0)
    if v < 0:
        manque = num(round(-v, 2))
        dest = a["nom"]
        july_new.append({
            "date": "05/07",
            "lib": f"Retrait Fonds d'urgence → {DEST_LABELS.get(dest, dest)} (régularisation)",
            "type": "virement",
            "compte": "Coffre Fonds d'urgence",
            "compteDest": dest,
            "cat": "",
            "montant": manque,
            "note": "Couvre la sur-dépense de juillet (retrait de l'épargne d'urgence via Djamo)",
            "_ts": _ts_reg,
            "_t": "",
        })
        _ts_reg += 1
        print(f"[régularisation] retrait Fonds d'urgence -> {dest} : {manque} F")
        _live = simulate_live(accounts, july_new)

for a in accounts:
    a["solde_live"] = _live[a["nom"]]

june = agg(june_ops, accounts, "fin_juin")
july = agg(july_new, accounts, "live")


# ---------- Ventilation Juin (charges = dépenses par catégorie) ----------
def build_ventilation(a):
    charges = [{"poste": c["label"], "montant": c["value"], "statut": "Fait", "note": ""} for c in a["cats"]]
    return {"dispoAVentiler": a["rev"], "charges": charges, "resteACouvrir": [], "coursAttendu": 0}


# ---------- Dettes note ----------
dettes_rows = read_sheet(F, "Dettes à rembourser")
total_solde = 0
det_lines = []
for r in dettes_rows[3:]:
    if len(r) < 3 or not isinstance(r[1], str):
        continue
    if r[1].strip().startswith("TOTAL"):
        total_solde = num(r[2] or 0)
        continue
    if r[2] is None:
        continue
    det_lines.append((r[1].strip(), num(r[2])))
dettes_note = ("Tous les engagements ont été soldés au 26/06 : "
               + ", ".join(f"{n} ({m:,} F)".replace(",", " ") for n, m in det_lines)
               + f" — soit {total_solde:,} F remis. Aucune dette en cours.").replace(",", " ")


# ---------- SEED (Juin 2026) ----------
def comptes_out(when):
    return [{"nom": a["nom"], "solde": a["solde_" + when], "type": a["type"], "note": ""} for a in accounts]


seed = {
    "asOf": "30 juin 2026",
    "kpis": {
        "patrimoine": june["patrimoine"], "disponible": june["dispo"],
        "epargne": num(round(june["coffres"] + june["bloque"], 2)),
        "depenseJuin": june["dep"], "revenus": june["rev"],
        "epargneNette": june["net"], "tauxEpargne": june["taux"],
    },
    "patrimoineSplit": [
        {"label": "Disponible", "value": june["dispo"]},
        {"label": "Coffres (urgence + scolarité)", "value": june["coffres"]},
        {"label": "Épargne bloquée", "value": june["bloque"]},
    ],
    "comptes": comptes_out("fin_juin"),
    "categories": june["cats"],
    "revCategories": june["revcats"],
    "coffres": build_coffres("fin_juin"),
    "dettes": [],
    "dettesNote": dettes_note,
    "ventilation": build_ventilation(june),
    "operations": june_ops,
}

# ---------- STATE (cycles + buckets) ----------
july_opening_comptes = [{"nom": a["nom"], "solde": a["solde_fin_juin"], "type": a["type"], "note": ""} for a in accounts]
july_opening_coffres = [{"nom": c["nom"], "epargne": c["epargne"], "objectif": c["objectif"], "bloque": c["bloque"], "note": ""}
                        for c in build_coffres("fin_juin")]

# newOps de juillet : horodatage (ordre de saisie préservé, haut = plus récent)
N = len(july_new)
for i, o in enumerate(july_new):
    o["_ts"] = 1_760_000_000_000 + (N - i)
    o["_t"] = ""

cycles = {
    "activeId": "2026-07",
    "months": [
        {"id": "2026-06", "label": "Juin 2026", "mm": "06", "year": 2026, "monthName": "juin", "seed": True},
        {"id": "2026-07", "label": "Juillet 2026", "mm": "07", "year": 2026, "monthName": "juillet", "seed": False,
         "opening": {"comptes": july_opening_comptes, "coffres": july_opening_coffres}},
    ],
}
bucket_june = {"newOps": [], "dettePaid": {}, "ventilations": None, "coffreOverrides": {}, "userDettes": [], "opOverrides": {}, "opDeletes": []}
bucket_july = {"newOps": july_new, "dettePaid": {}, "ventilations": [], "coffreOverrides": {}, "userDettes": [], "opOverrides": {}, "opDeletes": []}

state = {"cycles": cycles, "m-2026-06": bucket_june, "m-2026-07": bucket_july}

json.dump(seed, open("build/seed.json", "w"), ensure_ascii=False, indent=2)
json.dump(state, open("build/state.json", "w"), ensure_ascii=False, indent=2)

# ---------- Diagnostics ----------
print("=== DIAGNOSTIC IMPORT ===")
print(f"Comptes: {len(accounts)}")
for a in accounts:
    flag = "  ⚠ DÉCOUVERT" if a["solde_live"] < 0 else ""
    print(f"  {a['nom']:<26} {a['type']:<11} fin-juin/ouv.juil={a['solde_fin_juin']:>10}  live-juil={a['solde_live']:>10}{flag}")
print(f"\nOpérations juin: {len(june_ops)}  | juillet: {len(july_ops)} (dont virements appariés -> {len(july_new)} lignes, {july_unpaired} legs non appariés)")
print(f"Retraits SGCI/SGBCI ré-attribués (Banque -> {SG_SAVINGS}) : {reattrib}")
print(f"\nJUIN  — patrimoine={june['patrimoine']:,}  dispo={june['dispo']:,}  coffres={june['coffres']:,}  bloque={june['bloque']:,}")
print(f"        dépenses={june['dep']:,}  revenus={june['rev']:,}  net={june['net']:,}  taux={june['taux']*100:.1f}%")
print(f"JUIL. — patrimoine(live)={july['patrimoine']:,}  dispo={july['dispo']:,}  coffres={july['coffres']:,}  bloque={july['bloque']:,}")
print(f"        dépenses={july['dep']:,}  revenus={july['rev']:,}  net={july['net']:,}  taux={july['taux']*100:.1f}%")
print(f"\nVérif : patrimoine Excel 'Solde actuel' (= fin juin) = {sum(a['solde_actuel'] for a in accounts):,} == JUIN patrimoine {june['patrimoine']:,}")
neg = [a['nom'] for a in accounts if a['solde_live'] < 0]
if neg:
    print(f"\n⚠ Comptes à découvert en JUILLET (attribution du journal utilisateur) : {neg}")
print(f"\ndettesNote: {dettes_note[:130]}…")
