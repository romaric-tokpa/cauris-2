import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, createElement } from "react";
import { Appearance } from "react-native";
import { type Currency, loadPersistedCurrency, setCurrentCurrency, subscribeCurrency } from "./currency";
import { darkColors, lightColors, type ThemeColors } from "./theme";

/**
 * Préférences locales à l'appareil (jamais synchronisées au backend) : mode
 * sombre, masquage des montants, déverrouillage biométrique, devise
 * d'affichage. Persistées via AsyncStorage, chargées une fois au démarrage.
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
  currency: Currency;
  loaded: boolean;
  toggleDark: () => void;
  toggleHideAmounts: () => void;
  toggleBiometric: () => void;
  setCurrency: (c: Currency) => void;
};

const PrefsContext = createContext<Prefs | null>(null);

async function readBool(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === "1";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(Appearance.getColorScheme() === "dark");
  const [hideAmounts, setHideAmounts] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>("XOF");
  const [loaded, setLoaded] = useState(false);
  // Tant que l'utilisateur n'a jamais touché au bouton mode sombre, le thème suit le système (au démarrage et en direct).
  const darkIsExplicit = useRef(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEYS.dark), readBool(KEYS.hideAmounts), readBool(KEYS.biometric), loadPersistedCurrency()]).then(([storedDark, h, b, c]) => {
      if (storedDark === "1" || storedDark === "0") {
        darkIsExplicit.current = true;
        setDark(storedDark === "1");
      } else {
        setDark(Appearance.getColorScheme() === "dark");
      }
      setHideAmounts(h);
      setBiometric(b);
      setCurrencyState(c);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (!darkIsExplicit.current) setDark(colorScheme === "dark");
    });
    return () => sub.remove();
  }, []);

  // Re-render quand le taux USD (fetch en tâche de fond) arrive, pour que les montants déjà affichés se corrigent.
  const [, forceRerender] = useState(0);
  useEffect(() => subscribeCurrency(() => forceRerender((n) => n + 1)), []);

  const toggleDark = useCallback(() => {
    darkIsExplicit.current = true;
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

  const setCurrency = useCallback((next: Currency) => {
    setCurrentCurrency(next);
    setCurrencyState(next);
  }, []);

  return createElement(
    PrefsContext.Provider,
    { value: { dark, hideAmounts, biometric, currency, loaded, toggleDark, toggleHideAmounts, toggleBiometric, setCurrency } },
    children,
  );
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
