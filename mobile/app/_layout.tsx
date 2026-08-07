import "../lib/disableFontScaling";
import { Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { PrefsProvider, useColors, usePrefs } from "../lib/prefs";
import { ProfileProvider } from "../lib/ProfileContext";
import { colors as staticColors } from "../lib/theme";

function RootNavigator() {
  const { isLoggedIn, loading } = useAuth();
  const { dark } = usePrefs();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.desk }}>
        <ActivityIndicator color={colors.anthracite} />
      </View>
    );
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
          <Stack.Screen name="suivi" />
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
