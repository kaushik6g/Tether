import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

type Registration = { userId: string; token: string };
const storageKey = 'tether.match-push.registration';
const projectId = Constants.easConfig?.projectId ??
  Constants.expoConfig?.extra?.eas?.projectId ??
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export const matchPushAvailable = typeof projectId === 'string' && projectId.length > 0 && !!supabase;

let updates = Promise.resolve<unknown>(undefined);

function serialize<T>(update: () => Promise<T>): Promise<T> {
  const pending = updates.then(update);
  updates = pending.catch(() => {});
  return pending;
}

async function registration(): Promise<Registration | null> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return null;
  const entry = JSON.parse(stored) as Partial<Registration> | null;
  return typeof entry?.userId === 'string' && typeof entry.token === 'string'
    ? { userId: entry.userId, token: entry.token }
    : null;
}

async function register(token: string) {
  if (!supabase) throw new Error('Match notifications are unavailable.');
  const { error } = await supabase.rpc('register_match_push_device', { device_token: token });
  if (error) throw new Error('Could not enable match notifications. Try again.');
}

async function unregister(token: string) {
  if (!supabase) throw new Error('Match notifications are unavailable.');
  const { error } = await supabase.rpc('unregister_match_push_device', { device_token: token });
  if (error) throw new Error('Could not disable match notifications. Try again.');
}

async function updateRegistration(userId: string, previous: Registration | null, options?: Notifications.ExpoPushTokenOptions) {
  if (!matchPushAvailable) throw new Error('This mobile build needs an Expo project to enable notifications.');
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId, ...options });

  if (previous?.userId === userId && previous.token !== token) await unregister(previous.token);
  const rollback = previous?.userId !== userId || previous.token !== token;

  // Keep the prior registration recoverable if either local storage or the request fails.
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify({ userId, token }));
    await register(token);
  } catch (error) {
    if (rollback) {
      try {
        await unregister(token);
      } catch {
        throw error; // Keep the new token locally so Disable or Sign out can retry cleanup.
      }
      if (previous) await AsyncStorage.setItem(storageKey, JSON.stringify(previous));
      else await AsyncStorage.removeItem(storageKey);
    }
    throw error;
  }
}

async function permissionGranted() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export function matchPushEnabled(userId: string) {
  return serialize(async () => (await registration())?.userId === userId && await permissionGranted());
}

export function enableMatchPush(userId: string) {
  return serialize(async () => {
    if (!matchPushAvailable) throw new Error('This mobile build needs an Expo project to enable notifications.');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Catch-ups',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    if (!await permissionGranted()) {
      await Notifications.requestPermissionsAsync();
      if (!await permissionGranted()) throw new Error('Allow Tether notifications in your device settings, then try again.');
    }

    await updateRegistration(userId, await registration());
  });
}

export function disableMatchPush(userId: string) {
  return serialize(async () => {
    const previous = await registration();
    if (previous?.userId !== userId) return;
    await unregister(previous.token);
    await AsyncStorage.removeItem(storageKey);
  });
}

export function syncMatchPush(userId: string, devicePushToken?: Notifications.DevicePushToken) {
  return serialize(async () => {
    const previous = await registration();
    if (previous?.userId !== userId) return;
    if (!await permissionGranted()) {
      await unregister(previous.token);
      await AsyncStorage.removeItem(storageKey);
      return;
    }
    if (matchPushAvailable) {
      await updateRegistration(userId, previous, devicePushToken ? { devicePushToken } : undefined);
    }
  });
}
