import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
};

/** Feuille modale glissée depuis le bas, coins arrondis — motif commun aux 7 feuilles du redesign (sheetIn + scrimIn). */
export default function Sheet({ visible, onClose, title, children, headerRight }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scrim.setValue(0);
      Animated.timing(scrim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }
  }, [visible, scrim]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdropTouch} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: scrim }]} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              {headerRight ?? <CloseButton onClose={onClose} colors={colors} />}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function CloseButton({ onClose, colors }: { onClose: () => void; colors: ThemeColors }) {
  return (
    <Pressable style={[styles.closeBtn, { backgroundColor: colors.fillSoft }]} onPress={onClose} hitSlop={8}>
      <Feather name="x" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeBtn: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdropTouch: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.5)" },
    kav: { maxHeight: "90%" },
    sheet: {
      backgroundColor: colors.screenBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? 30 : 20,
    },
    grabber: { width: 42, height: 5, borderRadius: 999, backgroundColor: colors.line2, alignSelf: "center", marginBottom: 14 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    title: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink, flexShrink: 1 },
  });
}
