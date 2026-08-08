import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Chip from "../components/Chip";
import { ChipScroller } from "../components/FormField";
import OverlayScreen from "../components/OverlayScreen";
import RingProgress from "../components/RingProgress";
import SegmentedBar from "../components/SegmentedBar";
import Sheet from "../components/Sheet";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { currencySymbol } from "../lib/currency";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";
import { useCountUp } from "../lib/useCountUp";

type Cat = { label: string; value: number };
type PilotMonth = { id: string; label: string; isActive: boolean; revenu: number; depense: number; net: number; tauxPct: number; depCategories: Cat[]; revCategories: Cat[] };
type PilotResponse = { months: PilotMonth[] };
type CoffresResponse = { coffres: { nom: string; pct: number }[] };

type AnnualMonth = { mm: string; monthName: string; label: string; hasData: boolean; revenu: number; depense: number; net: number; tauxPct: number; epargneFin: number };
type AnnualCat = { label: string; value: number; pct: number };
type AnnualResponse = {
  year: number;
  availableYears: number[];
  months: AnnualMonth[];
  totals: { revenu: number; depense: number; net: number; tauxPct: number };
  epargne: { totale: number; debutAnnee: number; croissance: number; tauxPct: number };
  bourse: { achatsAnnee: number; ventesAnnee: number; dividendesAnnee: number; valorisationActuelle: number; investiActuel: number; plusValueLatente: number; plusValuePct: number };
  depCategories: AnnualCat[];
  revCategories: AnnualCat[];
  bestMonth: AnnualMonth | null;
  worstMonth: AnnualMonth | null;
  monthsWithData: number;
};

const MOIS_ABBR: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aoû",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
};

function NoData({ colors, styles }: { colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.emptyWrap}>
      <Feather name="bar-chart-2" size={20} color={colors.muted} />
      <Text style={styles.empty}>Aucune donnée.</Text>
    </View>
  );
}

