import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

export default function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.marker}>▸</Text>
      <Text style={styles.title}>{title}</Text>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 12, marginTop: 4 },
    marker: { fontFamily: fonts.mono, fontSize: 13, fontWeight: "700", color: colors.orange },
    title: { fontFamily: fonts.sansBold, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
    sub: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.muted, marginLeft: "auto", flexShrink: 1 },
  });
}
