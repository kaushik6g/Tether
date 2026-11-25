import AsyncStorage from '@react-native-async-storage/async-storage';

import { inviteToken } from '@/features/invites';

const storageKey = 'tether.pending-circle-invite';
const lifetimeMs = 24 * 60 * 60 * 1000;
type PendingInvite = { token: string; email: string; expiresAt: number };
let pendingInMemory: PendingInvite | null = null;

export async function rememberInvite(token: string, email: string) {
  const entry: PendingInvite = { token, email: email.toLowerCase(), expiresAt: Date.now() + lifetimeMs };
  pendingInMemory = entry;
  await AsyncStorage.setItem(storageKey, JSON.stringify(entry)).catch(() => {
    // The current session can still return to the invite without durable storage.
  });
}

export async function readInvite(email: string): Promise<PendingInvite | null> {
  if (pendingInMemory) {
    if (pendingInMemory.expiresAt <= Date.now()) {
      pendingInMemory = null;
    } else {
      return pendingInMemory.email === email.toLowerCase() ? pendingInMemory : null;
    }
  }
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return null;
  let entry: Partial<PendingInvite> | null;
  try {
    entry = JSON.parse(stored) as Partial<PendingInvite> | null;
  } catch {
    return null;
  }
  const token = typeof entry?.token === 'string' ? inviteToken(entry.token) : null;
  if (!token || typeof entry?.expiresAt !== 'number' || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= Date.now()) {
    return null;
  }
  if (entry.email !== email.toLowerCase()) return null;
  return { token, email: entry.email, expiresAt: entry.expiresAt };
}

export async function forgetInvite(entry: PendingInvite) {
  if (pendingInMemory === entry) pendingInMemory = null;
  if (await AsyncStorage.getItem(storageKey) === JSON.stringify(entry)) {
    await AsyncStorage.removeItem(storageKey);
  }
}
