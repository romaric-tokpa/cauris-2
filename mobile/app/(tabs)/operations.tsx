import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../../components/Chip";
import OfflineBanner from "../../components/OfflineBanner";
import OperationSheet, { type EditableOperation } from "../../components/OperationSheet";
import ScreenFade from "../../components/ScreenFade";
import Tap from "../../components/Tap";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { fmt } from "../../lib/format";
import { cacheGet, cacheSet } from "../../lib/offlineCache";
import { getQueue, useQueueLength, type QueuedOperation } from "../../lib/offlineQueue";
import { maskAmount, useColors, usePrefs } from "../../lib/prefs";
import { fonts, type ThemeColors } from "../../lib/theme";

type OperationEntry = {
  id: string;
  isNew: boolean;
  date?: string;
  lib?: string;
  type: "dépense" | "revenu" | "virement" | "achat_titre" | "dividende" | "vente_titre";
  compte: string;
  compteDest?: string;
  cat?: string;
  montant: number;
  note?: string;
  pendingSync?: boolean;
};

/** Traduit la file d'opérations hors ligne dans le même format que le journal, pour un affichage fusionné. */
function queueToEntries(queue: QueuedOperation[]): OperationEntry[] {
  return queue.map((q) => {
    const type = (q.body.type as OperationEntry["type"]) ?? "dépense";
    const montant = Math.abs(Number(q.body.montant) || 0);
    return {
      id: q.id,
      isNew: true,
      date: q.body.date ? String(q.body.date) : undefined,
      lib: q.body.lib ? String(q.body.lib) : undefined,
      type,
      compte: String(q.body.compte ?? ""),
      compteDest: q.body.compteDest ? String(q.body.compteDest) : undefined,
      cat: q.body.cat ? String(q.body.cat) : undefined,
      montant: type === "dépense" ? -montant : montant,
      pendingSync: true,
    };
  });
}

type OperationsFeedResponse = {
  cycleLabel: string;
  activeMonthMm: string;
  accounts: { nom: string; type: string }[];
  operations: OperationEntry[];
};

type Filter = "Tous" | "Dépenses" | "Revenus" | "Virements" | "Titres";
const FILTERS: Filter[] = ["Tous", "Dépenses", "Revenus", "Virements", "Titres"];

function kindOf(type: OperationEntry["type"]): Exclude<Filter, "Tous"> {
  if (type === "dépense") return "Dépenses";
  if (type === "revenu") return "Revenus";
  if (type === "virement") return "Virements";
  return "Titres";
}

function kindStyleFor(colors: ThemeColors): Record<Exclude<Filter, "Tous">, { bg: string; c: string; icon: keyof typeof Feather.glyphMap }> {
  return {
    Dépenses: { bg: colors.redBg, c: colors.red, icon: "arrow-down" },
    Revenus: { bg: colors.greenBg, c: colors.green, icon: "arrow-up" },
    Virements: { bg: colors.fillSoft, c: colors.ink, icon: "repeat" },
    Titres: { bg: colors.violetBg, c: colors.violet, icon: "trending-up" },
  };
}

