import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

export default function Placeholder({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mark} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle ?? "Bientôt disponible."}</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.desk, padding: 24 },
    mark: { width: 12, height: 12, backgroundColor: colors.orange, borderRadius: 3, marginBottom: 14, transform: [{ rotate: "10deg" }] },
    title: { fontFamily: fonts.sansBold, fontSize: 19, color: colors.ink, marginBottom: 8 },
    subtitle: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: "center" },
  });
}
