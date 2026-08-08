import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import BudgetSheet, { type EditableBudget } from "../components/BudgetSheet";
import OverlayScreen, { OverlayActionButton } from "../components/OverlayScreen";
import SegmentedBar from "../components/SegmentedBar";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { currencySymbol } from "../lib/currency";
import { fmt } from "../lib/format";
import { maskAmount, useColors, usePrefs } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";
import { useCountUp } from "../lib/useCountUp";

type BudgetRow = { cat: string; budget: number; spent: number; pct: number; status: "over" | "at" | "ok" };
type BudgetResponse = { monthLabel: string; totals: { budget: number; spent: number; restant: number } | null; rows: BudgetRow[]; unbudgeted: { cat: string; spent: number }[] };

function statusColorFor(colors: ThemeColors): Record<BudgetRow["status"], string> {
  return { ok: colors.green, at: colors.amber, over: colors.red };
}
const STATUS_LABEL: Record<BudgetRow["status"], string> = { ok: "OK", at: "Limite", over: "Dépassé" };
function statusBgFor(colors: ThemeColors): Record<BudgetRow["status"], string> {
  return { ok: colors.greenBg, at: colors.amberBg, over: colors.redBg };
}

export default function BudgetScreen() {
  const { logout } = useAuth();
  const { hideAmounts } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_COLOR = useMemo(() => statusColorFor(colors), [colors]);
  const STATUS_BG = useMemo(() => statusBgFor(colors), [colors]);
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EditableBudget | null>(null);
  const displayBudget = useCountUp(data?.totals?.budget ?? 0);
  const displaySpent = useCountUp(data?.totals?.spent ?? 0);
  const displayRestant = useCountUp(Math.abs(data?.totals?.restant ?? 0));

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/budget");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger le budget.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(r: BudgetRow) {
    setEditing({ cat: r.cat, budget: r.budget });
    setSheetOpen(true);
  }

  if (error) {
    return (
      <OverlayScreen title="Budget">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data) {
    return (
      <OverlayScreen title="Budget">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  return (
    <OverlayScreen title="Budget" action={<OverlayActionButton label="Budget" onPress={openNew} />}>
      <ScrollView contentContainerStyle={styles.content}>
        {data.totals ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.fillSoft }]}>
                <Feather name="target" size={13} color={colors.muted} />
              </View>
              <Text style={styles.kpiLabel}>Budget total</Text>
              <Text style={styles.kpiVal}>{maskAmount(fmt(displayBudget), hideAmounts)}</Text>
            </View>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.redBg }]}>
                <Feather name="arrow-down" size={13} color={colors.red} />
              </View>
              <Text style={styles.kpiLabel}>Dépensé</Text>
              <Text style={[styles.kpiVal, { color: colors.red }]}>{maskAmount(fmt(displaySpent), hideAmounts)}</Text>
            </View>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: data.totals.restant < 0 ? colors.redBg : colors.greenBg }]}>
                <Feather name={data.totals.restant < 0 ? "alert-triangle" : "check"} size={13} color={data.totals.restant < 0 ? colors.red : colors.green} />
              </View>
              <Text style={styles.kpiLabel}>{data.totals.restant < 0 ? "Dépassement" : "Restant"}</Text>
              <Text style={[styles.kpiVal, { color: data.totals.restant < 0 ? colors.red : colors.green }]}>{maskAmount(fmt(displayRestant), hideAmounts)}</Text>
            </View>
          </View>
        ) : null}

        {data.rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="pie-chart" size={26} color={colors.muted2} />
            <Text style={styles.empty}>Aucun budget défini pour l&apos;instant. Touchez « + Budget » pour en créer un.</Text>
          </View>
        ) : (
          data.rows.map((r) => (
            <Tap key={r.cat} style={styles.row} onPress={() => openEdit(r)}>
              <View style={styles.rowHead}>
                <View style={styles.rowHeadLeft}>
                  <Text style={styles.rowCat}>{r.cat}</Text>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_BG[r.status] }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
                  </View>
                </View>
                <Text style={[styles.rowPct, { color: STATUS_COLOR[r.status] }]}>{r.pct.toFixed(0)}%</Text>
              </View>
              <View style={{ marginBottom: 9 }}>
                <SegmentedBar pct={r.pct} color={STATUS_COLOR[r.status]} />
              </View>
              <Text style={styles.rowAmt}>
                <Text style={{ fontWeight: "700", color: STATUS_COLOR[r.status] }}>{maskAmount(fmt(r.spent), hideAmounts)}</Text>
                <Text style={{ color: colors.muted2 }}>
                  {" "}
                  / {fmt(r.budget)} {currencySymbol()}
                </Text>
              </Text>
            </Tap>
          ))
        )}

        {data.unbudgeted.length ? (
          <View>
            <Text style={styles.sectionTitle}>Dépenses sans budget</Text>
            <View style={styles.unbudgetedCard}>
              {data.unbudgeted.map((u) => (
                <View key={u.cat} style={styles.unbudgetedRow}>
                  <Text style={styles.unbudgetedCat}>{u.cat}</Text>
                  <Text style={styles.unbudgetedAmt}>{maskAmount(fmt(u.spent), hideAmounts)}</Text>
                  <Tap
                    onPress={() => {
                      setEditing({ cat: u.cat, budget: 0 });
                      setSheetOpen(true);
                    }}
                  >
                    <Text style={styles.unbudgetedDefine}>Définir</Text>
                  </Tap>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BudgetSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
        onUnauthorized={logout}
        editing={editing}
      />
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 13 },
  kpiIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginBottom: 5 },
  kpiVal: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink },
  emptyWrap: { alignItems: "center", gap: 10, marginTop: 24 },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: "center" },
  row: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14 },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  rowHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowCat: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontFamily: fonts.sansSemiBold, fontSize: 10 },
  rowPct: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.muted2 },
  rowAmt: { fontFamily: fonts.mono, fontSize: 13, color: colors.ink },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6 },
  unbudgetedCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  unbudgetedRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  unbudgetedCat: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  unbudgetedAmt: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink },
  unbudgetedDefine: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.orange },
  });
}
