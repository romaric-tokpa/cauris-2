import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type BackupMeta = { id: number; created_at: number; kind: string; bytes: number; cycles: number };

const KIND_LABEL: Record<string, string> = { auto: "Automatique", manuel: "Manuelle", "pré-restauration": "Pré-restauration" };
function kindStyleFor(colors: ThemeColors): Record<string, { bg: string; c: string; icon: keyof typeof Feather.glyphMap }> {
  return {
    auto: { bg: colors.greenBg, c: colors.green, icon: "refresh-cw" },
    manuel: { bg: colors.blueBg, c: colors.blue, icon: "download" },
    "pré-restauration": { bg: colors.amberBg, c: colors.amber, icon: "clock" },
  };
}
/** Filet pour les anciens `kind` ponctuels (ex. sauvegardes prises avant une migration ad hoc, absentes des trois catégories ci-dessus). */
function defaultKindStyle(colors: ThemeColors): { bg: string; c: string; icon: keyof typeof Feather.glyphMap } {
  return { bg: colors.fillSoft, c: colors.acier, icon: "archive" };
}

function timeAgo(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 60) return `il y a ${Math.max(diffMin, 1)} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return `il y a ${Math.round(diffH / 24)} j`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatBytes(n: number): string {
  return n > 1024 ? `${(n / 1024).toFixed(1)} Ko` : `${n} o`;
}

export default function SauvegardesScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const KIND_STYLE = useMemo(() => kindStyleFor(colors), [colors]);
  const FALLBACK_STYLE = useMemo(() => defaultKindStyle(colors), [colors]);
  const [backups, setBackups] = useState<BackupMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/backups");
      const body = await res.json();
      setBackups(body.backups ?? []);
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger les sauvegardes.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBackupNow() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/backup", { method: "POST" });
      if (res.ok) await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setSaving(false);
    }
  }

  function confirmRestore(b: BackupMeta) {
    Alert.alert("Restaurer cette sauvegarde", `Sauvegarde du ${formatDate(b.created_at)}. L'état actuel sera d'abord sauvegardé, puis remplacé.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Restaurer", style: "destructive", onPress: () => restore(b.id) },
    ]);
  }

  async function restore(id: number) {
    setRestoringId(id);
    try {
      const res = await apiFetch("/api/restore", { method: "POST", body: JSON.stringify({ id }) });
      if (res.ok) {
        await load();
        Alert.alert("Restauration effectuée", "Les données ont été restaurées.");
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setRestoringId(null);
    }
  }

  if (error) {
    return (
      <OverlayScreen title="Sauvegardes">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!backups) {
    return (
      <OverlayScreen title="Sauvegardes">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const totalBytes = backups.reduce((s, b) => s + b.bytes, 0);

  return (
    <OverlayScreen title="Sauvegardes">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Sauvegardes</Text>
            <Text style={styles.statVal}>{backups.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Dernière</Text>
            <Text style={styles.statVal}>{backups[0] ? timeAgo(backups[0].created_at) : "—"}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Espace</Text>
            <Text style={styles.statVal}>{formatBytes(totalBytes)}</Text>
          </View>
        </View>

        <Pressable style={styles.backupBtn} onPress={handleBackupNow} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.backupBtnText}>Sauvegarder maintenant</Text>}
        </Pressable>

        {backups.length === 0 ? (
          <Text style={styles.empty}>Aucune sauvegarde pour l&apos;instant.</Text>
        ) : (
          <View style={styles.card}>
            {backups.map((b) => {
              const st = KIND_STYLE[b.kind] ?? FALLBACK_STYLE;
              return (
                <View key={b.id} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: st.bg }]}>
                    <Feather name={st.icon} size={16} color={st.c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{KIND_LABEL[b.kind] ?? b.kind}</Text>
                    <Text style={styles.rowMeta}>
                      {formatDate(b.created_at)} · {formatBytes(b.bytes)} · {b.cycles} cycle{b.cycles > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Pressable style={styles.restoreBtn} onPress={() => confirmRestore(b)} disabled={restoringId === b.id}>
                    {restoringId === b.id ? <ActivityIndicator size="small" color={colors.orange} /> : <Text style={styles.restoreBtnText}>Restaurer</Text>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 13 },
  statLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginBottom: 5 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink },
  backupBtn: { alignItems: "center", padding: 14, borderRadius: 16, backgroundColor: colors.anthracite },
  backupBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: "#fff" },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  rowMeta: { fontFamily: fonts.mono, fontSize: 11.5, color: colors.muted2, marginTop: 2 },
  restoreBtn: { minWidth: 74, alignItems: "center" },
  restoreBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.orange },
  });
}
