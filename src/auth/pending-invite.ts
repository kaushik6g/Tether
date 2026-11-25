import AsyncStorage from '@react-native-async-storage/async-storage';

import { inviteToken } from '@/features/invites';

const storageKey = 'tether.pending-circle-invite';
const lifetimeMs = 24 * 60 * 60 * 1000;
type PendingInvite = { token: string; email: string; expiresAt: number };

export async function rememberInvite(token: string, email: string) {
  const entry: PendingInvite = { token, email: email.toLowerCase(), expiresAt: Date.now() + lifetimeMs };
  await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
}

export async function readInvite(email: string): Promise<PendingInvite | null> {
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
  if (await AsyncStorage.getItem(storageKey) === JSON.stringify(entry)) {
    await AsyncStorage.removeItem(storageKey);
  }
}
