import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotificationsSheet from "../../components/NotificationsSheet";
import OperationSheet from "../../components/OperationSheet";
import PulseDot from "../../components/PulseDot";
import ScreenFade from "../../components/ScreenFade";
import MultiSegmentedBar from "../../components/MultiSegmentedBar";
import SegmentedBar from "../../components/SegmentedBar";
import Tap from "../../components/Tap";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { currencySymbol } from "../../lib/currency";
import { fmt } from "../../lib/format";
import { fetchNotifications } from "../../lib/notifications";
import { maskAmount, useColors, usePrefs } from "../../lib/prefs";
import { useProfilePhoto } from "../../lib/ProfileContext";
import { coffreColorsFor, fonts, type ThemeColors } from "../../lib/theme";
import { useCountUp } from "../../lib/useCountUp";

type DashboardResponse = {
  monthLabel: string;
  kpis: { disponible: number };
  accountGroups: { title: string; subtotal: number; pctOfPatrimoine: number; accounts: { nom: string; solde: number; note?: string }[] }[];
};
type CoffreItem = { nom: string; epargne: number; objectif: number; pct: number };
type CoffresResponse = { coffres: CoffreItem[] };
type OperationsFeedResponse = { activeMonthMm: string; accounts: { nom: string; type: string }[] };

type Action = { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void };

