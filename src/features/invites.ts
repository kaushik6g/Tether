const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inviteToken(input: string): string | null {
  const value = input.trim();
  if (tokenPattern.test(value)) return value.toLowerCase();
  try {
    const url = new URL(value);
    const path = url.protocol === 'tether:' && url.hostname === 'invite'
      ? '/invite' + url.pathname
      : url.pathname;
    const match = path.match(/^\/invite\/([^/]+)\/?$/);
    return match && tokenPattern.test(match[1]) ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function sharedInviteToken(input: string): string | null {
  const direct = inviteToken(input);
  if (direct) return direct;

  const candidates = input.match(/(?:https?:\/\/|tether:\/\/)[^\s<>"']+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi) ?? [];
  const tokens = new Set(candidates.map((candidate) => inviteToken(candidate.replace(/[.,!?)]+$/, ''))).filter(Boolean));
  return tokens.size === 1 ? (tokens.values().next().value ?? null) : null;
}

export function inviteLink(token: string): string | null {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL || globalThis.location?.origin;
  if (!base) return null;
  try {
    const url = new URL('/invite/' + token, base);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function inviteAppLink(token: string): `tether://invite/${string}` {
  return `tether://invite/${token}`;
}
