import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AmountField, TextField } from "./FormField";
import Sheet from "./Sheet";
import SwitchToggle from "./Switch";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { visible: boolean; onClose: () => void; onSaved: () => void; onUnauthorized: () => void };

export default function CoffreSheet({ visible, onClose, onSaved, onUnauthorized }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [nom, setNom] = useState("");
  const [objectif, setObjectif] = useState("");
  const [bloque, setBloque] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNom("");
      setObjectif("");
      setBloque(false);
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    if (!nom.trim()) return setError("Renseigne le nom du coffre.");
    if (!objectif || Number(objectif) <= 0) return setError("Renseigne un objectif.");
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/coffres", { method: "POST", body: JSON.stringify({ nom: nom.trim(), objectif: Number(objectif), bloque }) });
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
    <Sheet visible={visible} onClose={onClose} title="Nouveau coffre">
      <TextField fieldLabel="Nom du coffre" value={nom} onChangeText={setNom} placeholder="Ex. Coffre voyage" />
      <AmountField fieldLabel="Objectif" value={objectif} onChangeText={setObjectif} />
      <View style={styles.bloqueRow}>
        <View>
          <Text style={styles.bloqueTitle}>Épargne bloquée</Text>
          <Text style={styles.bloqueSub}>Non disponible au quotidien</Text>
        </View>
        <SwitchToggle value={bloque} onValueChange={setBloque} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Créer le coffre</Text>}
      </Pressable>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bloqueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.lineSoft,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    bloqueTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
    bloqueSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginTop: 2 },
    error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 13 },
    saveBtn: { alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.orange },
    saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
