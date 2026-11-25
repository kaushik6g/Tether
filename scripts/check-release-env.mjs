import { loadEnvFile } from 'node:process';

import { isHttpsOrigin, isSupabaseOrigin, isSupabasePublishableKey } from '../src/lib/auth-config.ts';

// Match Expo's precedence for a production export. Existing shell variables win.
for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  try {
    loadEnvFile(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Could not load ' + file);
  }
}

const target = process.argv[2] ?? 'web';
if (!['android', 'ios', 'web', 'auth'].includes(target) || process.argv.length > 3) {
  console.error('Usage: npm run check:release-env -- [web|android|ios|auth]');
  process.exit(1);
}

const env = process.env;
const problems = [];
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
if (!isSupabaseOrigin(supabaseUrl)) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL must be the Supabase project HTTPS origin.');
}
if (!isSupabasePublishableKey(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim())) {
  problems.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain a Supabase publishable key.');
}
const inviteOrigin = env.EXPO_PUBLIC_INVITE_BASE_URL;
if (target !== 'auth' && (target !== 'web' || inviteOrigin) && !isHttpsOrigin(inviteOrigin)) {
  problems.push('EXPO_PUBLIC_INVITE_BASE_URL must be the browser invitation HTTPS origin.');
}

for (const problem of problems) console.error(problem);
if (problems.length) process.exitCode = 1;
else console.log(target === 'auth' ? 'Supabase account configuration is valid.' : 'Release environment is configured for ' + target + '.');
