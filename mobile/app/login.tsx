import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

function CauriMark({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 66) / 70} viewBox="0 0 70 66">
      <Ellipse cx={35} cy={52} rx={26} ry={8} fill="#6C737B" />
      <Ellipse cx={35} cy={40} rx={24} ry={8} fill="#9199A3" />
      <Ellipse cx={35} cy={28} rx={20} ry={7} fill="#F2C200" />
      <Ellipse cx={35} cy={17} rx={15} ry={6} fill="#F5F3EF" />
    </Svg>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#23282E", "#1C2025", "#141619"]} style={styles.shell}>
      <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <StatusBar style="light" />
        <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
          <CauriMark />
          <Text style={styles.title}>Cauris</Text>
          <Text style={styles.subtitle}>Votre trésorerie, au cauri près</Text>

          <View style={[styles.inputBox, focused && styles.inputBoxFocus, error && styles.inputBoxError]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8A9098"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoFocus
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleSubmit}
            />
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
              <Feather name={show ? "eye-off" : "eye"} size={18} color="#8A9098" />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrer</Text>}
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, alignItems: "center", justifyContent: "center", padding: 34 },
  content: { width: "100%", maxWidth: 380, alignItems: "center", gap: 10 },
  title: { fontFamily: fonts.sansBold, fontWeight: "800", fontSize: 30, color: "#fff", letterSpacing: -0.5, marginTop: 14 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: "#8A9098", marginBottom: 26 },
  inputBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inputBoxFocus: { borderColor: colors.orange, backgroundColor: "rgba(226,84,26,0.08)" },
  inputBoxError: { borderColor: colors.red },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 18, color: "#fff", letterSpacing: 2 },
  errorText: { fontFamily: fonts.sans, fontSize: 13, color: "#FF9E7A", marginBottom: 12, alignSelf: "flex-start" },
  button: { width: "100%", alignItems: "center", padding: 15, borderRadius: 16, backgroundColor: colors.orange },
  buttonText: { color: "#fff", fontSize: 16, fontFamily: fonts.sansBold },
});
