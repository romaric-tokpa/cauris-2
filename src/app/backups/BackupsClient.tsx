"use client";

import { useCallback, useEffect, useState } from "react";

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
function fmtSize(b: number) {
  return b < 1024 ? b + " o" : (b / 1024).toFixed(1) + " Ko";
}

export default function BackupsClient() {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; s: string } | null>(null);

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
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="bk-shell">
      <div className="bk-wrap">
        <header className="bk-head">
          <div className="bk-brand">
            <div className="bk-mark">RT</div>
            <div>
              <div className="bk-logo">Cauris · Sauvegardes</div>
              <div className="bk-sub">Vos données sont sauvegardées chaque jour automatiquement.</div>
            </div>
          </div>
          <a className="bk-back" href="/">← Retour à l'app</a>
        </header>

        <div className="bk-actions">
          <button className="bk-btn dark" onClick={backupNow} disabled={busy === "now"}>
            {busy === "now" ? "Sauvegarde…" : "Sauvegarder maintenant"}
          </button>
          <span className="bk-hint">Sauvegarde auto quotidienne · 30 dernières conservées</span>
        </div>

        {msg && <div className={"bk-msg " + msg.t}>{msg.s}</div>}

        {backups === null ? (
          <div className="bk-empty">Chargement…</div>
        ) : backups.length === 0 ? (
          <div className="bk-empty">Aucune sauvegarde pour l'instant. Cliquez sur « Sauvegarder maintenant ».</div>
        ) : (
          <ul className="bk-list">
            {backups.map((b) => (
              <li className="bk-item" key={b.id}>
                <div className="bk-meta">
                  <span className={"bk-tag " + b.kind}>{KIND_LABEL[b.kind] || b.kind}</span>
                  <span className="bk-date">{fmtDate(b.created_at)}</span>
                  <span className="bk-info">{b.cycles} mois · {fmtSize(b.bytes)}</span>
                </div>
                <div className="bk-item-actions">
                  <a className="bk-btn ghost" href={`/api/backups/${b.id}`}>Télécharger</a>
                  <button className="bk-btn" onClick={() => restore(b.id)} disabled={busy === "r" + b.id}>
                    {busy === "r" + b.id ? "…" : "Restaurer"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
