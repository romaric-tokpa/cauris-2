import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode, createElement } from "react";
import { darkColors, lightColors, type ThemeColors } from "./theme";

/**
 * Préférences locales à l'appareil (jamais synchronisées au backend) : mode
 * sombre, masquage des montants, déverrouillage biométrique. Persistées via
 * AsyncStorage, chargées une fois au démarrage.
 *
 * Un écran ne suit le mode sombre que s'il calcule ses styles via
 * useColors() (voir plus bas) au lieu d'importer `colors` statiquement
 * depuis lib/theme — StyleSheet.create() figeant les couleurs une fois pour
 * toutes à l'import, la réactivité doit passer par un hook. Les écrans pas
 * encore migrés restent sur le thème clair.
 */

const KEYS = {
  dark: "cauris_pref_dark",
  hideAmounts: "cauris_pref_hide_amounts",
  biometric: "cauris_pref_biometric",
};

type Prefs = {
  dark: boolean;
  hideAmounts: boolean;
  biometric: boolean;
  loaded: boolean;
  toggleDark: () => void;
  toggleHideAmounts: () => void;
  toggleBiometric: () => void;
};

const PrefsContext = createContext<Prefs | null>(null);

async function readBool(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === "1";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([readBool(KEYS.dark), readBool(KEYS.hideAmounts), readBool(KEYS.biometric)]).then(([d, h, b]) => {
      setDark(d);
      setHideAmounts(h);
      setBiometric(b);
      setLoaded(true);
    });
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEYS.dark, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleHideAmounts = useCallback(() => {
    setHideAmounts((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEYS.hideAmounts, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleBiometric = useCallback(() => {
    setBiometric((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEYS.biometric, next ? "1" : "0");
      return next;
    });
  }, []);

  return createElement(PrefsContext.Provider, { value: { dark, hideAmounts, biometric, loaded, toggleDark, toggleHideAmounts, toggleBiometric } }, children);
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs doit être utilisé sous PrefsProvider.");
  return ctx;
}

/** Palette active (clair/sombre) selon la préférence — à utiliser à la place de l'import statique `colors` pour qu'un écran suive le mode sombre. */
export function useColors(): ThemeColors {
  const { dark } = usePrefs();
  return dark ? darkColors : lightColors;
}

/** Masque un montant déjà formaté si la préférence est active. */
export function maskAmount(display: string, hide: boolean): string {
  return hide ? "••• •••" : display;
}
