import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountLogo from "../../components/AccountLogo";
import AccountSheet from "../../components/AccountSheet";
import MultiSegmentedBar from "../../components/MultiSegmentedBar";
import ScreenFade from "../../components/ScreenFade";
import Tap from "../../components/Tap";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { currencySymbol } from "../../lib/currency";
import { fmt } from "../../lib/format";
import { maskAmount, useColors, usePrefs } from "../../lib/prefs";
import { fonts, type ThemeColors } from "../../lib/theme";
import { useCountUp } from "../../lib/useCountUp";

type DashboardResponse = {
  kpis: { patrimoine: number; disponible: number; coffres: number; bloque: number; placement: number };
  accountGroups: { title: string; subtotal: number; pctOfPatrimoine: number; accounts: { nom: string; solde: number; note?: string }[] }[];
};

type RepartIcon = keyof typeof Feather.glyphMap;

function repartFor(colors: ThemeColors): { title: string; label: string; icon: RepartIcon; color: string; key: keyof DashboardResponse["kpis"] }[] {
  return [
    { title: "Comptes disponibles", label: "Disponible", icon: "credit-card", color: colors.orange, key: "disponible" },
    { title: "Coffres (épargne accessible)", label: "Coffres", icon: "archive", color: colors.blue, key: "coffres" },
    { title: "Épargne bloquée", label: "Épargne bloquée", icon: "lock", color: colors.acier, key: "bloque" },
    { title: "Placements", label: "Placements", icon: "trending-up", color: colors.violet, key: "placement" },
  ];
}

function groupAccentFor(colors: ThemeColors): Record<string, string> {
  return {
    "Comptes disponibles": colors.orange,
    "Coffres (épargne accessible)": colors.blue,
    "Épargne bloquée": colors.acier,
    Placements: colors.violet,
  };
}

const GROUP_ICON: Record<string, RepartIcon> = {
  "Comptes disponibles": "credit-card",
  "Coffres (épargne accessible)": "archive",
  "Épargne bloquée": "lock",
  Placements: "trending-up",
};

const GROUP_TYPE: Record<string, string> = {
  "Comptes disponibles": "disponible",
  Placements: "placement",
};

function typeForGroup(title: string): string {
  return GROUP_TYPE[title] ?? "épargne";
}

export default function PatrimoineScreen() {
  const { logout } = useAuth();
  const { hideAmounts, toggleHideAmounts } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const REPART = useMemo(() => repartFor(colors), [colors]);
  const GROUP_ACCENT = useMemo(() => groupAccentFor(colors), [colors]);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const displayPatrimoine = useCountUp(data?.kpis.patrimoine ?? 0);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/dashboard");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger le patrimoine.");
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={{ fontFamily: fonts.sans, color: colors.ink }}>{error}</Text>
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.anthracite} />
      </SafeAreaView>
    );
  }

  const { kpis, accountGroups } = data;
  const parts = REPART.map((r) => ({ ...r, val: kpis[r.key], pct: kpis.patrimoine > 0 ? Math.round((kpis[r.key] / kpis.patrimoine) * 100) : 0 })).filter((r) => r.val > 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenFade>
      <View style={styles.header}>
        <Text style={styles.title}>Patrimoine</Text>
        <Tap style={styles.addBtn} onPress={() => setSheetOpen(true)}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Compte</Text>
        </Tap>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.anthracite} />}
      >
        <View style={styles.hero}>
          <Tap style={styles.heroToggle} onPress={toggleHideAmounts}>
            <Text style={styles.heroLabel}>Patrimoine total</Text>
            <Feather name={hideAmounts ? "eye-off" : "eye"} size={14} color={colors.muted2} />
          </Tap>
          <Text style={styles.heroValue}>
            {maskAmount(fmt(displayPatrimoine), hideAmounts)} <Text style={styles.heroUnit}>{currencySymbol()}</Text>
          </Text>
          <MultiSegmentedBar parts={parts.map((p) => ({ value: p.val, color: p.color }))} />
        </View>

        <View style={styles.repartGrid}>
          {parts.map((p) => (
            <View key={p.key} style={styles.repartTile}>
              <View style={[styles.repartIcon, { backgroundColor: p.color + "1A" }]}>
                <Feather name={p.icon} size={14} color={p.color} />
              </View>
              <View style={styles.repartTileBody}>
                <View style={styles.repartTileHead}>
                  <Text style={styles.repartLabel}>{p.label}</Text>
                  <Text style={styles.repartPct}>{p.pct}%</Text>
                </View>
                <Text style={styles.repartVal}>{maskAmount(fmt(p.val), hideAmounts)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Comptes</Text>
        {accountGroups.map((g) => (
          <View key={g.title} style={styles.acctGroup}>
            <View style={styles.acctGroupHead}>
              <View style={[styles.acctGroupIcon, { backgroundColor: (GROUP_ACCENT[g.title] ?? colors.acier) + "1A" }]}>
                <Feather name={GROUP_ICON[g.title] ?? "circle"} size={13} color={GROUP_ACCENT[g.title] ?? colors.acier} />
              </View>
              <Text style={styles.acctGroupTitle}>{g.title}</Text>
              <Text style={styles.acctGroupTotal}>
                {maskAmount(fmt(g.subtotal), hideAmounts)} {currencySymbol()}
              </Text>
            </View>
            {g.accounts.map((a) => (
              <View key={a.nom} style={styles.acctRow}>
                <AccountLogo nom={a.nom} type={typeForGroup(g.title)} size={36} />
                <Text style={styles.acctNom} numberOfLines={1}>
                  {a.nom}
                </Text>
                <Text style={[styles.acctSolde, a.solde < 0 && { color: colors.red }]}>{maskAmount(fmt(a.solde), hideAmounts)}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <AccountSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
        onUnauthorized={logout}
      />
      </ScreenFade>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screenBg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  title: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.anthracite, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: "#fff" },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  hero: { backgroundColor: colors.anthracite, borderRadius: 24, padding: 22 },
  heroToggle: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start" },
  heroLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted2 },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 34, color: "#fff", letterSpacing: -1, marginTop: 6, marginBottom: 18 },
  heroUnit: { fontFamily: fonts.sans, fontSize: 17, color: colors.muted2 },
  repartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  repartTile: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 16,
    padding: 13,
  },
  repartIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  repartTileBody: { flex: 1, minWidth: 0 },
  repartTileHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 3 },
  repartLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  repartPct: { fontFamily: fonts.monoBold, fontSize: 11, color: colors.muted2 },
  repartVal: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.ink },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginTop: 4 },
  acctGroup: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  acctGroupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.fillSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineSoft,
  },
  acctGroupIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  acctGroupTitle: { flex: 1, fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink },
  acctGroupTotal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.muted },
  acctRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
  acctNom: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  acctSolde: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.ink },
  });
}
