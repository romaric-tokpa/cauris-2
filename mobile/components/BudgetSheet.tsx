import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Chip from "./Chip";
import { AmountField, ChipScroller } from "./FormField";
import Sheet from "./Sheet";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { CATEGORIES_DEPENSE } from "../lib/categories";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

export type EditableBudget = { cat: string; budget: number };

type Props = { visible: boolean; onClose: () => void; onSaved: () => void; onUnauthorized: () => void; editing?: EditableBudget | null };

export default function BudgetSheet({ visible, onClose, onSaved, onUnauthorized, editing }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cat, setCat] = useState(CATEGORIES_DEPENSE[0]);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCat(editing?.cat || CATEGORIES_DEPENSE[0]);
      setAmount(editing ? String(editing.budget) : "");
      setError(null);
    }
  }, [visible, editing]);

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return setError("Renseigne un montant.");
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/budget", { method: "POST", body: JSON.stringify({ cat, montant: Number(amount) }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Échec de l'enregistrement.");
        return;
      }
      onSaved();
    } catch (e) {
      if (e instanceof UnauthorizedError) return onUnauthorized();
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/budget?cat=${encodeURIComponent(editing.cat)}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Échec de la suppression.");
        return;
      }
      onSaved();
    } catch (e) {
      if (e instanceof UnauthorizedError) return onUnauthorized();
      setError("Échec de la suppression.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? "Modifier le budget" : "Nouveau budget"}>
      <Text style={styles.label}>Catégorie</Text>
      <ChipScroller>
        {CATEGORIES_DEPENSE.map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} accent={colors.orange} />
        ))}
      </ChipScroller>
      <AmountField fieldLabel="Budget mensuel" value={amount} onChangeText={setAmount} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        {editing ? (
          <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
            <Feather name="trash-2" size={18} color={colors.red} />
          </Pressable>
        ) : null}
        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
        </Pressable>
      </View>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.muted, marginHorizontal: 2, marginBottom: 8 },
    error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 13 },
    actions: { flexDirection: "row", gap: 10 },
    deleteBtn: { width: 58, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.redBg },
    saveBtn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.orange },
    saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
