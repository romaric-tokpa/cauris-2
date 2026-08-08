import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/**
 * État "lu/non lu" des notifications, persisté et partagé entre la pastille de la cloche
 * (Accueil) et la feuille de notifications — sans cette persistance partagée, marquer une
 * notification comme lue dans la feuille ne faisait pas bouger le compteur de la cloche.
 * Les notifications elles-mêmes (fetchNotifications) sont recalculées à la volée à partir
 * des données ; seul l'ensemble des id lus doit survivre, sur le même principe pub-sub que
 * offlineQueue.ts.
 */

const KEY = "cauris_notif_read";

let readIds = new Set<string>();
let loaded = false;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...readIds]));
  } catch {
    // pire cas : l'état lu/non lu ne survit pas au redémarrage de l'app
  }
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    readIds = raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    readIds = new Set();
  }
  loaded = true;
  notify();
}

export function markRead(id: string): void {
  if (readIds.has(id)) return;
  readIds.add(id);
  persist();
  notify();
}

export function markAllRead(ids: string[]): void {
  ids.forEach((id) => readIds.add(id));
  persist();
  notify();
}

/** Réactif : se met à jour dès qu'une notification est marquée lue, où que ce soit dans l'app. */
export function useReadIds(): Set<string> {
  const [ids, setIds] = useState(readIds);
  useEffect(() => {
    ensureLoaded().then(() => setIds(new Set(readIds)));
    return subscribe(() => setIds(new Set(readIds)));
  }, []);
  return ids;
}
