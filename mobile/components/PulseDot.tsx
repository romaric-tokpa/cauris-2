import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../lib/theme";

/** Port de @keyframes pulseDot (box-shadow ripple, 1.6s ease-out infinite) du redesign — RN n'anime pas box-shadow, on ondule un halo en scale+opacity autour du point. */
export default function PulseDot({ color = colors.green, size = 8 }: { color?: string; size?: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const scale = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.3, 2.3] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0.55, 0.4, 0, 0] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={[styles.halo, { width: size, height: size, borderRadius: size, backgroundColor: color, opacity, transform: [{ scale }] }]} />
      <View style={[styles.core, { width: size, height: size, borderRadius: size, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute" },
  core: {},
});
