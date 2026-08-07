import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = { pct: number; color: string; label?: string; sub?: string; size?: number };

/** Port de .ring() du redesign (conic-gradient) — arc SVG puisque RN n'a pas de conic-gradient natif. L'arc se remplit en douceur (au lieu de sauter à la valeur), et le pourcentage affiché compte en même temps que l'arc se dessine. */
export default function RingProgress({ pct, color, label, sub, size = 96 }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stroke = Math.max(6, Math.round(size * 0.11));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const center = size / 2;

  const anim = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayPct(value));
    Animated.timing(anim, { toValue: clamped, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [clamped, anim]);
  const dashoffset = anim.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.segmentOff} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.label, { fontSize: size > 70 ? 18 : 13 }]}>{label ?? `${Math.round(displayPct)}%`}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    label: { fontFamily: fonts.monoBold, color: colors.ink },
    sub: { fontFamily: fonts.sans, fontSize: 9, color: colors.muted2 },
  });
}
