export function isHttpsOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !!parsed.hostname && parsed.pathname === '/' &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

export function isSupabaseOrigin(value: string | undefined) {
  return !!value && isHttpsOrigin(value) && new URL(value).hostname !== 'your-project-ref.supabase.co';
}

export function isSupabasePublishableKey(value: string | undefined) {
  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(value ?? '');
}
