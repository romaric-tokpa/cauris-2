import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
import { useAuth } from "../lib/AuthContext";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { colors: ThemeColors; onUnlock: () => void };

function CauriMark({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 66) / 70} viewBox="0 0 70 66">
      <Ellipse cx={35} cy={52} rx={26} ry={8} fill="#6C737B" />
      <Ellipse cx={35} cy={40} rx={24} ry={8} fill="#9199A3" />
      <Ellipse cx={35} cy={28} rx={20} ry={7} fill="#F2C200" />
      <Ellipse cx={35} cy={17} rx={15} ry={6} fill="#F5F3EF" />
    </Svg>
  );
}

/**
 * Verrou biométrique au lancement de l'app quand le réglage est actif (voir
 * reglages.tsx). Rendu à la place de la Stack tant qu'il n'est pas franchi —
 * sans ça, le réglage "Déverrouillage biométrique" ne servait à rien : il
 * s'activait/désactivait mais n'était jamais vérifié nulle part.
 */
export default function BiometricGate({ colors, onUnlock }: Props) {
  const { logout } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attempt = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        // La biométrie a été retirée après activation du réglage : on ne peut pas
        // bloquer l'accès indéfiniment à un appareil que l'utilisateur contrôle déjà.
        onUnlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Déverrouiller Cauris", cancelLabel: "Annuler" });
      if (result.success) {
        onUnlock();
      } else {
        setError("Authentification annulée ou échouée.");
      }
    } finally {
      setChecking(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    attempt();
  }, [attempt]);

  return (
    <View style={styles.shell}>
      <CauriMark />
      <Text style={styles.title}>Cauris</Text>
      <Text style={styles.subtitle}>Déverrouillage biométrique requis</Text>

      {checking ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={attempt}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={logout} hitSlop={10} style={{ marginTop: 22 }}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: { flex: 1, alignItems: "center", justifyContent: "center", padding: 34, backgroundColor: colors.anthracite },
    title: { fontFamily: fonts.sansBold, fontWeight: "800", fontSize: 26, color: "#fff", letterSpacing: -0.5, marginTop: 14 },
    subtitle: { fontFamily: fonts.sans, fontSize: 14, color: "#8A9098", marginTop: 4 },
    errorText: { fontFamily: fonts.sans, fontSize: 13, color: "#FF9E7A", marginTop: 20, marginBottom: 4, textAlign: "center" },
    button: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.orange },
    buttonText: { color: "#fff", fontSize: 15, fontFamily: fonts.sansBold },
    logoutText: { fontFamily: fonts.sans, fontSize: 13, color: "#8A9098", textDecorationLine: "underline" },
  });
}
