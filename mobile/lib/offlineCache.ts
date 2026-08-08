import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "cauris_cache_";

/** Cache local (dernière réponse connue d'une route GET) — secours quand le réseau est indisponible. */
export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // stockage indisponible : tant pis, pas de cache pour cette entrée
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
