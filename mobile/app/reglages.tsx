import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import PasswordSheet from "../components/PasswordSheet";
import SwitchToggle from "../components/Switch";
import Tap from "../components/Tap";
import type { Currency } from "../lib/currency";
import { useAuth } from "../lib/AuthContext";
import { useColors, usePrefs } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

const APP_VERSION = "2.1.0";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "XOF", label: "FCFA" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

export default function ReglagesScreen() {
  const { logout } = useAuth();
  const { dark, toggleDark, hideAmounts, toggleHideAmounts, biometric, toggleBiometric, currency, setCurrency } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pwdOpen, setPwdOpen] = useState(false);

  async function onToggleBiometric() {
    if (biometric) {
      toggleBiometric();
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert("Indisponible", "Aucune biométrie n'est configurée sur cet appareil.");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirmer le déverrouillage biométrique" });
    if (result.success) toggleBiometric();
  }

  return (
    <OverlayScreen title="Réglages">
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <View style={styles.card}>
            <Tap style={styles.row} onPress={() => setPwdOpen(true)}>
              <View style={[styles.rowIcon, { backgroundColor: colors.blueBg }]}>
                <Feather name="lock" size={16} color={colors.blue} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Changer le mot de passe</Text>
              <Feather name="chevron-right" size={18} color={colors.muted2} />
            </Tap>
            <View style={[styles.row, styles.rowLast]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
                <Feather name="shield" size={16} color={colors.green} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Déverrouillage biométrique</Text>
              <SwitchToggle value={biometric} onValueChange={onToggleBiometric} />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.fillSoft }]}>
                <Feather name={dark ? "moon" : "sun"} size={16} color={colors.acier} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Mode sombre</Text>
              <SwitchToggle value={dark} onValueChange={toggleDark} />
            </View>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.fillSoft }]}>
                <Feather name="eye-off" size={16} color={colors.acier} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Masquer les montants</Text>
              <SwitchToggle value={hideAmounts} onValueChange={toggleHideAmounts} />
            </View>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: colors.violetBg }]}>
                <Feather name="dollar-sign" size={16} color={colors.violet} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Devise</Text>
              <View style={styles.currencyGroup}>
                {CURRENCIES.map((c) => (
                  <Tap key={c.value} style={[styles.currencyPill, currency === c.value && styles.currencyPillActive]} onPress={() => setCurrency(c.value)}>
                    <Text style={[styles.currencyPillText, currency === c.value && styles.currencyPillTextActive]}>{c.label}</Text>
                  </Tap>
                ))}
              </View>
            </View>
            <Tap style={[styles.row, styles.rowLast]} onPress={() => router.push("/sauvegardes")}>
              <View style={[styles.rowIcon, { backgroundColor: colors.blueBg }]}>
                <Feather name="database" size={16} color={colors.blue} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Sauvegardes & restauration</Text>
              <Feather name="chevron-right" size={18} color={colors.muted2} />
            </Tap>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.fillSoft }]}>
              <Feather name="info" size={16} color={colors.acier} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Version</Text>
            <Text style={styles.rowValueMono}>Cauris {APP_VERSION}</Text>
          </View>
          <Tap style={[styles.row, styles.rowLast]} onPress={logout}>
            <View style={[styles.rowIcon, { backgroundColor: colors.redBg }]}>
              <Feather name="log-out" size={16} color={colors.red} />
            </View>
            <Text style={[styles.rowLabel, styles.logoutText]}>Déconnexion</Text>
          </Tap>
        </View>
      </ScrollView>

      <PasswordSheet visible={pwdOpen} onClose={() => setPwdOpen(false)} onUnauthorized={logout} />
    </OverlayScreen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 18, paddingBottom: 32, gap: 16 },
    sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6 },
    card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
    rowValueMono: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted2 },
    currencyGroup: { flexDirection: "row", gap: 6 },
    currencyPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.fillSoft },
    currencyPillActive: { backgroundColor: colors.anthracite },
    currencyPillText: { fontFamily: fonts.sansSemiBold, fontSize: 11.5, color: colors.muted },
    currencyPillTextActive: { color: "#fff" },
    logoutText: { fontFamily: fonts.sansSemiBold, color: colors.red },
  });
}
