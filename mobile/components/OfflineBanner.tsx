import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useIsOnline } from "../lib/network";
import { useQueueLength } from "../lib/offlineQueue";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

/** Bandeau affiché hors ligne, et/ou tant qu'il reste des opérations saisies hors ligne pas encore synchronisées. */
export default function OfflineBanner() {
  const online = useIsOnline();
  const pending = useQueueLength();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (online && pending === 0) return null;

  return (
    <View style={[styles.banner, online ? styles.bannerSyncing : styles.bannerOffline]}>
      <Feather name={online ? "upload-cloud" : "wifi-off"} size={14} color={online ? colors.blue : colors.orange} />
      <Text style={[styles.text, { color: online ? colors.blue : colors.orange }]}>
        {online
          ? `Synchronisation de ${pending} opération${pending > 1 ? "s" : ""}…`
          : pending > 0
            ? `Hors ligne · ${pending} opération${pending > 1 ? "s" : ""} en attente`
            : "Hors ligne — les nouvelles opérations seront synchronisées au retour du réseau"}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    bannerOffline: { backgroundColor: colors.amberBg },
    bannerSyncing: { backgroundColor: colors.blueBg },
    text: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12 },
  });
}
