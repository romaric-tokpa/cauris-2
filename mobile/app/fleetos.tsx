import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import RingProgress from "../components/RingProgress";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type FleetosRow = {
  n: number;
  label: string;
  epargne: number;
  revenuFlotte: number;
  tresoFin: number;
  achats: number;
  vehFin: number;
  patrimoine: number;
  epargneCumulPrevue: number;
  epargneReelle: number | null;
};
type FleetosResponse = {
  info: { coffre: string; prixVehicule: number; revenuVehiculeMois: number; epargneAvant2027: number; epargneDes2027: number; debut: string; horizon: string };
  summary: { n: number; cur: FleetosRow; nextAchat: FleetosRow | null; vivant: number; ecart: number };
  plan: FleetosRow[];
};

export default function FleetosScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<FleetosResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/fleetos");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger FleetOS.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <OverlayScreen title="FleetOS">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data) {
    return (
      <OverlayScreen title="FleetOS">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const { info, summary, plan } = data;
  const enAvance = summary.ecart >= 0;
  const objPct = Math.max(0, Math.min(100, (summary.vivant / info.prixVehicule) * 100));

  return (
    <OverlayScreen title="FleetOS">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Autofinancement 100% cash · démarré {info.debut} · horizon {info.horizon}
        </Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Épargné dans le coffre</Text>
          <Text style={styles.heroValue}>{fmt(summary.vivant)} F</Text>
          <Text style={[styles.heroDelta, { color: enAvance ? "#4ED88F" : "#FF9E7A" }]}>
            {enAvance ? "+" : "−"}
            {fmt(Math.abs(summary.ecart))} F {enAvance ? "d'avance" : "de retard"} sur le plan
          </Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Prévu ({summary.cur.label})</Text>
            <Text style={styles.kpiVal}>{fmt(summary.cur.tresoFin)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Mois du plan</Text>
            <Text style={styles.kpiVal}>{summary.n} / 48</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>{summary.nextAchat ? "Prochain véhicule" : "Flotte complète"}</Text>
            <Text style={styles.kpiVal}>{summary.nextAchat ? `n°${summary.nextAchat.vehFin}` : `${plan[plan.length - 1].vehFin}`}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vers le 1er véhicule ({fmt(info.prixVehicule)} F)</Text>
          <View style={styles.gaugeRow}>
            <RingProgress pct={objPct} color={colors.orange} label={`${objPct.toFixed(0)}%`} sub="épargné" size={84} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.gm}>
                <Text style={styles.gmLabel}>Épargné à ce jour</Text>
                <Text style={styles.gmVal}>{fmt(summary.vivant)} F</Text>
              </View>
              <View style={styles.gm}>
                <Text style={styles.gmLabel}>Reste à épargner</Text>
                <Text style={styles.gmVal}>{fmt(Math.max(0, info.prixVehicule - summary.vivant))} F</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Épargne prévue · {plan.length} mois</Text>
        <View style={styles.listCard}>
          {plan.map((r) => {
            const cur = r.n === summary.n;
            const statut = r.n < summary.n ? "Passé" : cur ? "En cours" : "À venir";
            const statutColor = r.n < summary.n ? colors.muted2 : cur ? colors.orange : colors.blue;
            const reelColor = r.epargneReelle == null ? colors.muted2 : r.epargneReelle >= r.epargne ? colors.green : colors.red;
            return (
              <View key={r.n} style={[styles.planRow, cur && { backgroundColor: colors.fillSoft }]}>
                <View style={[styles.planDot, { backgroundColor: statutColor }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.planLabel} numberOfLines={1}>
                    {r.label}
                  </Text>
                  <Text style={styles.planCumul}>Cumul prévu {fmt(r.epargneCumulPrevue)} F</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planEpargne}>{fmt(r.epargne)} F prévu</Text>
                  <Text style={[styles.planReel, { color: reelColor }]}>{r.epargneReelle != null ? `${fmt(r.epargneReelle)} F réel` : "—"}</Text>
                  <Text style={[styles.planStat, { color: statutColor }]}>{statut}</Text>
                </View>
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
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, marginTop: -6 },
  hero: { backgroundColor: colors.anthracite, borderRadius: 20, padding: 18 },
  heroLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 22, color: "#fff", marginTop: 2 },
  heroDelta: { fontFamily: fonts.monoBold, fontSize: 13, marginTop: 4 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 13 },
  kpiLabel: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.muted2, marginBottom: 5 },
  kpiVal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, padding: 16, overflow: "hidden" },
  listCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 14 },
  gaugeRow: { flexDirection: "row", gap: 18, alignItems: "center" },
  gm: { flexDirection: "row", justifyContent: "space-between" },
  gmLabel: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.muted },
  gmVal: { fontFamily: fonts.monoBold, fontSize: 12.5, color: colors.ink },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: -4 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  planDot: { width: 8, height: 8, borderRadius: 999 },
  planLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: colors.ink },
  planCumul: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.muted2, marginTop: 1 },
  planEpargne: { fontFamily: fonts.monoBold, fontSize: 12.5, color: colors.ink },
  planReel: { fontFamily: fonts.monoBold, fontSize: 11, marginTop: 1 },
  planStat: { fontFamily: fonts.sans, fontSize: 10.5, marginTop: 1 },
  });
}
