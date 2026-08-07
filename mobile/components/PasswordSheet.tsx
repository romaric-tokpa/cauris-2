import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Sheet from "./Sheet";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Props = { visible: boolean; onClose: () => void; onUnauthorized: () => void };

function strengthOf(pw: string, colors: ThemeColors): { label: string; color: string; pct: number } {
  const score = (pw.length >= 8 ? 1 : 0) + (pw.length >= 12 ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  if (pw.length >= 8 && score >= 4) return { label: "Fort", color: colors.green, pct: 100 };
  if (pw.length >= 8 && score >= 2) return { label: "Moyen", color: colors.amber, pct: 67 };
  return { label: "Faible", color: colors.red, pct: 34 };
}

export default function PasswordSheet({ visible, onClose, onUnauthorized }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setOldPw("");
      setNewPw("");
      setConfirm("");
      setShow(false);
      setDone(false);
      setError(null);
    }
  }, [visible]);

  const strength = useMemo(() => strengthOf(newPw, colors), [newPw, colors]);
  const mismatch = confirm.length > 0 && newPw !== confirm;
  const canSave = oldPw.length > 0 && newPw.length >= 8 && newPw === confirm;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/password", { method: "POST", body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error === "invalid_password" ? "Mot de passe actuel incorrect." : "Échec de la mise à jour.");
        return;
      }
      setDone(true);
    } catch (e) {
      if (e instanceof UnauthorizedError) return onUnauthorized();
      setError("Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Sheet visible={visible} onClose={onClose} title="Mot de passe">
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={26} color={colors.green} />
          </View>
          <Text style={styles.doneTitle}>Mot de passe modifié</Text>
          <Text style={styles.doneSub}>Ton nouveau mot de passe est actif. Utilise-le à ta prochaine connexion.</Text>
          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Terminé</Text>
          </Pressable>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Mot de passe">
      <Text style={styles.label}>Mot de passe actuel</Text>
      <View style={styles.fieldRow}>
        <TextInput style={styles.field} secureTextEntry={!show} value={oldPw} onChangeText={setOldPw} placeholder="••••••••" placeholderTextColor={colors.muted2} />
        <Pressable style={styles.eyeBtn} onPress={() => setShow((v) => !v)}>
          <Feather name={show ? "eye-off" : "eye"} size={17} color={colors.muted2} />
        </Pressable>
      </View>

      <Text style={styles.label}>Nouveau mot de passe</Text>
      <View style={styles.fieldBox}>
        <TextInput
          style={styles.fieldPlain}
          secureTextEntry={!show}
          value={newPw}
          onChangeText={setNewPw}
          placeholder="8 caractères minimum"
          placeholderTextColor={colors.muted2}
        />
      </View>
      {newPw.length > 0 ? (
        <View style={styles.strengthRow}>
          <View style={styles.strengthTrack}>
            <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
      <View style={styles.fieldBox}>
        <TextInput
          style={styles.fieldPlain}
          secureTextEntry={!show}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Retaper le mot de passe"
          placeholderTextColor={colors.muted2}
        />
      </View>

      {mismatch ? <Text style={styles.error}>Les mots de passe ne correspondent pas</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={handleSave} disabled={!canSave || saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Mettre à jour</Text>}
      </Pressable>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.muted, marginHorizontal: 2, marginBottom: 8 },
    fieldRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, paddingLeft: 14, marginBottom: 14 },
    field: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 10 },
    eyeBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    fieldBox: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
    fieldPlain: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
    strengthRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 2, marginBottom: 14 },
    strengthTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.segmentOff, overflow: "hidden" },
    strengthFill: { height: "100%", borderRadius: 999 },
    strengthLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
    error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 12.5 },
    saveBtn: { alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.anthracite, marginTop: 8 },
    saveBtnDisabled: { backgroundColor: colors.segmentOff },
    saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
    doneWrap: { alignItems: "center", gap: 12, paddingVertical: 26, paddingHorizontal: 10 },
    doneIcon: { width: 64, height: 64, borderRadius: 999, backgroundColor: colors.greenBg, alignItems: "center", justifyContent: "center" },
    doneTitle: { fontFamily: fonts.sansBold, fontSize: 19, color: colors.ink },
    doneSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted2, textAlign: "center", maxWidth: 260 },
    doneBtn: { marginTop: 8, width: "100%", alignItems: "center", padding: 15, borderRadius: 16, backgroundColor: colors.anthracite },
    doneBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
