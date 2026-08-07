import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "../../lib/prefs";
import { fonts, type ThemeColors } from "../../lib/theme";

type TabIconName = keyof typeof Feather.glyphMap;

function TabIcon({ name, label, focused }: { name: TabIconName; label: string; focused: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: focused ? 1 : 0, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Animated.View style={[styles.pillActive, { opacity: anim, transform: [{ scale }] }]} />
        <Feather name={name} size={20} color={focused ? colors.orange : colors.muted2} style={styles.pillIcon} />
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" label="Accueil" focused={focused} /> }} />
      <Tabs.Screen name="operations" options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" label="Opérations" focused={focused} /> }} />
      <Tabs.Screen name="patrimoine" options={{ tabBarIcon: ({ focused }) => <TabIcon name="credit-card" label="Patrimoine" focused={focused} /> }} />
      <Tabs.Screen name="plus" options={{ tabBarIcon: ({ focused }) => <TabIcon name="menu" label="Plus" focused={focused} /> }} />
    </Tabs>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabBar: { backgroundColor: colors.paper, borderTopColor: colors.lineSoft, height: 78, paddingTop: 6 },
    wrap: { alignItems: "center", gap: 4, width: 64 },
    pill: { width: 60, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
    pillActive: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: colors.activePill },
    pillIcon: { zIndex: 1 },
    label: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.muted2 },
    labelActive: { fontFamily: fonts.sansBold, color: colors.ink },
  });
}
