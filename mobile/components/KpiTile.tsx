import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Tone = "default" | "dark" | "accent" | "rev";
type Props = { label: string; value: string; unit?: string; sub?: string; tone?: Tone };

export default function KpiTile({ label, value, unit = "F", sub, tone = "default" }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dark = tone === "dark";
  const valueColor = dark ? "#fff" : tone === "accent" ? colors.orange : tone === "rev" ? colors.green : colors.ink;

  return (
    <View style={[styles.tile, dark && styles.tileDark]}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>
        {value}
        <Text style={[styles.unit, dark && styles.unitDark]}> {unit}</Text>
      </Text>
      {sub ? <Text style={[styles.sub, dark && styles.subDark]}>{sub}</Text> : null}
      {dark ? <View style={styles.corner} /> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tile: {
      flexBasis: "48%",
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      padding: 13,
      marginBottom: 10,
      overflow: "hidden",
    },
    tileDark: { backgroundColor: colors.anthracite, borderColor: colors.anthracite },
    label: {
      fontFamily: fonts.mono,
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.muted,
    },
    labelDark: { color: "rgba(245,243,239,0.6)" },
    value: { fontFamily: fonts.monoBold, fontSize: 22, marginTop: 5 },
    unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 0 },
    unitDark: { color: "rgba(245,243,239,0.55)" },
    sub: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.muted, marginTop: 5 },
    subDark: { color: "rgba(245,243,239,0.6)" },
    corner: {
      position: "absolute",
      right: -18,
      bottom: -18,
      width: 60,
      height: 60,
      backgroundColor: colors.orange,
      opacity: 0.16,
      borderRadius: 2,
      transform: [{ rotate: "12deg" }],
    },
  });
}
