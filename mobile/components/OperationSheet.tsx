import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Chip from "./Chip";
import DateField from "./DateField";
import { AmountField, ChipScroller, TextField } from "./FormField";
import SelectField from "./SelectField";
import Sheet from "./Sheet";
import Switch from "./Switch";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { CATEGORIES_DEPENSE, CATEGORIES_REVENU } from "../lib/categories";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type OpType = "dépense" | "revenu" | "virement";

export type EditableOperation = {
  id: string;
  date?: string;
  lib?: string;
  type: string;
  compte: string;
  compteDest?: string;
  cat?: string;
  montant: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
  accounts: { nom: string; type: string }[];
  activeMonthMm: string;
  editing?: EditableOperation | null;
  initialType?: OpType;
};

const TYPE_SIGN: Record<OpType, string> = { dépense: "−", revenu: "+", virement: "⇄" };

function defaultDate(mm: string): string {
  const dd = String(new Date().getDate()).padStart(2, "0");
  return `${dd}/${mm}`;
}

function normalizeType(raw: string): OpType {
  return raw === "revenu" || raw === "virement" ? raw : "dépense";
}

export default function OperationSheet({ visible, onClose, onSaved, onUnauthorized, accounts, activeMonthMm, editing, initialType }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const TYPE_COLOR: Record<OpType, string> = { dépense: colors.red, revenu: colors.green, virement: colors.ink };
  const [type, setType] = useState<OpType>("dépense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate(activeMonthMm));
  const [lib, setLib] = useState("");
  const [compte, setCompte] = useState("");
  const [compteDest, setCompteDest] = useState("");
  const [cat, setCat] = useState("");
  const [frais, setFrais] = useState("");
  const [asDette, setAsDette] = useState(false);
  const [detteEcheance, setDetteEcheance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setType(normalizeType(editing.type));
      setAmount(String(Math.abs(editing.montant)));
      setDate(editing.date || defaultDate(activeMonthMm));
      setLib(editing.lib || "");
      setCompte(editing.compte || accounts[0]?.nom || "");
      setCompteDest(editing.compteDest || "");
      setCat(editing.cat || "");
    } else {
      setType(initialType ?? "dépense");
      setAmount("");
      setDate(defaultDate(activeMonthMm));
      setLib("");
      setCompte(accounts[0]?.nom || "");
      setCompteDest("");
      setCat("");
      setFrais("");
      setAsDette(false);
      setDetteEcheance("");
    }
    setError(null);
  }, [visible, editing, activeMonthMm, accounts, initialType]);

  const categories = type === "revenu" ? CATEGORIES_REVENU : CATEGORIES_DEPENSE;
  const isVir = type === "virement";

  async function handleSave() {
    setError(null);
    if (!lib.trim()) return setError("Renseigne le libellé.");
    if (!date.trim()) return setError("Renseigne la date.");
    const montantNum = parseFloat(amount);
    if (!montantNum) return setError("Renseigne le montant.");
    if (!compte) return setError("Choisis un compte.");
    if (isVir && !compteDest) return setError("Choisis un compte de destination.");

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type,
        montant: montantNum,
        date: date.trim(),
        lib: lib.trim(),
        compte,
        compteDest: isVir ? compteDest : undefined,
        cat: !isVir ? cat : undefined,
      };
      if (!editing && frais) body.frais = parseFloat(frais);
      if (!editing && type === "dépense" && asDette) {
        body.asDette = true;
        body.detteEcheance = detteEcheance.trim() || undefined;
      }

      const res = editing
        ? await apiFetch(`/api/operations/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await apiFetch("/api/operations", { method: "POST", body: JSON.stringify(body) });

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

  function handleDelete() {
    if (!editing) return;
    Alert.alert("Supprimer l'opération", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            const res = await apiFetch(`/api/operations/${editing.id}`, { method: "DELETE" });
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
        },
      },
    ]);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? "Modifier l'opération" : isVir ? "Nouveau virement" : type === "revenu" ? "Nouveau revenu" : "Nouvelle dépense"}>
      <ChipScroller>
        {(["dépense", "revenu", "virement"] as OpType[]).map((t) => (
          <Chip key={t} label={t === "dépense" ? "Dépense" : t === "revenu" ? "Revenu" : "Virement"} active={type === t} onPress={() => setType(t)} accent={colors.orange} />
        ))}
      </ChipScroller>

      <AmountField fieldLabel="Montant" value={amount} onChangeText={setAmount} sign={TYPE_SIGN[type]} color={TYPE_COLOR[type]} />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField fieldLabel="Date" value={date} onChangeText={setDate} placeholder="JJ/MM" />
        </View>
        <View style={[styles.rowItem, { flex: 2 }]}>
          <TextField fieldLabel="Libellé" value={lib} onChangeText={setLib} placeholder="Ex. Loyer août" />
        </View>
      </View>

      <Text style={styles.label}>Compte {isVir ? "source" : ""}</Text>
      <ChipScroller>
        {accounts.map((a) => (
          <Chip key={a.nom} label={a.nom} active={compte === a.nom} onPress={() => setCompte(a.nom)} accent={colors.orange} />
        ))}
      </ChipScroller>

      {isVir ? (
        <>
          <Text style={styles.label}>Compte destination</Text>
          <ChipScroller>
            {accounts
              .filter((a) => a.nom !== compte)
              .map((a) => (
                <Chip key={a.nom} label={a.nom} active={compteDest === a.nom} onPress={() => setCompteDest(a.nom)} accent={colors.orange} />
              ))}
          </ChipScroller>
        </>
      ) : (
        <SelectField fieldLabel="Catégorie" value={cat} options={categories} onSelect={setCat} placeholder="Choisir une catégorie…" />
      )}

      {!editing ? (
        <View style={styles.fraisBox}>
          <View>
            <Text style={styles.fraisTitle}>Frais de transaction</Text>
            <Text style={styles.fraisSub}>Crée une ligne liée · catégorie Frais</Text>
          </View>
          <TextField value={frais} onChangeText={(v) => setFrais(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" style={styles.fraisInput} />
        </View>
      ) : null}

      {!editing && type === "dépense" ? (
        <>
          <View style={styles.detteBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fraisTitle}>Dette à rembourser</Text>
              <Text style={styles.fraisSub}>L'argent vient d'un coffre — à suivre dans Coffres</Text>
            </View>
            <Switch value={asDette} onValueChange={setAsDette} />
          </View>
          {asDette ? (
            <DateField fieldLabel="Échéance de remboursement" value={detteEcheance} onChange={setDetteEcheance} />
          ) : null}
        </>
      ) : null}

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
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.muted, marginHorizontal: 2, marginBottom: 8 },
  fraisBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detteBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fraisTitle: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink },
  fraisSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2, marginTop: 2 },
  fraisInput: { width: 100, marginBottom: 0 },
  error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  deleteBtn: { width: 58, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.redBg },
  saveBtn: { flex: 1, alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.orange },
  saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
