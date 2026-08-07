import { StyleSheet, View } from "react-native";
import { useColors } from "../lib/prefs";

const SEGMENTS = 18;

/** Barre de progression en blocs segmentés, comme .bar() dans la maquette Cauris Android.dc.html. */
export default function SegmentedBar({ pct, color }: { pct: number; color: string }) {
  const colors = useColors();
  const on = Math.round((Math.min(pct, 100) / 100) * SEGMENTS);
  return (
    <View style={styles.row}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i < on ? color : colors.segmentOff }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3, height: 16 },
  seg: { flex: 1, borderRadius: 2 },
});
