import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useColors } from "../lib/prefs";

const SEGMENTS = 18;

/** Barre de progression en blocs segmentés, comme .bar() dans la maquette Cauris Android.dc.html. Se remplit en douceur au lieu de sauter directement au niveau final. */
export default function SegmentedBar({ pct, color }: { pct: number; color: string }) {
  const colors = useColors();
  const target = (Math.min(pct, 100) / 100) * SEGMENTS;
  const anim = useRef(new Animated.Value(0)).current;
  const [on, setOn] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setOn(Math.round(value)));
    Animated.timing(anim, { toValue: target, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [target, anim]);

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
