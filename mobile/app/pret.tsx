import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import RingProgress from "../components/RingProgress";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type PretEcheance = { no: number; date: string; capital: number; interets: number; assurance: number; montant: number; reste: number; paid: boolean; linked: boolean; current: boolean };
type PretResponse = {
  info: { banque: string; numero: string; montant: number; tauxInterets: number; tauxAssurance: number; dateMiseEnPlace: string; premiereEcheance: string; derniereEcheance: string; nbEcheances: number };
  summary: { next: PretEcheance | null; resteDu: number; rembourse: number; pct: number; payees: number; restantes: number };
  echeances: PretEcheance[];
};

export default function PretScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<PretResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyNo, setBusyNo] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pret");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger le prêt.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(e: PretEcheance) {
    setBusyNo(e.no);
    try {
      const res = await apiFetch("/api/pret", { method: "POST", body: JSON.stringify({ no: e.no }) });
      if (res.ok) await load();
    } catch (err) {
      if (err instanceof UnauthorizedError) logout();
    } finally {
      setBusyNo(null);
    }
  }

  if (error) {
    return (
      <OverlayScreen title="Prêt">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data) {
    return (
      <OverlayScreen title="Prêt">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const { info, summary, echeances } = data;
  const finPct = Math.max(0, Math.min(100, summary.pct));
  const aVenir = echeances.filter((e) => !e.paid);
  const payees = [...echeances].filter((e) => e.paid).reverse();

  return (
    <OverlayScreen title="Prêt étudiant">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {info.banque} · Prêt n°{info.numero}
        </Text>

        <View style={styles.heroRow}>
          <RingProgress pct={finPct} color={colors.blue} label={`${finPct.toFixed(0)}%`} sub="remboursé" size={90} />
          <View style={{ flex: 1, gap: 10 }}>
            <View>
              <Text style={styles.metaLabel}>Capital restant dû</Text>
              <Text style={styles.metaValue}>{fmt(summary.resteDu)} F</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Prochaine échéance</Text>
              <Text style={[styles.metaValue, { color: colors.orange }]}>{summary.next ? `${fmt(summary.next.montant)} F · ${summary.next.date}` : "Prêt soldé"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Capital remboursé</Text>
            <Text style={styles.kpiVal}>{fmt(summary.rembourse)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Échéances</Text>
            <Text style={styles.kpiVal}>
              {summary.payees} / {info.nbEcheances}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Échéances à venir · {aVenir.length}</Text>
        {aVenir.length ? (
          <View style={styles.card}>
            {aVenir.map((e) => (
              <View key={e.no} style={[styles.echRow, e.current && { backgroundColor: colors.fillSoft }]}>
                <Text style={styles.echNo}>#{e.no}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.echDate}>{e.date}</Text>
                  <Text style={styles.echMeta}>
                    cap {fmt(e.capital)} · int {fmt(e.interets)} · assur {fmt(e.assurance)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", marginRight: 10 }}>
                  <Text style={styles.echTotal}>{fmt(e.montant)}</Text>
                  <Text style={[styles.echStat, { color: colors.orange }]}>À venir</Text>
                </View>
                <Tap style={styles.echBtn} onPress={() => markPaid(e)} disabled={busyNo === e.no}>
                  {busyNo === e.no ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.echBtnText}>Payer</Text>}
                </Tap>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Prêt entièrement soldé.</Text>
        )}

        <Text style={styles.sectionTitle}>Échéances payées · {payees.length}</Text>
        {payees.length ? (
          <View style={styles.card}>
            {payees.map((e) => (
              <View key={e.no} style={styles.echRow}>
                <Text style={styles.echNo}>#{e.no}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.echDate}>{e.date}</Text>
                  <Text style={styles.echMeta}>
                    cap {fmt(e.capital)} · int {fmt(e.interets)} · assur {fmt(e.assurance)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.echTotal}>{fmt(e.montant)}</Text>
                  <Text style={[styles.echStat, { color: colors.green }]}>Payée</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Aucune échéance payée pour l&apos;instant.</Text>
        )}
      </ScrollView>
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, marginTop: -6 },
  heroRow: { flexDirection: "row", gap: 18, alignItems: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 20, padding: 18 },
  metaLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
  metaValue: { fontFamily: fonts.monoBold, fontSize: 17, color: colors.ink, marginTop: 2 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 13 },
  kpiLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginBottom: 5 },
  kpiVal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.ink },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  echRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  echNo: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.muted2, width: 28 },
  echDate: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
  echMeta: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.muted2, marginTop: 1 },
  echTotal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
  echStat: { fontFamily: fonts.sansSemiBold, fontSize: 10, marginTop: 2 },
  echBtn: { backgroundColor: colors.orange, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, minWidth: 60, alignItems: "center" },
  echBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: "#fff" },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  });
}
