import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PulseDot from "../../components/PulseDot";
import ScreenFade from "../../components/ScreenFade";
import SwitchToggle from "../../components/Switch";
import Tap from "../../components/Tap";
import { apiFetch, UnauthorizedError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { fmt } from "../../lib/format";
import { useColors, usePrefs } from "../../lib/prefs";
import { removeProfilePhoto, uploadProfilePhoto } from "../../lib/profile";
import { useProfilePhoto } from "../../lib/ProfileContext";
import { fonts, type ThemeColors } from "../../lib/theme";

type PilotMonth = { label: string; isActive: boolean; revenu: number; depense: number; net: number };
type PilotResponse = { months: PilotMonth[] };

type MenuItem = { label: string; icon: keyof typeof Feather.glyphMap; bg: string; c: string; onPress: () => void; danger?: boolean };

export default function PlusScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { dark, toggleDark } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [active, setActive] = useState<PilotMonth | null>(null);
  const [closing, setClosing] = useState(false);
  const { photo, setPhoto } = useProfilePhoto();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pilot");
      const data: PilotResponse = await res.json();
      setActive(data.months.find((m) => m.isActive) ?? data.months[data.months.length - 1] ?? null);
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmClose() {
    Alert.alert(
      "Clôturer le mois",
      "Les soldes de comptes et coffres sont reportés comme point de départ du mois suivant. Le mois actuel reste consultable dans l'historique.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Clôturer", onPress: closeMonth },
      ],
    );
  }

  async function closeMonth() {
    setClosing(true);
    try {
      const res = await apiFetch("/api/pilot/close", { method: "POST" });
      if (res.ok) await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setClosing(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Accès aux photos refusé", "Autorise l'accès à tes photos dans les réglages du téléphone pour changer ta photo de profil.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    const mime = result.assets[0].mimeType || "image/jpeg";
    const dataUri = `data:${mime};base64,${result.assets[0].base64}`;
    setUploadingPhoto(true);
    try {
      await uploadProfilePhoto(dataUri);
      setPhoto(dataUri);
    } catch (e) {
      if (e instanceof UnauthorizedError) return logout();
      Alert.alert("Erreur", e instanceof Error ? e.message : "Envoi de la photo impossible.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function doRemovePhoto() {
    setUploadingPhoto(true);
    try {
      await removeProfilePhoto();
      setPhoto(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    } finally {
      setUploadingPhoto(false);
    }
  }

  function onAvatarPress() {
    const buttons: Parameters<typeof Alert.alert>[2] = [{ text: "Choisir une photo", onPress: pickPhoto }];
    if (photo) buttons.push({ text: "Supprimer la photo", style: "destructive", onPress: doRemovePhoto });
    buttons.push({ text: "Annuler", style: "cancel" });
    Alert.alert("Photo de profil", undefined, buttons);
  }

  const gestion: MenuItem[] = [{ label: "FleetOS", icon: "truck", bg: colors.orangeBg, c: colors.orange, onPress: () => router.push("/fleetos") }];
  const systeme: MenuItem[] = [
    { label: "Sauvegardes & restauration", icon: "database", bg: colors.blueBg, c: colors.blue, onPress: () => router.push("/sauvegardes") },
    { label: "Réglages", icon: "settings", bg: colors.fillSoft, c: colors.acier, onPress: () => router.push("/reglages") },
    { label: "Déconnexion", icon: "log-out", bg: colors.redBg, c: colors.red, onPress: logout, danger: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenFade>
        <View style={styles.header}>
          <Text style={styles.title}>Plus</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            <Tap style={styles.avatar} onPress={onAvatarPress} disabled={uploadingPhoto}>
              {photo ? <Image source={{ uri: photo }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>RT</Text>}
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={styles.avatarBadge}>
                  <Feather name="camera" size={11} color="#fff" />
                </View>
              )}
            </Tap>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>Romaric Tokpa</Text>
              <Text style={styles.profileSub}>Cauris · trésorerie personnelle</Text>
            </View>
          </View>

          {active ? (
            <View style={styles.cycleCard}>
              <View style={styles.cycleBadgeRow}>
                <PulseDot size={8} />
                <Text style={styles.cycleBadgeLabel}>Cycle actif</Text>
              </View>
              <Text style={styles.cycleCardLabel}>{active.label}</Text>
              <View style={styles.cycleStatsRow}>
                <View>
                  <Text style={styles.cycleStatLabel}>Revenus</Text>
                  <Text style={[styles.cycleStatVal, { color: colors.onDarkGreen }]}>{fmt(active.revenu)}</Text>
                </View>
                <View>
                  <Text style={styles.cycleStatLabel}>Dépenses</Text>
                  <Text style={[styles.cycleStatVal, { color: colors.onDarkRed }]}>{fmt(active.depense)}</Text>
                </View>
                <View>
                  <Text style={styles.cycleStatLabel}>Net</Text>
                  <Text style={[styles.cycleStatVal, { color: "#fff" }]}>{fmt(active.net)}</Text>
                </View>
              </View>
              <Tap style={styles.closeBtn} onPress={confirmClose} disabled={closing}>
                {closing ? <ActivityIndicator color="#fff" /> : <Text style={styles.closeBtnText}>Clôturer le mois</Text>}
              </Tap>
            </View>
          ) : null}

          <View>
            <Text style={styles.sectionTitle}>Apparence</Text>
            <View style={styles.standaloneRow}>
              <View style={styles.rowIcon}>
                <Feather name={dark ? "moon" : "sun"} size={17} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Mode sombre</Text>
                <Text style={styles.rowSub}>{dark ? "Activé" : "Désactivé"}</Text>
              </View>
              <SwitchToggle value={dark} onValueChange={toggleDark} />
            </View>
          </View>

          <MenuGroup title="Gestion" items={gestion} styles={styles} />
          <MenuGroup title="Système" items={systeme} styles={styles} />
        </ScrollView>
      </ScreenFade>
    </SafeAreaView>
  );
}

function MenuGroup({ title, items, styles }: { title: string; items: MenuItem[]; styles: ReturnType<typeof createStyles> }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((m) => (
          <Tap key={m.label} style={styles.listRow} onPress={m.onPress}>
            <View style={[styles.rowIcon, { backgroundColor: m.bg }]}>
              <Feather name={m.icon} size={17} color={m.c} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }, m.danger && { color: m.c, fontFamily: fonts.sansSemiBold }]}>{m.label}</Text>
            {!m.danger ? <Feather name="chevron-right" size={18} color={styles.chevron.color} /> : null}
          </Tap>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.screenBg },
    header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
    title: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
    profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.anthracite, borderRadius: 22, padding: 15 },
    avatar: { width: 54, height: 54, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 2, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
    avatarText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
    avatarImg: { width: 48, height: 48, borderRadius: 999 },
    avatarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
    avatarBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 999,
      backgroundColor: colors.orange,
      borderWidth: 2,
      borderColor: colors.anthracite,
      alignItems: "center",
      justifyContent: "center",
    },
    profileName: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
    profileSub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted2, marginTop: 2 },
    cycleCard: { backgroundColor: colors.anthracite, borderRadius: 22, padding: 20 },
    cycleBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cycleBadgeLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2 },
    cycleCardLabel: { fontFamily: fonts.sansBold, fontSize: 22, color: "#fff", marginTop: 4, marginBottom: 14 },
    cycleStatsRow: { flexDirection: "row", gap: 22, marginBottom: 16 },
    cycleStatLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    cycleStatVal: { fontFamily: fonts.monoBold, fontSize: 14, marginTop: 2 },
    closeBtn: { alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: colors.orange },
    closeBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: "#fff" },
    sectionTitle: { fontFamily: fonts.sans, fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted2, marginBottom: 6 },
    card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 18, overflow: "hidden" },
    standaloneRow: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.lineSoft, padding: 14 },
    listRow: { flexDirection: "row", alignItems: "center", gap: 13, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
    rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.fillSoft, alignItems: "center", justifyContent: "center" },
    rowLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
    rowSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 1 },
    chevron: { color: colors.muted2 },
  });
}
