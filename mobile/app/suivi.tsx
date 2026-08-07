import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import SegmentedBar from "../components/SegmentedBar";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Cat = { label: string; value: number };
type PilotMonth = { id: string; label: string; isActive: boolean; revenu: number; depense: number; net: number; tauxPct: number; depCategories: Cat[]; revCategories: Cat[] };
type PilotResponse = { months: PilotMonth[]; totals: { revenu: number; depense: number; net: number } };

function CatBars({ cats, tone, colors, styles }: { cats: Cat[]; tone: "rev" | "dep"; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  if (!cats.length) return <Text style={styles.catEmpty}>{tone === "rev" ? "Aucun revenu ce mois-ci." : "Aucune dépense ce mois-ci."}</Text>;
  const max = cats[0].value;
  const total = cats.reduce((s, c) => s + c.value, 0);
  const color = tone === "rev" ? colors.green : colors.orange;
  return (
    <View style={{ gap: 12 }}>
      {cats.map((c) => (
        <View key={c.label}>
          <View style={styles.catHead}>
            <Text style={styles.catLabel} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={styles.catValue}>
              {fmt(c.value)} F <Text style={styles.catPct}>· {total ? Math.round((c.value / total) * 100) : 0}%</Text>
            </Text>
          </View>
          <SegmentedBar pct={(c.value / max) * 100} color={color} />
        </View>
      ))}
    </View>
  );
}

export default function SuiviScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<PilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pilot");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger le suivi mensuel.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  function confirmClose() {
    Alert.alert(
      "Clôturer le mois",
      "Les soldes de comptes et coffres sont reportés comme point de départ du mois suivant. Le mois actuel reste consultable dans l'historique.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Clôturer", onPress: closeMonth },
      ],
    );
  }

  async function closeMonth() {
    setClosing(true);
    try {
      const res = await apiFetch("/api/pilot/close", { method: "POST" });
      if (res.ok) await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setClosing(false);
    }
  }

  function confirmActivate(m: PilotMonth) {
    Alert.alert(
      "Activer ce cycle",
      `Toutes les opérations ajoutées seront enregistrées dans ${m.label} jusqu'à ce que tu changes à nouveau de cycle actif.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Activer", onPress: () => activateCycle(m.id) },
      ],
    );
  }

  async function activateCycle(id: string) {
    setSwitchingId(id);
    try {
      const res = await apiFetch("/api/pilot/switch", { method: "POST", body: JSON.stringify({ cycleId: id }) });
      if (res.ok) await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setSwitchingId(null);
    }
  }

  if (error) {
    return (
      <OverlayScreen title="Suivi mensuel">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data) {
    return (
      <OverlayScreen title="Suivi mensuel">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const active = data.months.find((m) => m.isActive) ?? data.months[data.months.length - 1];
  const history = [...data.months].reverse();

  return (
    <OverlayScreen title="Suivi mensuel">
      <ScrollView contentContainerStyle={styles.content}>
        {active ? (
          <View style={styles.hero}>
            <View style={styles.heroBadgeRow}>
              <Text style={styles.heroBadgeLabel}>Cycle actif</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>ouvert</Text>
              </View>
            </View>
            <Text style={styles.heroLabel}>{active.label}</Text>
            <View style={styles.heroStatsRow}>
              <View>
                <Text style={styles.heroStatLabel}>Revenus</Text>
                <Text style={[styles.heroStatVal, { color: "#4ED88F" }]}>{fmt(active.revenu)}</Text>
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Dépenses</Text>
                <Text style={[styles.heroStatVal, { color: "#FF9E7A" }]}>{fmt(active.depense)}</Text>
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Net</Text>
                <Text style={[styles.heroStatVal, { color: "#fff" }]}>{fmt(active.net)}</Text>
              </View>
            </View>
            <Tap style={styles.closeBtn} onPress={confirmClose} disabled={closing}>
              {closing ? <ActivityIndicator color="#fff" /> : <Text style={styles.closeBtnText}>Clôturer le mois</Text>}
            </Tap>
          </View>
        ) : null}

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Cumul revenus</Text>
            <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(data.totals.revenu)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Cumul dépenses</Text>
            <Text style={[styles.kpiVal, { color: colors.red }]}>{fmt(data.totals.depense)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Cumul épargne</Text>
            <Text style={styles.kpiVal}>{fmt(data.totals.net)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Historique des cycles</Text>
        <View style={styles.card}>
          {history.map((m) => {
            const open = openId === m.id;
            return (
              <View key={m.id}>
                <Tap style={styles.monthRow} onPress={() => setOpenId(open ? null : m.id)}>
                  <View style={styles.monthHead}>
                    <View style={styles.monthLabelRow}>
                      <Text style={styles.monthLabel}>{m.label}</Text>
                      {m.isActive ? (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>actif</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.monthNet, { color: m.net >= 0 ? colors.green : colors.red }]}>
                      {m.net >= 0 ? "+" : "−"}
                      {fmt(Math.abs(m.net))}
                    </Text>
                  </View>
                  <View style={styles.monthStatsRow}>
                    <Text style={[styles.monthStat, { color: colors.green }]}>▲ {fmt(m.revenu)}</Text>
                    <Text style={[styles.monthStat, { color: colors.red }]}>▼ {fmt(m.depense)}</Text>
                    <Text style={styles.monthTaux}>taux {m.tauxPct.toFixed(0)}%</Text>
                  </View>
                  {!m.isActive ? (
                    <Tap style={styles.activateBtn} onPress={() => confirmActivate(m)} disabled={switchingId === m.id}>
                      {switchingId === m.id ? (
                        <ActivityIndicator size="small" color={colors.orange} />
                      ) : (
                        <Text style={styles.activateBtnText}>Activer ce cycle</Text>
                      )}
                    </Tap>
                  ) : null}
                </Tap>
                {open ? (
                  <View style={styles.detail}>
                    <View style={styles.detailBlock}>
                      <View style={styles.detailHead}>
                        <View style={[styles.detailDot, { backgroundColor: colors.green }]} />
                        <Text style={styles.detailBlockTitle}>Revenus</Text>
                        <Text style={styles.detailBlockTotal}>{fmt(m.revenu)} F</Text>
                      </View>
                      <CatBars cats={m.revCategories} tone="rev" colors={colors} styles={styles} />
                    </View>
                    <View style={styles.detailBlock}>
                      <View style={styles.detailHead}>
                        <View style={[styles.detailDot, { backgroundColor: colors.orange }]} />
                        <Text style={styles.detailBlockTitle}>Dépenses</Text>
                        <Text style={styles.detailBlockTotal}>{fmt(m.depense)} F</Text>
                      </View>
                      <CatBars cats={m.depCategories} tone="dep" colors={colors} styles={styles} />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
    content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
    hero: { backgroundColor: colors.anthracite, borderRadius: 22, padding: 20 },
    heroBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    heroBadgeLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
    heroBadge: { backgroundColor: "rgba(226,84,26,0.16)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    heroBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 10, color: colors.orange },
    heroLabel: { fontFamily: fonts.sansBold, fontSize: 22, color: "#fff", marginTop: 4, marginBottom: 14 },
    heroStatsRow: { flexDirection: "row", gap: 22, marginBottom: 16 },
    heroStatLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    heroStatVal: { fontFamily: fonts.monoBold, fontSize: 14, marginTop: 2 },
    closeBtn: { alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: colors.orange },
    closeBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: "#fff" },
    kpiRow: { flexDirection: "row", gap: 10 },
    kpi: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 13 },
    kpiLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginBottom: 5 },
    kpiVal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
    sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: -4 },
    card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
    monthRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
    monthHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    monthLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    monthLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
    activeBadge: { backgroundColor: colors.orange, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    activeBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 9, color: "#fff", textTransform: "uppercase" },
    monthNet: { fontFamily: fonts.monoBold, fontSize: 15 },
    monthStatsRow: { flexDirection: "row", gap: 16 },
    monthStat: { fontFamily: fonts.mono, fontSize: 12 },
    monthTaux: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted2, marginLeft: "auto" },
    activateBtn: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.orange },
    activateBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.orange },
    detail: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft, padding: 14, backgroundColor: colors.fillSoft, gap: 12 },
    detailBlock: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, padding: 12 },
    detailHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
    detailDot: { width: 7, height: 7, borderRadius: 999 },
    detailBlockTitle: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 11.5, letterSpacing: 0.4, textTransform: "uppercase", color: colors.ink },
    detailBlockTotal: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.muted2 },
    catHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
    catLabel: { flex: 1, marginRight: 8, fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.ink },
    catValue: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.ink },
    catPct: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.muted2 },
    catEmpty: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, paddingVertical: 2 },
  });
}
