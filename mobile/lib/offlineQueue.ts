import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { apiFetch, UnauthorizedError } from "./api";

/**
 * File d'attente des opérations créées hors ligne (dépense/revenu/virement,
 * voir OperationSheet.tsx) — en attente d'envoi à /api/operations dès que le
 * réseau revient. Ne couvre PAS l'édition/suppression d'opérations
 * existantes, ni les autres écritures (Bourse, coffres, budget) : seule la
 * saisie d'une nouvelle opération peut se faire hors ligne.
 */

const QUEUE_KEY = "cauris_offline_queue";

export type QueuedOperation = { id: string; body: Record<string, unknown>; createdAt: number };

let queue: QueuedOperation[] = [];
let loaded = false;
let syncing = false;

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
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // pire cas : la file ne survit pas à la fermeture de l'app, mais reste utilisable pendant la session
  }
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    queue = raw ? JSON.parse(raw) : [];
  } catch {
    queue = [];
  }
  loaded = true;
  notify();
}

export function getQueue(): QueuedOperation[] {
  return queue;
}

export async function enqueueOperation(body: Record<string, unknown>): Promise<void> {
  await ensureLoaded();
  const item: QueuedOperation = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, body, createdAt: Date.now() };
  queue = [...queue, item];
  await persist();
  notify();
}

/** Envoie chaque opération en attente ; celles qui échouent encore (toujours hors ligne, ou rejetées) restent dans la file. */
export async function syncQueue(): Promise<{ synced: number; remaining: number }> {
  await ensureLoaded();
  if (syncing || queue.length === 0) return { synced: 0, remaining: queue.length };
  syncing = true;

  let synced = 0;
  let stopped = false;
  const stillPending: QueuedOperation[] = [];
  for (const item of queue) {
    if (stopped) {
      stillPending.push(item);
      continue;
    }
    try {
      const res = await apiFetch("/api/operations", { method: "POST", body: JSON.stringify(item.body) });
      if (res.ok) synced++;
      else stillPending.push(item);
    } catch (e) {
      stillPending.push(item);
      if (e instanceof UnauthorizedError) stopped = true; // session expirée : inutile d'insister sur le reste maintenant
    }
  }

  queue = stillPending;
  await persist();
  syncing = false;
  notify();
  return { synced, remaining: queue.length };
}

/** Nombre d'opérations en attente — se met à jour en direct (mise en file, synchronisation). */
export function useQueueLength(): number {
  const [len, setLen] = useState(queue.length);
  useEffect(() => {
    ensureLoaded().then(() => setLen(queue.length));
    return subscribe(() => setLen(queue.length));
  }, []);
  return len;
}
