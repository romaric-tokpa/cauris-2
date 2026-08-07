import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

/** Petits composants de formulaire partagés par les feuilles du redesign (label, champ, montant, rangée de puces). */

export function FieldLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.label}>{children}</Text>;
}

export function TextField(props: TextInputProps & { fieldLabel?: string }) {
  const { fieldLabel, style, ...rest } = props;
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.textFieldBox}>
      {fieldLabel ? <Text style={styles.textFieldLabel}>{fieldLabel}</Text> : null}
      <TextInput placeholderTextColor={colors.muted2} style={[styles.textFieldInput, style]} {...rest} />
    </View>
  );
}

export function ChipScroller({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chipScrollerContent}>
      {children}
    </ScrollView>
  );
}

type AmountFieldProps = {
  fieldLabel: string;
  value: string;
  onChangeText: (v: string) => void;
  sign?: string;
  color?: string;
  placeholder?: string;
};

export function AmountField({ fieldLabel, value, onChangeText, sign, color, placeholder = "0" }: AmountFieldProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedColor = color ?? colors.ink;
  return (
    <View style={styles.amountBox}>
      <Text style={styles.amountLabel}>{fieldLabel}</Text>
      <View style={styles.amountRow}>
        {sign ? <Text style={[styles.amountSign, { color: resolvedColor }]}>{sign}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(v) => onChangeText(v.replace(/\D/g, ""))}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.muted2}
          style={[styles.amountInput, { color: resolvedColor }]}
        />
        <Text style={styles.amountUnit}>F</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.muted, marginHorizontal: 2, marginBottom: 8 },
    textFieldBox: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
    textFieldLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    textFieldInput: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink, paddingVertical: 2 },
    chipScroller: { marginHorizontal: -20, marginBottom: 14, height: 40, flexGrow: 0 },
    chipScrollerContent: { paddingHorizontal: 20, alignItems: "center" },
    amountBox: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 14 },
    amountLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted2, marginBottom: 4 },
    amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    amountSign: { fontFamily: fonts.monoBold, fontSize: 28, fontWeight: "700" },
    amountInput: { fontFamily: fonts.monoBold, fontSize: 34, fontWeight: "700", minWidth: 140, textAlign: "center", padding: 0 },
    amountUnit: { fontFamily: fonts.sans, fontSize: 18, color: colors.muted2 },
  });
}