function AnnualBars({ items, color, colors, styles }: { items: AnnualCat[]; color: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  if (!items.length) return <NoData colors={colors} styles={styles} />;
  const max = items[0].value;
  return (
    <View style={{ gap: 12 }}>
      {items.map((c) => (
        <View key={c.label}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={styles.barVal}>
              {fmt(c.value)} <Text style={styles.barPct}>· {c.pct}%</Text>
            </Text>
          </View>
          <SegmentedBar pct={(c.value / max) * 100} color={color} />
        </View>
      ))}
    </View>
  );
}

function Bars({ items, color, colors, styles }: { items: Cat[]; color: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  if (!items.length) return <NoData colors={colors} styles={styles} />;
  const max = items[0].value;
  return (
    <View style={{ gap: 12 }}>
      {items.map((c) => (
        <View key={c.label}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={styles.barVal}>{fmt(c.value)}</Text>
          </View>
          <SegmentedBar pct={(c.value / max) * 100} color={color} />
        </View>
      ))}
    </View>
  );
}

export default function AnalyseScreen() {
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<"mois" | "annee">("mois");
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pilot, setPilot] = useState<PilotResponse | null>(null);
  const [coffres, setCoffres] = useState<CoffresResponse | null>(null);
  const [annual, setAnnual] = useState<AnnualResponse | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([apiFetch("/api/pilot"), apiFetch("/api/coffres")]);
      setPilot(await pRes.json());
      setCoffres(await cRes.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger l'analyse.");
    }
  }, [logout]);

  const loadAnnual = useCallback(
    async (y?: number) => {
      try {
        const res = await apiFetch(y != null ? `/api/analyse/annuel?year=${y}` : "/api/analyse/annuel");
        const d: AnnualResponse = await res.json();
        setAnnual(d);
        setYear(d.year);
        setError(null);
      } catch (e) {
        if (e instanceof UnauthorizedError) return logout();
        setError("Impossible de charger l'analyse annuelle.");
      }
    },
    [logout],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (mode === "annee" && !annual) loadAnnual();
  }, [mode, annual, loadAnnual]);

  function selectYear(y: number) {
    setYear(y);
    setAnnual(null);
    loadAnnual(y);
  }

  const fallbackId = (pilot?.months.find((m) => m.isActive) ?? pilot?.months[pilot.months.length - 1])?.id;
  const effectiveMonthId = selectedMonthId ?? fallbackId;
  const active = pilot?.months.find((m) => m.id === effectiveMonthId) ?? pilot?.months[pilot.months.length - 1];
  const displayRevenu = useCountUp(active?.revenu ?? 0);
  const displayDepense = useCountUp(active?.depense ?? 0);
  const displayNet = useCountUp(Math.abs(active?.net ?? 0));

  if (error) {
    return (
      <OverlayScreen title="Analyse">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!pilot || !coffres) {
    return (
      <OverlayScreen title="Analyse">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  const monthsDesc = [...pilot.months].reverse();
  const trend = pilot.months.slice(-4);
  const maxTrend = Math.max(...trend.map((m) => Math.abs(m.net)), 1);
  const urgence = coffres.coffres.find((c) => c.nom.toLowerCase().includes("urgence"));

  return (
    <OverlayScreen title="Analyse">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.modeRow}>
          <Tap
            style={[styles.modeDropdown, mode === "mois" && styles.modeDropdownActive]}
            onPress={() => {
              setMode("mois");
              setMonthPickerOpen(true);
            }}
          >
            <Text style={[styles.modeDropdownText, mode === "mois" && styles.modeDropdownTextActive]} numberOfLines={1}>
              {effectiveMonthId === fallbackId ? "Ce mois" : (pilot.months.find((m) => m.id === effectiveMonthId)?.label ?? "Ce mois")}
            </Text>
            <Feather name="chevron-down" size={14} color={mode === "mois" ? "#fff" : colors.muted} />
          </Tap>
          <Chip label="Bilan annuel" active={mode === "annee"} onPress={() => setMode("annee")} />
        </View>

        {mode === "mois" ? (
          <>
            <View style={styles.kpiGrid}>
              <View style={styles.kpi}>
                <View style={styles.kpiHead}>
                  <Text style={styles.kpiLabel}>Revenus</Text>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.greenBg }]}>
                    <Feather name="arrow-up" size={12} color={colors.green} />
                  </View>
                </View>
                <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(displayRevenu)}</Text>
              </View>
              <View style={styles.kpi}>
                <View style={styles.kpiHead}>
                  <Text style={styles.kpiLabel}>Dépenses</Text>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.redBg }]}>
                    <Feather name="arrow-down" size={12} color={colors.red} />
                  </View>
                </View>
                <Text style={[styles.kpiVal, { color: colors.red }]}>{fmt(displayDepense)}</Text>
              </View>
              <View style={styles.kpi}>
                <View style={styles.kpiHead}>
                  <Text style={styles.kpiLabel}>Épargne nette</Text>
                  <View style={[styles.kpiIcon, { backgroundColor: (active?.net ?? 0) >= 0 ? colors.greenBg : colors.redBg }]}>
                    <Feather name="activity" size={12} color={(active?.net ?? 0) >= 0 ? colors.green : colors.red} />
                  </View>
                </View>
                <Text style={[styles.kpiVal, { color: (active?.net ?? 0) >= 0 ? colors.ink : colors.red }]}>
                  {(active?.net ?? 0) >= 0 ? "+" : "−"}
                  {fmt(displayNet)}
                </Text>
              </View>
              <View style={styles.kpi}>
                <View style={styles.kpiHead}>
                  <Text style={styles.kpiLabel}>Taux d&apos;épargne</Text>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.greenBg }]}>
                    <Feather name="percent" size={12} color={colors.green} />
                  </View>
                </View>
                <Text style={[styles.kpiVal, { color: colors.green }]}>{(active?.tauxPct ?? 0).toFixed(0)}%</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.fraisCard}>
                <Text style={styles.kpiLabel}>Frais du mois</Text>
                <Text style={[styles.kpiVal, { fontSize: 19, color: colors.red }]}>
                  {fmt(active?.depCategories.find((c) => c.label === "Frais")?.value ?? 0)} {currencySymbol()}
                </Text>
              </View>
              {urgence ? (
                <View style={styles.urgenceCard}>
                  <Text style={styles.kpiLabel}>Fonds d&apos;urgence</Text>
                  <RingProgress pct={urgence.pct} color={colors.orange} size={50} />
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top dépenses par catégorie</Text>
              <Bars items={active?.depCategories ?? []} color={colors.red} colors={colors} styles={styles} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top revenus par source</Text>
              <Bars items={active?.revCategories ?? []} color={colors.green} colors={colors} styles={styles} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Épargne nette · {trend.length} mois</Text>
              <View style={styles.trendRow}>
                {trend.map((m) => (
                  <Tap key={m.id} style={styles.trendCol} onPress={() => setSelectedMonthId(m.id)}>
                    <View style={[styles.trendBar, { height: Math.max((Math.abs(m.net) / maxTrend) * 74, 6), backgroundColor: m.id === effectiveMonthId ? colors.orange : colors.anthracite }]} />
                    <Text style={styles.trendLabel}>{m.label.slice(0, 4)}</Text>
                  </Tap>
                ))}
              </View>
            </View>
          </>
        ) : !annual ? (
          <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
        ) : (
          <AnnualView annual={annual} year={year} onSelectYear={selectYear} colors={colors} styles={styles} />
        )}
      </ScrollView>

      <Sheet visible={monthPickerOpen} onClose={() => setMonthPickerOpen(false)} title="Choisir un mois">
        {monthsDesc.map((m) => (
          <Tap
            key={m.id}
            style={[styles.monthPickerRow, m.id === effectiveMonthId && styles.monthPickerRowActive]}
            onPress={() => {
              setSelectedMonthId(m.id);
              setMonthPickerOpen(false);
            }}
          >
            <Text style={styles.monthPickerLabel}>{m.label}</Text>
            {m.isActive ? (
              <View style={styles.monthPickerBadge}>
                <Text style={styles.monthPickerBadgeText}>actif</Text>
              </View>
            ) : null}
            {m.id === effectiveMonthId ? <Feather name="check" size={18} color={colors.orange} /> : null}
          </Tap>
        ))}
      </Sheet>
    </OverlayScreen>
  );
}

