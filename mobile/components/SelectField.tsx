import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Sheet from "./Sheet";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = {
  fieldLabel: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder?: string;
};

/** Champ "liste déroulante" : tape pour ouvrir une feuille de sélection, cohérent avec le reste des feuilles de saisie. */
export default function SelectField({ fieldLabel, value, options, onSelect, placeholder = "Choisir…" }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.box} onPress={() => setOpen(true)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{fieldLabel}</Text>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.muted2} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={fieldLabel}>
        <FlatList
          data={options}
          keyExtractor={(o) => o}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const active = item === value;
            return (
              <Pressable
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{item}</Text>
                {active ? <Feather name="check" size={18} color={colors.orange} /> : null}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.lineSoft,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 12,
    },
    label: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    value: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink, paddingVertical: 2 },
    placeholder: { color: colors.muted2, fontFamily: fonts.sans },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.lineSoft,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    optionActive: { borderColor: colors.orange },
    optionText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
    optionTextActive: { fontFamily: fonts.sansSemiBold },
  });
}
