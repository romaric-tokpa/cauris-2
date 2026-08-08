import "../lib/disableFontScaling";
import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, type AppStateStatus, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BiometricGate from "../components/BiometricGate";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { useIsOnline } from "../lib/network";
import { syncQueue } from "../lib/offlineQueue";
import { PrefsProvider, useColors, usePrefs } from "../lib/prefs";
import { ProfileProvider } from "../lib/ProfileContext";
import { colors as staticColors } from "../lib/theme";

/** Verrouille de nouveau si l'app est restée en arrière-plan au moins ce délai. */
const IDLE_LOCK_MS = 60 * 1000;

function RootNavigator() {
  const { isLoggedIn, loading } = useAuth();
  const { dark, biometric, loaded: prefsLoaded } = usePrefs();
  const colors = useColors();
  const [unlocked, setUnlocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const biometricRef = useRef(biometric);
  biometricRef.current = biometric;
  const online = useIsOnline();

  useEffect(() => {
    if (!isLoggedIn) setUnlocked(false);
  }, [isLoggedIn]);

  // Synchronise la file d'opérations créées hors ligne dès que le réseau revient (ou dès le démarrage si déjà en ligne).
  useEffect(() => {
    if (isLoggedIn && online) syncQueue();
  }, [isLoggedIn, online]);

  useEffect(() => {
    function onChange(next: AppStateStatus) {
      if (next === "background" || next === "inactive") {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
        return;
      }
      if (next === "active" && backgroundedAt.current != null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (biometricRef.current && away >= IDLE_LOCK_MS) setUnlocked(false);
      }
    }
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  if (loading || !prefsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.desk }}>
        <ActivityIndicator color={colors.anthracite} />
      </View>
    );
  }

  if (isLoggedIn && biometric && !unlocked) {
    return <BiometricGate colors={colors} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="coffres" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="bourse" />
          <Stack.Screen name="pret" />
          <Stack.Screen name="fleetos" />
          <Stack.Screen name="sauvegardes" />
          <Stack.Screen name="reglages" />
          <Stack.Screen name="analyse" />
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={dark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: staticColors.desk }}>
        <ActivityIndicator color={staticColors.anthracite} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <AuthProvider>
          <ProfileProvider>
            <RootNavigator />
          </ProfileProvider>
        </AuthProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
