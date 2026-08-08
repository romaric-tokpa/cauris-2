import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import CoffreSheet from "../components/CoffreSheet";
import OverlayScreen, { OverlayActionButton } from "../components/OverlayScreen";
import RingProgress from "../components/RingProgress";
import Tap from "../components/Tap";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { currencySymbol } from "../lib/currency";
import { fmt } from "../lib/format";
import { maskAmount, useColors, usePrefs } from "../lib/prefs";
import { coffreColorsFor, fonts, type ThemeColors } from "../lib/theme";
import { useCountUp } from "../lib/useCountUp";

type CoffreItem = { nom: string; epargne: number; objectif: number; bloque: boolean; pct: number; rank: string; status: "done" | "warn" | "normal"; note?: string };

/** Couleur du badge de rang : done > bloque > warn (⚠ explicite) > normal (neutre, pas une alerte). */
function coffreBadgeColors(c: CoffreItem, colors: ThemeColors): { color: string; backgroundColor: string } {
  if (c.status === "done") return { color: colors.green, backgroundColor: colors.greenBg };
  if (c.bloque) return { color: colors.blue, backgroundColor: colors.blueBg };
  if (c.status === "warn") return { color: colors.amber, backgroundColor: colors.amberBg };
  return { color: colors.acier, backgroundColor: colors.fillSoft };
}
type DetteItem = { id: string; nom: string; montant: number; retrait?: string; echeance?: string; paid: boolean; source: "seed" | "manuel" | "auto" };
type CoffresResponse = { overview: { total: number; accessible: number; bloquee: number }; coffres: CoffreItem[]; detteReste: number; dettes: DetteItem[]; dettesNote?: string };