function AnnualView({
  annual,
  year,
  onSelectYear,
  colors,
  styles,
}: {
  annual: AnnualResponse;
  year: number | null;
  onSelectYear: (y: number) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const maxMonth = Math.max(...annual.months.map((m) => m.epargneFin), 1);
  const displayTotale = useCountUp(annual.epargne.totale);

  return (
    <>
      {annual.availableYears.length > 1 ? (
        <ChipScroller>
          {annual.availableYears.map((y) => (
            <Chip key={y} label={String(y)} active={year === y} onPress={() => onSelectYear(y)} accent={colors.violet} />
          ))}
        </ChipScroller>
      ) : null}

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Épargne totale</Text>
        <Text style={styles.heroValue}>
          {fmt(displayTotale)} <Text style={styles.heroUnit}>{currencySymbol()}</Text>
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpi}>
          <View style={styles.kpiHead}>
            <Text style={styles.kpiLabel}>Revenus {annual.year}</Text>
            <View style={[styles.kpiIcon, { backgroundColor: colors.greenBg }]}>
              <Feather name="arrow-up" size={12} color={colors.green} />
            </View>
          </View>
          <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(annual.totals.revenu)}</Text>
        </View>
        <View style={styles.kpi}>
          <View style={styles.kpiHead}>
            <Text style={styles.kpiLabel}>Dépenses {annual.year}</Text>
            <View style={[styles.kpiIcon, { backgroundColor: colors.redBg }]}>
              <Feather name="arrow-down" size={12} color={colors.red} />
            </View>
          </View>
          <Text style={[styles.kpiVal, { color: colors.red }]}>{fmt(annual.totals.depense)}</Text>
        </View>
        <View style={styles.kpi}>
          <View style={styles.kpiHead}>
            <Text style={styles.kpiLabel}>Mois avec données</Text>
            <View style={[styles.kpiIcon, { backgroundColor: colors.fillSoft }]}>
              <Feather name="calendar" size={12} color={colors.muted} />
            </View>
          </View>
          <Text style={styles.kpiVal}>{annual.monthsWithData} / 12</Text>
        </View>
        <View style={styles.kpi}>
          <View style={styles.kpiHead}>
            <Text style={styles.kpiLabel}>Taux d&apos;épargne</Text>
            <View style={[styles.kpiIcon, { backgroundColor: annual.epargne.tauxPct >= 0 ? colors.greenBg : colors.redBg }]}>
              <Feather name="percent" size={12} color={annual.epargne.tauxPct >= 0 ? colors.green : colors.red} />
            </View>
          </View>
          <Text style={[styles.kpiVal, { color: annual.epargne.tauxPct >= 0 ? colors.green : colors.red }]}>{annual.epargne.tauxPct}%</Text>
        </View>
      </View>

      {annual.bestMonth || annual.worstMonth ? (
        <View style={styles.row}>
          {annual.bestMonth ? (
            <View style={styles.miniCard}>
              <Text style={styles.kpiLabel}>Meilleur mois (flux)</Text>
              <Text style={[styles.kpiVal, { fontSize: 15, color: annual.bestMonth.net >= 0 ? colors.green : colors.red }]}>
                {annual.bestMonth.net >= 0 ? "+" : "−"}
                {fmt(Math.abs(annual.bestMonth.net))} {currencySymbol()}
              </Text>
              <Text style={styles.miniCardSub}>{annual.bestMonth.label}</Text>
            </View>
          ) : null}
          {annual.worstMonth ? (
            <View style={styles.miniCard}>
              <Text style={styles.kpiLabel}>Mois le plus difficile</Text>
              <Text style={[styles.kpiVal, { fontSize: 15, color: annual.worstMonth.net >= 0 ? colors.green : colors.red }]}>
                {annual.worstMonth.net >= 0 ? "+" : "−"}
                {fmt(Math.abs(annual.worstMonth.net))} {currencySymbol()}
              </Text>
              <Text style={styles.miniCardSub}>{annual.worstMonth.label}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Épargne totale · Janvier → Décembre</Text>
        <View style={styles.yearRow}>
          {annual.months.map((m) => {
            const barColor = !m.hasData ? colors.lineSoft : colors.blue;
            return (
              <View key={m.mm} style={styles.yearCol}>
                <View style={[styles.yearBar, { height: m.hasData ? Math.max((m.epargneFin / maxMonth) * 90, 6) : 4, backgroundColor: barColor }]} />
                <Text style={styles.yearLabel}>{MOIS_ABBR[m.mm]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dépenses par catégorie · cumul {annual.year}</Text>
        <AnnualBars items={annual.depCategories} color={colors.red} colors={colors} styles={styles} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Revenus par source · cumul {annual.year}</Text>
        <AnnualBars items={annual.revCategories} color={colors.green} colors={colors} styles={styles} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bourse (BRVM) · {annual.year}</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Investi cette année</Text>
            <Text style={[styles.kpiVal, { color: colors.violet }]}>{fmt(annual.bourse.achatsAnnee)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Vendu cette année</Text>
            <Text style={styles.kpiVal}>{fmt(annual.bourse.ventesAnnee)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Dividendes reçus</Text>
            <Text style={[styles.kpiVal, { color: colors.green }]}>{fmt(annual.bourse.dividendesAnnee)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Plus-value latente</Text>
            <Text style={[styles.kpiVal, { color: annual.bourse.plusValueLatente >= 0 ? colors.green : colors.red }]}>
              {annual.bourse.plusValueLatente >= 0 ? "+" : "−"}
              {annual.bourse.plusValuePct.toFixed(1)}%
            </Text>
          </View>
        </View>
        <View style={styles.divBourse}>
          <Text style={styles.kpiLabel}>Portefeuille aujourd&apos;hui</Text>
          <Text style={styles.kpiVal}>
            {fmt(annual.bourse.valorisationActuelle)} {currencySymbol()}{" "}
            <Text style={styles.miniCardSub}>
              · investi {fmt(annual.bourse.investiActuel)} {currencySymbol()}
            </Text>
          </Text>
        </View>
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
    content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
    modeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    modeDropdown: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
      maxWidth: 190,
    },
    modeDropdownActive: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
    modeDropdownText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, flexShrink: 1 },
    modeDropdownTextActive: { color: "#fff" },
    monthPickerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 12 },
    monthPickerRowActive: { backgroundColor: colors.fillSoft },
    monthPickerLabel: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
    monthPickerBadge: { backgroundColor: colors.orangeBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    monthPickerBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 10.5, color: colors.orange },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    kpi: { flexBasis: "48%", flexGrow: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14 },
    kpiHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 },
    kpiIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    kpiLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
    kpiVal: { fontFamily: fonts.monoBold, fontSize: 19, color: colors.ink },
    row: { flexDirection: "row", gap: 10 },
    fraisCard: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14 },
    urgenceCard: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, padding: 16 },
    cardTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink, marginBottom: 14 },
    emptyWrap: { alignItems: "center", gap: 8, paddingVertical: 6 },
    empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
    barHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    barLabel: { flex: 1, minWidth: 0, marginRight: 8, fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
    barVal: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.ink },
    barPct: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    trendRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, height: 96 },
    trendCol: { flex: 1, alignItems: "center", gap: 6, justifyContent: "flex-end" },
    trendBar: { width: "100%", borderRadius: 8 },
    trendLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    hero: { backgroundColor: colors.anthracite, borderRadius: 20, padding: 18 },
    heroLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
    heroValue: { fontFamily: fonts.monoBold, fontSize: 26, color: "#fff", marginTop: 2, marginBottom: 4, letterSpacing: -0.5 },
    heroUnit: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted2 },
    miniCard: { flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14 },
    miniCardSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginTop: 2 },
    yearRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 110 },
    yearCol: { flex: 1, alignItems: "center", gap: 5, justifyContent: "flex-end" },
    yearBar: { width: "100%", borderRadius: 5 },
    yearLabel: { fontFamily: fonts.sans, fontSize: 9.5, color: colors.muted2 },
    divBourse: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
  });
}
