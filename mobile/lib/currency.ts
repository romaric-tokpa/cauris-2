import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Devise d'affichage (FCFA/EUR/USD) — toutes les données restent stockées en
 * XOF (FCFA) côté backend, cette couche ne fait que convertir à l'AFFICHAGE.
 * État module-level (pas un Context) pour que fmt() (lib/format.ts), appelée
 * en synchrone partout dans l'app, puisse lire la devise courante sans hook.
 * PrefsProvider (lib/prefs.ts) garde ce module synchronisé avec AsyncStorage
 * et re-render ses consommateurs via son propre état React.
 */

export type Currency = "XOF" | "EUR" | "USD";

const CURRENCY_KEY = "cauris_pref_currency";
const USD_RATE_CACHE_KEY = "cauris_cache_usd_per_eur";
const USD_RATE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

/** FCFA (XOF) est fixé à l'euro par traité (zone UEMOA/CEMAC) — taux immuable, jamais approximatif. */
export const XOF_PER_EUR = 655.957;

/** Dernier taux USD/EUR connu (chargé depuis le cache au démarrage, rafraîchi en tâche de fond). Valeur de secours si jamais aucun fetch n'a encore réussi. */
let usdPerEur = 1.15;
let currentCurrency: Currency = "XOF";
let ratePromise: Promise<void> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeCurrency(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrency(): Currency {
  return currentCurrency;
}

export function currencySymbol(currency: Currency = currentCurrency): string {
  return currency === "EUR" ? "€" : currency === "USD" ? "$" : "F";
}

/** XOF -> devise choisie. EUR via le taux fixe ; USD via EUR puis le taux EUR/USD en cache. */
export function convert(amountXOF: number, currency: Currency = currentCurrency): number {
  if (currency === "XOF") return amountXOF;
  const eur = amountXOF / XOF_PER_EUR;
  return currency === "EUR" ? eur : eur * usdPerEur;
}

async function fetchUsdRate(): Promise<void> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD");
    const data = (await res.json()) as { rates?: { USD?: number } };
    const rate = data.rates?.USD;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      usdPerEur = rate;
      await AsyncStorage.setItem(USD_RATE_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
      notify();
    }
  } catch {
    // Pas de réseau : on garde le dernier taux connu (cache ou valeur de secours).
  }
}

/** Rafraîchit le taux USD si le cache est absent/périmé — sans jamais bloquer l'affichage (fmt() utilise la valeur en mémoire pendant ce temps). */
function ensureUsdRateFresh(): void {
  if (ratePromise) return;
  ratePromise = fetchUsdRate().finally(() => {
    ratePromise = null;
  });
}

/** À appeler une fois au démarrage (PrefsProvider) : restaure la devise et le cache de taux depuis AsyncStorage. */
export async function loadPersistedCurrency(): Promise<Currency> {
  try {
    const [storedCurrency, storedRate] = await Promise.all([AsyncStorage.getItem(CURRENCY_KEY), AsyncStorage.getItem(USD_RATE_CACHE_KEY)]);
    if (storedCurrency === "XOF" || storedCurrency === "EUR" || storedCurrency === "USD") {
      currentCurrency = storedCurrency;
    }
    if (storedRate) {
      const parsed = JSON.parse(storedRate) as { rate?: number; ts?: number };
      if (typeof parsed.rate === "number" && parsed.rate > 0) {
        usdPerEur = parsed.rate;
        if (!parsed.ts || Date.now() - parsed.ts > USD_RATE_MAX_AGE_MS) ensureUsdRateFresh();
      }
    } else if (currentCurrency === "USD") {
      ensureUsdRateFresh();
    }
  } catch {
    // AsyncStorage indisponible : reste sur les valeurs par défaut.
  }
  return currentCurrency;
}

export async function setCurrentCurrency(next: Currency): Promise<void> {
  currentCurrency = next;
  notify();
  AsyncStorage.setItem(CURRENCY_KEY, next).catch(() => {});
  if (next === "USD") ensureUsdRateFresh();
}
