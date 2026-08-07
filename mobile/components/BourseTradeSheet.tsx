import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Chip from "./Chip";
import { ChipScroller, TextField } from "./FormField";
import Sheet from "./Sheet";
import { apiFetch, UnauthorizedError } from "../lib/api";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Mode = "achat" | "vente" | "dividende" | "cours";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
  accounts: { nom: string; type: string }[];
  positions: { code: string; nom?: string; pru?: number; coursActuel?: number }[];
  activeMonthMm: string;
  initialMode: Mode;
  initialCode?: string;
};

function defaultDate(mm: string): string {
  const dd = String(new Date().getDate()).padStart(2, "0");
  return `${dd}/${mm}`;
}

const MODE_TITLE: Record<Mode, string> = { achat: "Achat de titres", vente: "Vente de titres", dividende: "Encaisser un dividende", cours: "Mettre à jour le cours" };

export default function BourseTradeSheet({ visible, onClose, onSaved, onUnauthorized, accounts, positions, activeMonthMm, initialMode, initialCode }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [qte, setQte] = useState("");
  const [prix, setPrix] = useState("");
  const [frais, setFrais] = useState("");
  const [montant, setMontant] = useState("");
  const [compte, setCompte] = useState("");
  const [pos, setPos] = useState(positions[0]?.code || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setCode("");
      setNom("");
      setQte("");
      setPrix("");
      setFrais("");
      setMontant("");
      setCompte(accounts[0]?.nom || "");
      setPos(initialCode || positions[0]?.code || "");
      setError(null);
    }
  }, [visible, initialMode, initialCode, accounts, positions]);

  const q = parseInt(qte, 10) || 0;
  const p = parseInt(prix, 10) || 0;
  const f = parseInt(frais, 10) || 0;
  const selPos = positions.find((x) => x.code === pos);
  const brut = q * p;
  const pv = selPos ? Math.round((p - (selPos.pru || 0)) * q) : 0;

  async function handleSave() {
    setError(null);
    const date = defaultDate(activeMonthMm);

    let body: Record<string, unknown>;
    if (mode === "cours") {
      if (!pos) return setError("Choisis une position.");
      if (p <= 0) return setError("Renseigne le nouveau cours.");
      body = { action: "cours", code: pos, cours: p, date };
    } else if (!compte) {
      return setError("Choisis un compte.");
    } else if (mode === "achat") {
      if (!code.trim()) return setError("Renseigne le code du titre.");
      if (q <= 0) return setError("Renseigne la quantité.");
      if (p <= 0) return setError("Renseigne le prix unitaire.");
      body = { action: "achat", code: code.trim(), nom: nom.trim() || undefined, quantite: q, prixUnitaire: p, frais: f, compte, date };
    } else if (mode === "vente") {
      if (!pos) return setError("Choisis une position.");
      if (q <= 0) return setError("Renseigne la quantité.");
      if (p <= 0) return setError("Renseigne le prix unitaire.");
      body = { action: "vente", code: pos, quantite: q, prixUnitaire: p, frais: f, compte, date };
    } else {
      if (!pos) return setError("Choisis une position.");
      const m = parseInt(montant, 10) || 0;
      if (m <= 0) return setError("Renseigne le montant reçu.");
      body = { action: "dividende", code: pos, montant: m, compte, date };
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/bourse/trade", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Échec de l'opération.");
        return;
      }
      onSaved();
    } catch (e) {
      if (e instanceof UnauthorizedError) return onUnauthorized();
      setError("Échec de l'opération.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={MODE_TITLE[mode]}>
      {mode !== "cours" ? (
        <ChipScroller>
          {(["achat", "vente", "dividende"] as Mode[]).map((m) => (
            <Chip key={m} label={m === "achat" ? "Achat" : m === "vente" ? "Vente" : "Dividende"} active={mode === m} onPress={() => setMode(m)} accent={colors.violet} />
          ))}
        </ChipScroller>
      ) : null}

      {mode === "cours" ? (
        <>
          <Text style={styles.label}>Position</Text>
          <ChipScroller>
            {positions.map((pItem) => (
              <Chip key={pItem.code} label={pItem.code} active={pos === pItem.code} onPress={() => setPos(pItem.code)} accent={colors.violet} />
            ))}
          </ChipScroller>
          <View style={styles.divBox}>
            <Text style={styles.previewLabel}>Nouveau cours{selPos ? ` (actuel ${fmt(selPos.coursActuel || 0)} F)` : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <TextField value={prix} onChangeText={(v) => setPrix(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" style={{ textAlign: "right", minWidth: 100 }} />
              <Text style={styles.previewLabel}>F</Text>
            </View>
          </View>
        </>
      ) : null}

      {mode === "achat" ? (
        <>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Code" value={code} onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))} placeholder="SNTS" autoCapitalize="characters" />
            </View>
            <View style={{ flex: 2 }}>
              <TextField fieldLabel="Nom du titre" value={nom} onChangeText={setNom} placeholder="SONATEL" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Quantité" value={qte} onChangeText={(v) => setQte(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Prix unitaire" value={prix} onChangeText={(v) => setPrix(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Frais" value={frais} onChangeText={(v) => setFrais(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
          </View>
          <Text style={styles.label}>Compte source (cash)</Text>
          <ChipScroller>
            {accounts.map((a) => (
              <Chip key={a.nom} label={a.nom} active={compte === a.nom} onPress={() => setCompte(a.nom)} accent={colors.violet} />
            ))}
          </ChipScroller>
          <View style={styles.previewBox}>
            <View>
              <Text style={styles.previewLabel}>Titres</Text>
              <Text style={styles.previewVal}>{fmt(q)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.previewLabel}>Débit total</Text>
              <Text style={[styles.previewVal, { color: colors.red }]}>−{fmt(brut + f)} F</Text>
            </View>
          </View>
        </>
      ) : null}

      {mode === "vente" ? (
        <>
          <Text style={styles.label}>Position détenue</Text>
          <ChipScroller>
            {positions.map((pItem) => (
              <Chip key={pItem.code} label={pItem.code} active={pos === pItem.code} onPress={() => setPos(pItem.code)} accent={colors.violet} />
            ))}
          </ChipScroller>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Quantité" value={qte} onChangeText={(v) => setQte(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Prix unitaire" value={prix} onChangeText={(v) => setPrix(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField fieldLabel="Frais" value={frais} onChangeText={(v) => setFrais(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
            </View>
          </View>
          <Text style={styles.label}>Compte destination</Text>
          <ChipScroller>
            {accounts.map((a) => (
              <Chip key={a.nom} label={a.nom} active={compte === a.nom} onPress={() => setCompte(a.nom)} accent={colors.violet} />
            ))}
          </ChipScroller>
          <View style={styles.previewCol}>
            <View style={styles.previewLine}>
              <Text style={styles.previewLineLabel}>Produit brut</Text>
              <Text style={styles.previewLineVal}>{fmt(brut)} F</Text>
            </View>
            <View style={styles.previewLine}>
              <Text style={styles.previewLineLabel}>Net après frais</Text>
              <Text style={styles.previewLineVal}>{fmt(brut - f)} F</Text>
            </View>
            <View style={[styles.previewLine, styles.previewLineTop]}>
              <Text style={styles.previewLineLabel}>+/- value réalisée</Text>
              <Text style={[styles.previewLineVal, { color: pv >= 0 ? colors.green : colors.red }]}>
                {pv >= 0 ? "+" : "−"}
                {fmt(Math.abs(pv))} F
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {mode === "dividende" ? (
        <>
          <Text style={styles.label}>Position</Text>
          <ChipScroller>
            {positions.map((pItem) => (
              <Chip key={pItem.code} label={pItem.code} active={pos === pItem.code} onPress={() => setPos(pItem.code)} accent={colors.violet} />
            ))}
          </ChipScroller>
          <View style={styles.divBox}>
            <Text style={styles.previewLabel}>Montant reçu</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <TextField value={montant} onChangeText={(v) => setMontant(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" style={{ textAlign: "right", minWidth: 100 }} />
              <Text style={styles.previewLabel}>F</Text>
            </View>
          </View>
          <Text style={styles.label}>Compte destination</Text>
          <ChipScroller>
            {accounts.map((a) => (
              <Chip key={a.nom} label={a.nom} active={compte === a.nom} onPress={() => setCompte(a.nom)} accent={colors.violet} />
            ))}
          </ChipScroller>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Valider l&apos;opération</Text>}
      </Pressable>
    </Sheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.muted, marginHorizontal: 2, marginBottom: 8 },
  previewBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  previewLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
  previewVal: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.ink, marginTop: 2 },
  previewCol: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.lineSoft, borderRadius: 14, padding: 14, marginBottom: 16, gap: 9 },
  previewLine: { flexDirection: "row", justifyContent: "space-between" },
  previewLineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft, paddingTop: 9 },
  previewLineLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  previewLineVal: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink },
  divBox: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: { fontFamily: fonts.sans, color: colors.red, marginBottom: 12, fontSize: 13 },
  saveBtn: { alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 16, backgroundColor: colors.violet },
  saveText: { fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" },
  });
}
