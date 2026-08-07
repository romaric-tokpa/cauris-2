import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenFade from "./ScreenFade";
import Tap from "./Tap";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { title: string; action?: ReactNode; children: ReactNode };

/** Coquille commune des écrans « overlay » poussés en pile (Coffres, Budget, Bourse, Prêt, FleetOS…), avec le fondu scrIn du redesign. */
export default function OverlayScreen({ title, action, children }: Props) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Tap style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Tap>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {action}
      </View>
      <ScreenFade>{children}</ScreenFade>
    </SafeAreaView>
  );
}

export function OverlayActionButton({ label, icon = "plus", onPress }: { label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createActionStyles(colors), [colors]);
  return (
    <Tap style={styles.btn} onPress={onPress}>
      <Feather name={icon} size={14} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </Tap>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.screenBg },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
    title: { flex: 1, fontFamily: fonts.sansBold, fontSize: 21, color: colors.ink, letterSpacing: -0.4 },
  });
}

function createActionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.anthracite, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: "#fff" },
  });
}