export default function AccueilScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const { hideAmounts, toggleHideAmounts } = usePrefs();
  const { photo } = useProfilePhoto();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const coffreColors = useMemo(() => coffreColorsFor(colors), [colors]);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [coffres, setCoffres] = useState<CoffresResponse | null>(null);
  const [ops, setOps] = useState<OperationsFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"dépense" | "revenu" | "virement">("dépense");
  const displayBalance = useCountUp(dashboard?.kpis.disponible ?? 0);

  const load = useCallback(async () => {
    try {
      const [dRes, cRes, oRes] = await Promise.all([apiFetch("/api/dashboard"), apiFetch("/api/coffres"), apiFetch("/api/operations")]);
      setDashboard(await dRes.json());
      setCoffres(await cRes.json());
      setOps(await oRes.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger les données.");
    }
    fetchNotifications()
      .then((n) => setNotifCount(n.length))
      .catch(() => setNotifCount(0));
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

  function openSheet(type: "dépense" | "revenu" | "virement") {
    setSheetType(type);
    setSheetOpen(true);
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.bodyText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!dashboard || !coffres || !ops) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.anthracite} />
      </SafeAreaView>
    );
  }

  const actions: Action[] = [
    { label: "Dépense", icon: "arrow-down", onPress: () => openSheet("dépense") },
    { label: "Revenu", icon: "arrow-up", onPress: () => openSheet("revenu") },
    { label: "Virement", icon: "repeat", onPress: () => openSheet("virement") },
    { label: "Coffres", icon: "lock", onPress: () => router.push("/coffres") },
    { label: "Bourse", icon: "trending-up", onPress: () => router.push("/bourse") },
    { label: "Budget", icon: "pie-chart", onPress: () => router.push("/budget") },
    { label: "Prêt", icon: "credit-card", onPress: () => router.push("/pret") },
    { label: "Analyse", icon: "bar-chart-2", onPress: () => router.push("/analyse") },
  ];

  const dispoGroup = dashboard.accountGroups.find((g) => g.title === "Comptes disponibles");
  const dispoAccounts = dispoGroup ? [...dispoGroup.accounts].sort((a, b) => b.solde - a.solde) : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenFade>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.anthracite} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              {photo ? <Image source={{ uri: photo }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>RT</Text>}
            </View>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.name}>Romaric</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Tap style={styles.cyclePill} onPress={() => router.push("/plus")}>
              <PulseDot size={8} />
              <View>
                <Text style={styles.cycleLabelSmall}>Cycle actif</Text>
                <Text style={styles.cycleLabel}>{dashboard.monthLabel}</Text>
              </View>
            </Tap>
            <Tap style={styles.bellBtn} onPress={() => setNotifOpen(true)}>
              <Feather name="bell" size={18} color={colors.ink} />
              {notifCount > 0 ? (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notifCount}</Text>
                </View>
              ) : null}
            </Tap>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Pressable style={styles.balanceToggle} onPress={toggleHideAmounts}>
            <Text style={styles.balanceLabel}>Comptes disponibles</Text>
            <Feather name={hideAmounts ? "eye-off" : "eye"} size={15} color={colors.muted} />
          </Pressable>
          <Text style={styles.balanceValue}>
            {maskAmount(fmt(displayBalance), hideAmounts)} <Text style={styles.balanceUnit}>{currencySymbol()}</Text>
          </Text>

          {dispoAccounts.length ? (
            <View style={styles.compositionWrap}>
              <MultiSegmentedBar parts={dispoAccounts.map((a, i) => ({ value: a.solde, color: coffreColors[i % coffreColors.length] }))} />
              <View style={styles.compositionList}>
                {dispoAccounts.map((a, i) => (
                  <View key={a.nom} style={styles.compositionRow}>
                    <View style={styles.compositionLeft}>
                      <View style={[styles.compositionDot, { backgroundColor: coffreColors[i % coffreColors.length] }]} />
                      <Text style={styles.compositionNom} numberOfLines={1}>
                        {a.nom}
                      </Text>
                    </View>
                    <Text style={styles.compositionVal}>{maskAmount(fmt(a.solde), hideAmounts)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Coffres actifs</Text>
            <Pressable onPress={() => router.push("/coffres")}>
              <Text style={styles.sectionLink}>Voir tout</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coffresScroll} contentContainerStyle={styles.coffresContent}>
            {coffres.coffres.map((c, i) => (
              <Tap key={c.nom} style={styles.coffreCard} onPress={() => router.push("/coffres")}>
                <Text style={styles.coffreNom} numberOfLines={1}>
                  {c.nom}
                </Text>
                <View style={styles.coffreValRow}>
                  <Text style={styles.coffreVal} numberOfLines={1}>
                    <Text style={{ fontWeight: "700" }}>{maskAmount(fmt(c.epargne), hideAmounts)}</Text>
                    <Text style={styles.coffreValMuted}> / {fmt(c.objectif)}</Text>
                  </Text>
                  <Text style={styles.coffrePct} numberOfLines={1}>
                    {c.pct.toFixed(0)}%
                  </Text>
                </View>
                <SegmentedBar pct={c.pct} color={coffreColors[i % coffreColors.length]} />
              </Tap>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            {actions.map((a) => (
              <Tap key={a.label} style={styles.actionItem} onPress={a.onPress}>
                <View style={styles.actionIcon}>
                  <Feather name={a.icon} size={20} color={colors.ink} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Tap>
            ))}
          </View>
        </View>
      </ScrollView>
      </ScreenFade>

      <OperationSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
        onUnauthorized={logout}
        accounts={ops.accounts}
        activeMonthMm={ops.activeMonthMm}
        editing={null}
        initialType={sheetType}
      />
      <NotificationsSheet
        visible={notifOpen}
        onClose={() => {
          setNotifOpen(false);
          fetchNotifications()
            .then((n) => setNotifCount(n.length))
            .catch(() => {});
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screenBg },
  bodyText: { fontFamily: fonts.sans, color: colors.ink },
  content: { padding: 20, paddingTop: 8, gap: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  identity: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 50, height: 50, borderRadius: 999, backgroundColor: colors.anthracite, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 15, color: "#fff" },
  avatarImg: { width: 50, height: 50 },
  greeting: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.muted },
  name: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cyclePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  pulseDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.green },
  cycleLabelSmall: { fontFamily: fonts.sans, fontSize: 9, color: colors.muted2, textTransform: "uppercase", letterSpacing: 0.5 },
  cycleLabel: { fontFamily: fonts.monoBold, fontSize: 12, color: colors.ink },
  bellBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  notifBadge: {
    position: "absolute",
    top: 5,
    right: 6,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.screenBg,
  },
  notifBadgeText: { fontFamily: fonts.monoBold, fontSize: 10, color: "#fff" },
  balanceCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 26, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  balanceToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  balanceLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.muted },
  balanceValue: { fontFamily: fonts.monoBold, fontSize: 38, color: colors.ink, textAlign: "center", letterSpacing: -1.5, marginTop: 8, marginBottom: 18 },
  balanceUnit: { fontFamily: fonts.sans, fontSize: 20, color: colors.muted },
  compositionWrap: { gap: 12 },
  compositionList: { gap: 9 },
  compositionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  compositionLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  compositionDot: { width: 8, height: 8, borderRadius: 4 },
  compositionNom: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  compositionVal: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink },
  sectionLink: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.orange },
  coffresScroll: { marginHorizontal: -20 },
  coffresContent: { paddingHorizontal: 20, gap: 12 },
  coffreCard: { minWidth: 210, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 20, padding: 16 },
  coffreNom: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  coffreValRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 6, marginBottom: 12 },
  coffreVal: { fontFamily: fonts.mono, fontSize: 15, color: colors.ink, flexShrink: 1 },
  coffreValMuted: { color: colors.muted2 },
  coffrePct: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.muted },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.fillSoft, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 6 },
  actionItem: { width: "25%", alignItems: "center", gap: 8, marginBottom: 10 },
  actionIcon: { width: 54, height: 54, borderRadius: 999, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.ink, textAlign: "center" },
  });
}
