import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useColors } from "../lib/prefs";

const SEGMENTS = 18;

type Part = { value: number; color: string };

/**
 * Variante multi-couleurs de SegmentedBar (mêmes blocs : 18, gap 3, height
 * 16, borderRadius 2) — pour une composition (plusieurs parts d'un total),
 * pas une simple progression. Chaque bloc prend la couleur de la part à
 * laquelle sa position appartient proportionnellement. Un balayage anime la
 * révélation des couleurs de gauche à droite au lieu d'un affichage brut.
 */
export default function MultiSegmentedBar({ parts }: { parts: Part[] }) {
  const colors = useColors();
  const total = parts.reduce((s, p) => s + Math.max(p.value, 0), 0);
  let cum = 0;
  const cumFractions = parts.map((p) => {
    cum += Math.max(p.value, 0);
    return total > 0 ? cum / total : 0;
  });

  const key = parts.map((p) => `${p.color}:${p.value}`).join("|");
  const anim = useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value }) => setRevealed(value));
    Animated.timing(anim, { toValue: SEGMENTS, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [key, anim]);

  return (
    <View style={styles.row}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const t = (i + 0.5) / SEGMENTS;
        const idx = cumFractions.findIndex((c) => t <= c);
        const color = total > 0 && idx >= 0 && i < revealed ? parts[idx].color : colors.segmentOff;
        return <View key={i} style={[styles.seg, { backgroundColor: color }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3, height: 16 },
  seg: { flex: 1, borderRadius: 2 },
});
