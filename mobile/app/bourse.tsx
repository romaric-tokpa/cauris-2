import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import BourseTradeSheet from "../components/BourseTradeSheet";
import OverlayScreen from "../components/OverlayScreen";
import PortfolioChart from "../components/PortfolioChart";
import Sparkline from "../components/Sparkline";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { currencySymbol } from "../lib/currency";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";
import { useCountUp } from "../lib/useCountUp";

type PricePoint = { cours: number; date: string; ts: number };
type PositionItem = {
  code: string;
  nom?: string;
  quantite: number;
  pru: number;
  coursActuel: number;
  valorisation: number;
  plusValue: number;
  plusValuePct: number;
  priceHistory: PricePoint[];
};
type BourseOp = { type: "achat_titre" | "vente_titre" | "dividende"; lib?: string; date?: string; compte: string; montant: number; note?: string; monthLabel: string };
type SeriesPoint = { date: string; valo: number; invest: number };
type BourseResponse = {
  valorisation: number;
  investi: number;
  plusValue: number;
  plusValuePct: number;
  dividendes: number;
  rendementPct: number;
  liquidites: number;
  liquiditesCompte?: string;
  positions: PositionItem[];
  historique: BourseOp[];
  series: SeriesPoint[];
};
type OperationsFeedResponse = { activeMonthMm: string; accounts: { nom: string; type: string }[] };

const OP_LABEL: Record<BourseOp["type"], string> = { achat_titre: "Achat", vente_titre: "Vente", dividende: "Dividende" };