export default function OperationsScreen() {
  const { logout } = useAuth();
  const { hideAmounts } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const KIND_STYLE = useMemo(() => kindStyleFor(colors), [colors]);
  const [data, setData] = useState<OperationsFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("Tous");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EditableOperation | null>(null);
  const queueLength = useQueueLength();

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/operations");
      const json: OperationsFeedResponse = await res.json();
      setData(json);
      setError(null);
      cacheSet("operations", json);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      const cached = await cacheGet<OperationsFeedResponse>("operations");
      if (cached) {
        setData(cached);
        setError(null);
      } else {
        setError("Impossible de charger le journal — connecte-toi au moins une fois pour pouvoir travailler hors ligne.");
      }
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Rejoue le chargement quand la file d'attente change (mise en file hors ligne, ou synchronisation réussie en arrière-plan) pour refléter l'état réel dès que possible.
  useEffect(() => {
    load();
  }, [queueLength, load]);

  const allOperations = useMemo(() => [...queueToEntries(getQueue()), ...(data?.operations ?? [])], [data, queueLength]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allOperations.filter((o) => {
      if (filter !== "Tous" && kindOf(o.type) !== filter) return false;
      if (!q) return true;
      return [o.lib, o.compte, o.compteDest, o.cat, o.note].some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [allOperations, search, filter]);

  const groups = useMemo(() => {
    const byDay = new Map<string, OperationEntry[]>();
    filtered.forEach((o) => {
      const day = o.date || "—";
      const existing = byDay.get(day);
      if (existing) existing.push(o);
      else byDay.set(day, [o]);
    });
    return Array.from(byDay.entries()).map(([day, ops]) => ({ day, ops }));
  }, [filtered]);

  const depTotal = filtered.filter((o) => o.type === "dépense").reduce((s, o) => s + Math.abs(o.montant), 0);
  const revTotal = filtered.filter((o) => o.type === "revenu" || o.type === "dividende" || o.type === "vente_titre").reduce((s, o) => s + Math.abs(o.montant), 0);

  function handleSaved() {
    setSheetOpen(false);
    setEditing(null);
    load();
  }

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(o: OperationEntry) {
    if (o.type !== "dépense" && o.type !== "revenu" && o.type !== "virement") return;
    setEditing({ id: o.id, date: o.date, lib: o.lib, type: o.type, compte: o.compte, compteDest: o.compteDest, cat: o.cat, montant: o.montant });
    setSheetOpen(true);
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenFade>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Opérations</Text>
        <Tap style={styles.addBtn} onPress={openNew}>
          <Feather name="plus" size={20} color="#fff" />
        </Tap>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 10 }}>
        <OfflineBanner />
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={colors.muted2} />
        <TextInput
          style={styles.search}
          placeholder="Rechercher une opération…"
          placeholderTextColor={colors.muted2}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} accent={colors.orange} />
        ))}
      </ScrollView>

      <View style={styles.totalsRow}>
        <Text style={styles.totalDep}>−{maskAmount(fmt(depTotal), hideAmounts)}</Text>
        <Text style={styles.totalRev}>+{maskAmount(fmt(revTotal), hideAmounts)}</Text>
        <Text style={styles.totalCount}>{filtered.length} opérations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groups.length === 0 ? (
          <Text style={styles.empty}>Aucune opération pour ce filtre.</Text>
        ) : (
          groups.map((g) => (
            <View key={g.day} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDay}>{g.day}</Text>
                <Text style={styles.groupCount}>{g.ops.length} op.</Text>
              </View>
              <View style={styles.groupCard}>
                {g.ops.map((op) => {
                  const kind = kindOf(op.type);
                  const st = KIND_STYLE[kind];
                  const editable = !op.pendingSync && (op.type === "dépense" || op.type === "revenu" || op.type === "virement");
                  return (
                    <Tap key={op.id} style={[styles.opRow, op.pendingSync && styles.opRowPending]} onPress={() => openEdit(op)} disabled={!editable}>
                      <View style={[styles.opIcon, { backgroundColor: st.bg }]}>
                        <Feather name={st.icon} size={16} color={st.c} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.opLibRow}>
                          <Text style={styles.opLib} numberOfLines={1}>
                            {op.lib}
                          </Text>
                          {op.pendingSync ? (
                            <View style={styles.pendingBadge}>
                              <Feather name="clock" size={9} color={colors.orange} />
                              <Text style={styles.pendingBadgeText}>en attente</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.opMeta} numberOfLines={1}>
                          {op.compte}
                          {op.compteDest ? ` → ${op.compteDest}` : ""}
                          {op.cat ? ` · ${op.cat}` : ""}
                        </Text>
                      </View>
                      <Text style={[styles.opAmt, { color: op.montant >= 0 ? colors.green : colors.red }]}>
                        {op.montant >= 0 ? "+" : "−"}
                        {maskAmount(fmt(Math.abs(op.montant)), hideAmounts)}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <OperationSheet
        visible={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
        onUnauthorized={logout}
        accounts={data.accounts}
        activeMonthMm={data.activeMonthMm}
        editing={editing}
      />
      </ScreenFade>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screenBg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 6 },
  title: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  addBtn: { width: 42, height: 42, borderRadius: 999, backgroundColor: colors.anthracite, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  search: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  filters: { marginTop: 12, flexGrow: 0, height: 40 },
  filtersContent: { paddingHorizontal: 20, alignItems: "center" },
  totalsRow: { flexDirection: "row", gap: 14, paddingHorizontal: 20, marginTop: 10, alignItems: "baseline" },
  totalDep: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.red },
  totalRev: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.green },
  totalCount: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontFamily: fonts.sans, fontSize: 13 },
  group: { marginBottom: 18 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingHorizontal: 2 },
  groupDay: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  groupCount: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted2 },
  groupCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  opRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  opRowPending: { backgroundColor: colors.amberBg },
  opIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  opLibRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  opLib: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  pendingBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 9, color: colors.orange },
  opMeta: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 2 },
  opAmt: { fontFamily: fonts.monoBold, fontSize: 15 },
  });
}
