import DateTimePicker, { type DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { fieldLabel: string; value: string; onChange: (formatted: string) => void; placeholder?: string };

function parseDDMM(v: string): Date {
  const m = (v || "").match(/(\d{1,2})\/(\d{1,2})/);
  const now = new Date();
  if (!m) return now;
  const d = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? now : d;
}

function formatDDMM(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Sélecteur de date natif (JJ/MM, cohérent avec le format de dates du reste de l'app). */
export default function DateField({ fieldLabel, value, onChange, placeholder = "JJ/MM" }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  function handleValueChange(_event: DateTimePickerChangeEvent, selected: Date) {
    if (Platform.OS === "android") setShow(false);
    onChange(formatDDMM(selected));
  }

  function handleDismiss() {
    setShow(false);
  }

  return (
    <View>
      <Pressable style={styles.box} onPress={() => setShow(true)}>
        <Text style={styles.label}>{fieldLabel}</Text>
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
      </Pressable>
      {show ? (
        <View style={Platform.OS === "ios" ? styles.iosPicker : undefined}>
          <DateTimePicker value={parseDDMM(value)} mode="date" display="default" onValueChange={handleValueChange} onDismiss={handleDismiss} />
          {Platform.OS === "ios" ? (
            <Pressable style={styles.doneBtn} onPress={() => setShow(false)}>
              <Text style={styles.doneText}>Terminé</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
    label: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    value: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink, paddingVertical: 2 },
    placeholder: { color: colors.muted2, fontFamily: fonts.sans },
    iosPicker: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, marginBottom: 12, overflow: "hidden" },
    doneBtn: { alignItems: "center", padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
    doneText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.orange },
  });
}
