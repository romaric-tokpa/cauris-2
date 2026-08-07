import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { label: string; active?: boolean; onPress?: () => void; accent?: string };

export default function Chip({ label, active, onPress, accent }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeAccent = accent ?? colors.anthracite;

  return (
    <Pressable style={[styles.chip, active && { backgroundColor: activeAccent, borderColor: activeAccent }]} onPress={onPress}>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
      marginRight: 8,
    },
    label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
    labelActive: { color: "#fff" },
  });
}
