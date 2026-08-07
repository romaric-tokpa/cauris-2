import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import OverlayScreen from "../components/OverlayScreen";
import PasswordSheet from "../components/PasswordSheet";
import SwitchToggle from "../components/Switch";
import { useAuth } from "../lib/AuthContext";
import { useColors, usePrefs } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

const APP_VERSION = "2.0";

export default function ReglagesScreen() {
  const { logout } = useAuth();
  const { dark, toggleDark, hideAmounts, toggleHideAmounts, biometric, toggleBiometric } = usePrefs();
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
            <Pressable style={styles.row} onPress={() => setPwdOpen(true)}>
              <Text style={styles.rowLabel}>Changer le mot de passe</Text>
              <Feather name="chevron-right" size={18} color={colors.muted2} />
            </Pressable>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Déverrouillage biométrique</Text>
              <SwitchToggle value={biometric} onValueChange={onToggleBiometric} />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Mode sombre</Text>
              <SwitchToggle value={dark} onValueChange={toggleDark} />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Masquer les montants</Text>
              <SwitchToggle value={hideAmounts} onValueChange={toggleHideAmounts} />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Devise</Text>
              <Text style={styles.rowValue}>FCFA</Text>
            </View>
            <Pressable style={[styles.row, styles.rowLast]} onPress={() => router.push("/sauvegardes")}>
              <Text style={styles.rowLabel}>Sauvegardes & restauration</Text>
              <Feather name="chevron-right" size={18} color={colors.muted2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValueMono}>Cauris {APP_VERSION}</Text>
          </View>
          <Pressable style={[styles.row, styles.rowLast]} onPress={logout}>
            <Text style={[styles.rowLabel, styles.logoutText]}>Déconnexion</Text>
          </Pressable>
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
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
    rowValue: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.muted },
    rowValueMono: { fontFamily: fonts.mono, fontSize: 13, color: colors.muted2 },
    logoutText: { fontFamily: fonts.sansSemiBold, color: colors.red },
  });
}
