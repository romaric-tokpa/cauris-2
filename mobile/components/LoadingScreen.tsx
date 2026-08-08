import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import CauriMark from "./CauriMark";
import { colors, fonts } from "../lib/theme";

function Dot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.delay(360),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return <Animated.View style={[styles.dot, { opacity, transform: [{ translateY }] }]} />;
}

/** Écran de chargement affiché pendant l'initialisation (polices, préférences, session) — même identité visuelle que login.tsx. */
export default function LoadingScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.05, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [opacity, scale]);

  return (
    <LinearGradient colors={["#23282E", "#1C2025", "#141619"]} style={styles.shell}>
      <Animated.View style={[styles.mark, { opacity, transform: [{ scale }] }]}>
        <CauriMark size={58} />
        <Text style={styles.title}>Cauris</Text>
      </Animated.View>
      <View style={styles.dots}>
        <Dot delay={0} />
        <Dot delay={140} />
        <Dot delay={280} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { alignItems: "center" },
  title: { fontFamily: fonts.sansBold, fontWeight: "800", fontSize: 24, color: "#fff", letterSpacing: -0.4, marginTop: 14 },
  dots: { flexDirection: "row", gap: 8, position: "absolute", bottom: 96 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
});