export default function BourseScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<BourseResponse | null>(null);
  const [ops, setOps] = useState<OperationsFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"achat" | "vente" | "dividende" | "cours">("achat");
  const [sheetCode, setSheetCode] = useState<string | undefined>(undefined);
  const displayValorisation = useCountUp(data?.valorisation ?? 0);

  const load = useCallback(async () => {
    try {
      const [bRes, oRes] = await Promise.all([apiFetch("/api/bourse"), apiFetch("/api/operations")]);
      setData(await bRes.json());
      setOps(await oRes.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger le portefeuille.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  function openTrade(mode: "achat" | "vente" | "dividende") {
    setSheetMode(mode);
    setSheetCode(undefined);
    setSheetOpen(true);
  }

  function openCoursUpdate(code: string) {
    setSheetMode("cours");
    setSheetCode(code);
    setSheetOpen(true);
  }

  if (error) {
    return (
      <OverlayScreen title="Bourse">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data || !ops) {
    return (
      <OverlayScreen title="Bourse">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const up = data.plusValue >= 0;
  const plColor = up ? colors.green : colors.red;
  const cashAccounts = ops.accounts.filter((a) => a.type !== "placement");

  return (
    <OverlayScreen title="Bourse">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Valorisation</Text>
          <Text style={styles.heroValue}>
            {fmt(displayValorisation)} <Text style={styles.heroUnit}>{currencySymbol()}</Text>
          </Text>
          <View style={[styles.heroPl, { backgroundColor: up ? colors.greenBg : colors.redBg }]}>
            <Feather name={up ? "trending-up" : "trending-down"} size={12} color={plColor} />
            <Text style={[styles.heroPlText, { color: plColor }]}>
              {up ? "+" : "−"}
              {fmt(Math.abs(data.plusValue))} · {up ? "+" : "−"}
              {Math.abs(data.plusValuePct).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <View style={styles.kpiHead}>
              <Text style={styles.kpiLabel}>Investi</Text>
              <View style={[styles.kpiIcon, { backgroundColor: colors.fillSoft }]}>
                <Feather name="briefcase" size={12} color={colors.muted} />
              </View>
            </View>
            <Text style={styles.kpiVal}>{fmt(data.investi)}</Text>
          </View>
          <View style={styles.kpi}>
            <View style={styles.kpiHead}>
              <Text style={styles.kpiLabel}>Dividendes</Text>
              <View style={[styles.kpiIcon, { backgroundColor: colors.greenBg }]}>
                <Feather name="gift" size={12} color={colors.green} />
              </View>
            </View>
            <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(data.dividendes)}</Text>
          </View>
          <View style={styles.kpi}>
            <View style={styles.kpiHead}>
              <Text style={styles.kpiLabel}>Liquidités</Text>
              <View style={[styles.kpiIcon, { backgroundColor: colors.blueBg }]}>
                <Feather name="credit-card" size={12} color={colors.blue} />
              </View>
            </View>
            <Text style={styles.kpiVal}>{fmt(data.liquidites)}</Text>
          </View>
        </View>

        <View style={styles.tradeRow}>
          <Tap style={styles.tradePrimary} onPress={() => openTrade("achat")}>
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.tradePrimaryText}>Achat</Text>
          </Tap>
          <Tap style={styles.tradeSecondary} onPress={() => openTrade("vente")}>
            <Feather name="minus" size={15} color={colors.ink} />
            <Text style={styles.tradeSecondaryText}>Vente</Text>
          </Tap>
          <Tap style={styles.tradeSecondary} onPress={() => openTrade("dividende")}>
            <Feather name="gift" size={15} color={colors.ink} />
            <Text style={styles.tradeSecondaryText}>Dividende</Text>
          </Tap>
        </View>

        <View style={[styles.card, styles.trendCard]}>
          <Text style={styles.trendCardTitle}>Évolution du portefeuille</Text>
          <PortfolioChart series={data.series} />
        </View>

        <Text style={styles.sectionTitle}>Positions</Text>
        {data.positions.length ? (
          <View style={styles.card}>
            {data.positions.map((p) => {
              const posUp = p.plusValue >= 0;
              return (
                <View key={p.code} style={styles.posRow}>
                  <View style={styles.posBadge}>
                    <Text style={styles.posBadgeText}>{p.code}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.posNom} numberOfLines={1}>
                      {p.nom}
                    </Text>
                    <Text style={styles.posMeta}>
                      {p.quantite} · PRU {fmt(p.pru)} · Cours {fmt(p.coursActuel)}
                    </Text>
                    <Tap onPress={() => openCoursUpdate(p.code)} style={styles.posCoursBtn}>
                      <Text style={styles.posCoursBtnText}>Mettre à jour le cours</Text>
                    </Tap>
                  </View>
                  {p.priceHistory.length > 1 ? <Sparkline points={p.priceHistory} /> : null}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.posValo}>{fmt(p.valorisation)}</Text>
                    <Text style={[styles.posPl, { color: posUp ? colors.green : colors.red }]}>
                      {posUp ? "+" : "−"}
                      {fmt(Math.abs(p.plusValue))} · {posUp ? "+" : "−"}
                      {Math.abs(p.plusValuePct).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Feather name="trending-up" size={26} color={colors.muted2} />
            <Text style={styles.empty}>Aucune position pour l&apos;instant.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Historique</Text>
        {data.historique.length ? (
          <View style={styles.card}>
            {data.historique.map((o, i) => {
              const rev = o.type === "dividende" || o.type === "vente_titre";
              return (
                <View key={i} style={styles.histRow}>
                  <View style={[styles.histTag, { backgroundColor: rev ? colors.greenBg : colors.fillSoft }]}>
                    <Text style={[styles.histTagText, { color: rev ? colors.green : colors.acier }]}>{OP_LABEL[o.type]}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.histLib} numberOfLines={1}>
                      {o.lib}
                    </Text>
                    <Text style={styles.histMeta}>
                      {o.date} · {o.compte}
                    </Text>
                  </View>
                  <Text style={[styles.histAmt, { color: rev ? colors.green : colors.ink }]}>
                    {rev ? "+" : "−"}
                    {fmt(Math.abs(o.montant))}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Feather name="clock" size={26} color={colors.muted2} />
            <Text style={styles.empty}>Aucune opération boursière pour l&apos;instant.</Text>
          </View>
        )}
      </ScrollView>

      <BourseTradeSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
        onUnauthorized={logout}
        accounts={cashAccounts}
        positions={data.positions}
        activeMonthMm={ops.activeMonthMm}
        initialMode={sheetMode}
        initialCode={sheetCode}
      />
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  hero: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 20, padding: 18 },
  heroLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 28, color: colors.ink, letterSpacing: -1, marginTop: 2, marginBottom: 4 },
  heroUnit: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
  heroPl: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  heroPlText: { fontFamily: fonts.monoBold, fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 12 },
  kpiHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 },
  kpiIcon: { width: 20, height: 20, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  kpiLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
  kpiVal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
  tradeRow: { flexDirection: "row", gap: 8 },
  tradePrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 14, backgroundColor: colors.anthracite },
  tradePrimaryText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: "#fff" },
  tradeSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft },
  tradeSecondaryText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6 },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  trendCard: { padding: 16 },
  trendCardTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 10 },
  emptyWrap: { alignItems: "center", gap: 10, marginTop: 10 },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: "center" },
  posRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  posBadge: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.violetBg, alignItems: "center", justifyContent: "center" },
  posBadgeText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.violet },
  posNom: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  posMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted2, marginTop: 2 },
  posCoursBtn: { alignSelf: "flex-start", marginTop: 6 },
  posCoursBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 10.5, color: colors.violet },
  posValo: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.ink },
  posPl: { fontFamily: fonts.monoBold, fontSize: 12, marginTop: 2 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  histTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  histTagText: { fontFamily: fonts.sansSemiBold, fontSize: 10 },
  histLib: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  histMeta: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginTop: 1 },
  histAmt: { fontFamily: fonts.monoBold, fontSize: 13 },
  });
}
