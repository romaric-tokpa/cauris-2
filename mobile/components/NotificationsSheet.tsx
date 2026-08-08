import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "./Sheet";
import Tap from "./Tap";
import { fetchNotifications, type Notif, type NotifKind } from "../lib/notifications";
import { markAllRead, markRead, useReadIds } from "../lib/notificationsRead";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { visible: boolean; onClose: () => void };

function kindStyleFor(colors: ThemeColors): Record<NotifKind, { bg: string; c: string }> {
  return {
    budget: { bg: colors.redBg, c: colors.red },
    pret: { bg: colors.blueBg, c: colors.blue },
    fleetos: { bg: colors.orangeBg, c: colors.orange },
    dette: { bg: colors.amberBg, c: colors.amber },
  };
}

export default function NotificationsSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const KIND_STYLE = useMemo(() => kindStyleFor(colors), [colors]);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const readIds = useReadIds();

  useEffect(() => {
    if (!visible) return;
    fetchNotifications()
      .then(setNotifs)
      .catch(() => setNotifs([]));
  }, [visible]);

  const visibleNotifs = (notifs ?? []).filter((n) => !readIds.has(n.id));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Notifications"
      headerRight={
        <View style={styles.headerActions}>
          {visibleNotifs.length > 0 ? (
            <Tap onPress={() => markAllRead((notifs ?? []).map((n) => n.id))} hitSlop={8}>
              <Text style={styles.markAll}>Tout lire</Text>
            </Tap>
          ) : null}
          <Tap style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={18} color={colors.muted} />
          </Tap>
        </View>
      }
    >
      {visibleNotifs.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="check" size={22} color={colors.green} />
          </View>
          <Text style={styles.emptyTitle}>Tout est à jour</Text>
          <Text style={styles.emptySub}>Aucune notification à traiter pour le moment.</Text>
        </View>
      ) : (
        visibleNotifs.map((n) => (
          <Tap
            key={n.id}
            style={styles.row}
            onPress={() => {
              onClose();
              router.push(n.route as never);
            }}
          >
            <View style={[styles.icon, { backgroundColor: KIND_STYLE[n.kind].bg }]}>
              <Feather name={n.icon} size={18} color={KIND_STYLE[n.kind].c} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>
                {n.title}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {n.sub}
              </Text>
            </View>
            <Tap
              style={styles.dismiss}
              onPress={(e) => {
                e.stopPropagation();
                markRead(n.id);
              }}
            >
              <Feather name="check" size={16} color={colors.green} />
            </Tap>
          </Tap>
        ))
      )}
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    markAll: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.orange },
    closeBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: colors.fillSoft, alignItems: "center", justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 16, padding: 14, marginBottom: 10 },
    icon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    title: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
    sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginTop: 2 },
    dismiss: { width: 34, height: 34, borderRadius: 999, backgroundColor: colors.greenBg, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", gap: 10, paddingVertical: 40 },
    emptyIcon: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.greenBg, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
    emptySub: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted2 },
  });
}
