"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Backup = { id: number; created_at: number; kind: string; bytes: number; cycles: number };

const KIND_LABEL: Record<string, string> = {
  auto: "Automatique",
  manuel: "Manuelle",
  "pré-restauration": "Avant restauration",
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDateShort(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function fmtSize(b: number) {
  return b < 1024 ? b + " o" : b < 1024 * 1024 ? (b / 1024).toFixed(1) + " Ko" : (b / 1048576).toFixed(1) + " Mo";
}
function fmtRel(ts: number) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "à l'instant";
  const m = s / 60;
  if (m < 60) return `il y a ${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `il y a ${Math.round(h)} h`;
  const d = h / 24;
  if (d < 30) return `il y a ${Math.round(d)} j`;
  return fmtDateShort(ts);
}

const PAGE_SIZES = [10, 25, 0]; // 0 = tout afficher

export default function BackupsClient() {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; s: string } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    const r = await fetch("/api/backups", { credentials: "same-origin" });
    if (r.status === 401) {
      window.location.href = "/login";
      return;
    }
    const j = await r.json();
    setBackups(j.backups || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function backupNow() {
    setBusy("now");
    setMsg(null);
    try {
      const r = await fetch("/api/backup", { method: "POST", credentials: "same-origin" });
      const j = await r.json();
      if (j.ok) setMsg({ t: "ok", s: "Sauvegarde créée." });
      else setMsg({ t: "err", s: "Échec de la sauvegarde." });
      setPage(0);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function restore(id: number) {
    if (!confirm("Restaurer cette sauvegarde ? Vos données actuelles seront remplacées.\n\nUne sauvegarde de l'état actuel est créée automatiquement (annulable).")) return;
    setBusy("r" + id);
    setMsg(null);
    try {
      const r = await fetch("/api/restore", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json();
      if (j.ok) setMsg({ t: "ok", s: "Données restaurées. Rechargez l'application pour voir le résultat." });
      else setMsg({ t: "err", s: "Restauration impossible." });
      setPage(0);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const list = backups || [];
  const total = list.length;
  const stats = useMemo(() => {
    const bytes = list.reduce((s, b) => s + b.bytes, 0);
    return { last: list[0]?.created_at ?? null, bytes };
  }, [list]);

  const showAll = pageSize === 0;
  const size = showAll ? total || 1 : pageSize;
  const pages = Math.max(1, Math.ceil(total / size));
  const curPage = Math.min(page, pages - 1);
  const start = showAll ? 0 : curPage * size;
  const end = showAll ? total : Math.min(total, start + size);
  const visible = list.slice(start, end);

  function changeSize(v: number) {
    setPageSize(v);
    setPage(0);
  }

  return (
    <main className="bk-shell">
      <div className="bk-wrap">
        <header className="bk-head">
          <div className="bk-brand">
            <div className="bk-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <path d="M17 21v-8H7v8M7 3v5h8" />
              </svg>
            </div>
            <div>
              <div className="bk-logo">Sauvegardes</div>
              <div className="bk-sub">Vos données sont sauvegardées chaque jour, automatiquement.</div>
            </div>
          </div>
          <a className="bk-back" href="/">← Retour à l'app</a>
        </header>

        <div className="bk-stats">
          <div className="bk-stat">
            <div className="k">Sauvegardes</div>
            <div className="v">{backups === null ? "—" : total}</div>
          </div>
          <div className="bk-stat">
            <div className="k">Dernière</div>
            <div className="v">{stats.last ? fmtRel(stats.last) : "—"}</div>
          </div>
          <div className="bk-stat">
            <div className="k">Espace</div>
            <div className="v">{backups === null ? "—" : fmtSize(stats.bytes)}</div>
          </div>
        </div>

        <div className="bk-actions">
          <button className="bk-btn dark" onClick={backupNow} disabled={busy === "now"}>
            {busy === "now" ? "Sauvegarde…" : "＋ Sauvegarder maintenant"}
          </button>
          <span className="bk-hint">Sauvegarde auto quotidienne · 30 dernières conservées</span>
        </div>

        {msg && <div className={"bk-msg " + msg.t}>{msg.s}</div>}

        {backups === null ? (
          <div className="bk-empty">Chargement…</div>
        ) : total === 0 ? (
          <div className="bk-empty">Aucune sauvegarde pour l'instant. Cliquez sur « Sauvegarder maintenant ».</div>
        ) : (
          <>
            <ul className="bk-list">
              {visible.map((b, i) => {
                const kindClass = b.kind === "auto" ? "auto" : b.kind === "manuel" ? "manuel" : "restauration";
                const isLatest = start === 0 && i === 0;
                return (
                  <li className={"bk-item" + (isLatest ? " latest" : "")} key={b.id}>
                    <div className={"bk-ic " + kindClass} aria-hidden>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <path d="M17 21v-8H7v8M7 3v5h8" />
                      </svg>
                    </div>
                    <div className="bk-body">
                      <div className="bk-line1">
                        <span className={"bk-tag " + b.kind}>{KIND_LABEL[b.kind] || b.kind}</span>
                        {isLatest && <span className="bk-latest">Dernière</span>}
                        <span className="bk-when">{fmtRel(b.created_at)}</span>
                      </div>
                      <div className="bk-date">{fmtDate(b.created_at)}</div>
                      <div className="bk-info">{b.cycles} mois · {fmtSize(b.bytes)}</div>
                    </div>
                    <div className="bk-item-actions">
                      <a className="bk-btn ghost" href={`/api/backups/${b.id}`}>Télécharger</a>
                      <button className="bk-btn" onClick={() => restore(b.id)} disabled={busy === "r" + b.id}>
                        {busy === "r" + b.id ? "…" : "Restaurer"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="bk-pager">
              <span className="bk-pg-info">
                {showAll ? `${total} sauvegarde${total > 1 ? "s" : ""}` : `${start + 1}–${end} sur ${total}`}
              </span>
              <div className="bk-pg-btns">
                <select className="bk-pg-size" value={pageSize} onChange={(e) => changeSize(parseInt(e.target.value, 10))} title="Sauvegardes par page">
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s === 0 ? "Tout afficher" : `${s} / page`}</option>
                  ))}
                </select>
                {!showAll && total > size && (
                  <>
                    <button className="bk-btn ghost bk-pg-btn" disabled={curPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹ Récent</button>
                    <span className="bk-pg-num">Page {curPage + 1} / {pages}</span>
                    <button className="bk-btn ghost bk-pg-btn" disabled={curPage >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Ancien ›</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
