import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Chip from "./Chip";
import { AmountField, ChipScroller, TextField } from "./FormField";
import Sheet from "./Sheet";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { visible: boolean; onClose: () => void; onSaved: () => void; onUnauthorized: () => void };

const GROUPS: { label: string; type: string }[] = [
  { label: "Disponible", type: "disponible" },
  { label: "Épargne (coffres)", type: "épargne" },
  { label: "Bloqué", type: "bloqué" },
];

export default function AccountSheet({ visible, onClose, onSaved, onUnauthorized }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nom, setNom] = useState("");
  const [type, setType] = useState(GROUPS[0].type);
  const [solde, setSolde] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNom("");
      setType(GROUPS[0].type);
      setSolde("");
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    if (!nom.trim()) return setError("Renseigne le nom du compte.");
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/accounts", { method: "POST", body: JSON.stringify({ nom: nom.trim(), type, solde: solde ? Number(solde) : 0 }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Échec de la création.");
        return;
      }
      onSaved();
    } catch (e) {
      if (e instanceof UnauthorizedError) return onUnauthorized();
      setError("Échec de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouveau compte">
      <TextField fieldLabel="Nom du compte" value={nom} onChangeText={setNom} placeholder="Ex. UBA Courant" />
      <ChipScroller>
        {GROUPS.map((g) => (
          <Chip key={g.type} label={g.label} active={type === g.type} onPress={() => setType(g.type)} accent={colors.orange} />
        ))}
      </ChipScroller>
      <AmountField fieldLabel="Solde initial" value={solde} onChangeText={setSolde} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Créer le compte</Text>}
      </Pressable>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 13 },
    saveBtn: { alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.orange },
    saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