export default function CoffresScreen() {
  const { logout } = useAuth();
  const { hideAmounts } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const coffreColors = useMemo(() => coffreColorsFor(colors), [colors]);
  const [data, setData] = useState<CoffresResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const displayTotal = useCountUp(data?.overview.total ?? 0);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/coffres");
      setData(await res.json());
      setError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      setError("Impossible de charger les coffres.");
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(d: DetteItem) {
    setPayingId(d.id);
    try {
      const res = await apiFetch(`/api/coffres/dettes/${d.id}`, { method: "PATCH", body: JSON.stringify({ paid: true }) });
      if (res.ok) await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setPayingId(null);
    }
  }

  if (error) {
    return (
      <OverlayScreen title="Coffres & dettes">
        <Text style={styles.errorText}>{error}</Text>
      </OverlayScreen>
    );
  }
  if (!data) {
    return (
      <OverlayScreen title="Coffres & dettes">
        <ActivityIndicator color={colors.anthracite} style={{ marginTop: 40 }} />
      </OverlayScreen>
    );
  }

  return (
    <OverlayScreen title="Coffres & dettes" action={<OverlayActionButton label="Coffre" onPress={() => setSheetOpen(true)} />}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Épargne totale</Text>
          <Text style={styles.heroValue}>
            {maskAmount(fmt(displayTotal), hideAmounts)} <Text style={styles.heroUnit}>{currencySymbol()}</Text>
          </Text>
          <View style={styles.heroStatsRow}>
            <View>
              <Text style={styles.heroStatLabel}>Accessible</Text>
              <Text style={[styles.heroStatValue, { color: colors.onDarkGreen }]}>{maskAmount(fmt(data.overview.accessible), hideAmounts)}</Text>
            </View>
            <View>
              <Text style={styles.heroStatLabel}>Bloquée</Text>
              <Text style={[styles.heroStatValue, { color: colors.onDarkMuted }]}>{maskAmount(fmt(data.overview.bloquee), hideAmounts)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Coffres · {data.coffres.length}</Text>
        {data.coffres.length ? (
          data.coffres.map((c, i) => (
            <View key={c.nom} style={styles.coffreCard}>
              <RingProgress pct={c.pct} color={coffreColors[i % coffreColors.length]} size={66} />
              <View style={{ flex: 1 }}>
                <View style={styles.coffreHead}>
                  <Text style={styles.coffreNom} numberOfLines={1}>
                    {c.nom}
                  </Text>
                  <Text style={[styles.coffreRank, coffreBadgeColors(c, colors)]}>{c.rank}</Text>
                </View>
                <Text style={styles.coffreVal}>
                  <Text style={{ fontWeight: "700" }}>{maskAmount(fmt(c.epargne), hideAmounts)}</Text>
                  <Text style={{ color: colors.muted2 }}>
                    {" "}
                    / {fmt(c.objectif)} {currencySymbol()}
                  </Text>
                </Text>
                <Text style={styles.coffreReste}>
                  Reste {maskAmount(fmt(Math.max(c.objectif - c.epargne, 0)), hideAmounts)} {currencySymbol()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Tap style={styles.coffresEmpty} onPress={() => setSheetOpen(true)}>
            <View style={styles.coffresEmptyIcon}>
              <Feather name="lock" size={18} color={colors.muted2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coffresEmptyTitle}>Aucun coffre pour l&apos;instant</Text>
              <Text style={styles.coffresEmptySub}>Touchez « + Coffre » pour créer le premier</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted2} />
          </Tap>
        )}

        {data.detteReste > 0 ? (
          <View style={styles.detteAlert}>
            <View style={styles.detteAlertIcon}>
              <Feather name="alert-triangle" size={16} color={colors.anthracite} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detteAlertTitle}>
                {fmt(data.detteReste)} {currencySymbol()} à rembourser
              </Text>
              <Text style={styles.detteAlertSub}>Échéance la plus proche · {data.dettes.find((d) => !d.paid)?.echeance ?? "—"}</Text>
            </View>
          </View>
        ) : null}

        {data.dettes.length ? (
          <View>
            <Text style={styles.sectionTitle}>Dettes à rembourser</Text>
            <View style={styles.detteList}>
              {data.dettes.map((d) => (
                <View key={d.id} style={styles.detteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detteNom} numberOfLines={1}>
                      {d.nom}
                    </Text>
                    <Text style={styles.detteMeta}>Échéance {d.echeance ?? "—"}</Text>
                  </View>
                  <Text style={styles.detteMontant}>{fmt(d.montant)}</Text>
                  {d.paid ? (
                    <View style={styles.detteDonePill}>
                      <Text style={styles.detteDoneText}>Payé</Text>
                    </View>
                  ) : (
                    <Tap style={styles.detteBtn} onPress={() => markPaid(d)} disabled={payingId === d.id}>
                      {payingId === d.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.detteBtnText}>Payé</Text>}
                    </Tap>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <CoffreSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          load();
        }}
        onUnauthorized={logout}
      />
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  errorText: { fontFamily: fonts.sans, color: colors.ink, padding: 20 },
  content: { paddingHorizontal: 18, paddingBottom: 32, gap: 14 },
  hero: { backgroundColor: colors.anthracite, borderRadius: 22, padding: 20 },
  heroLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted2 },
  heroValue: { fontFamily: fonts.monoBold, fontSize: 30, color: "#fff", letterSpacing: -1, marginTop: 4, marginBottom: 16 },
  heroUnit: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted2 },
  heroStatsRow: { flexDirection: "row", gap: 24 },
  heroStatLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
  heroStatValue: { fontFamily: fonts.monoBold, fontSize: 15, marginTop: 2 },
  coffreCard: { flexDirection: "row", gap: 15, alignItems: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 20, padding: 16 },
  coffreHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  coffreNom: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink, flexShrink: 1 },
  coffreRank: { fontFamily: fonts.sansSemiBold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  coffreVal: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink, marginTop: 4 },
  coffreReste: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 2 },
  coffresEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 18,
    padding: 14,
  },
  coffresEmptyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.fillSoft, alignItems: "center", justifyContent: "center" },
  coffresEmptyTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  coffresEmptySub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 2 },
  detteAlert: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.hivis, borderRadius: 16, padding: 14 },
  detteAlertIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.hivis, alignItems: "center", justifyContent: "center" },
  detteAlertTitle: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink },
  detteAlertSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6, marginTop: 4 },
  detteList: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
  detteRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  detteNom: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  detteMeta: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 2 },
  detteMontant: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.ink },
  detteBtn: { backgroundColor: colors.green, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, minWidth: 56, alignItems: "center" },
  detteBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: "#fff" },
  detteDonePill: { backgroundColor: colors.greenBg, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  detteDoneText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.green },
  });
}
