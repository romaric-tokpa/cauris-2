import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "./api";

const CACHE_KEY = "cauris_profile_photo";

/** Dernière photo connue, lue depuis le cache local (affichage immédiat avant la réponse réseau). */
export async function getCachedProfilePhoto(): Promise<string | null> {
  return AsyncStorage.getItem(CACHE_KEY);
}

async function cachePhoto(photo: string | null): Promise<void> {
  if (photo) await AsyncStorage.setItem(CACHE_KEY, photo);
  else await AsyncStorage.removeItem(CACHE_KEY);
}

export async function fetchProfilePhoto(): Promise<string | null> {
  const res = await apiFetch("/api/profile");
  const data = (await res.json()) as { photo: string | null };
  await cachePhoto(data.photo);
  return data.photo;
}

export async function uploadProfilePhoto(dataUri: string): Promise<void> {
  const res = await apiFetch("/api/profile", { method: "POST", body: JSON.stringify({ photo: dataUri }) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Envoi impossible.");
  }
  await cachePhoto(dataUri);
}

export async function removeProfilePhoto(): Promise<void> {
  await apiFetch("/api/profile", { method: "DELETE" });
  await cachePhoto(null);
}
