const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inviteToken(input: string): string | null {
  const value = input.trim();
  if (tokenPattern.test(value)) return value;
  try {
    const match = new URL(value).pathname.match(/^\/invite\/([^/]+)\/?$/);
    return match && tokenPattern.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export function inviteLink(token: string): string | null {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL;
  if (!base) return null;
  try {
    const url = new URL('/invite/' + token, base);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
