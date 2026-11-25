import { loadEnvFile } from 'node:process';

// Match Expo's precedence for a production export. Existing shell variables win.
for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  try {
    loadEnvFile(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Could not load ' + file);
  }
}

const target = process.argv[2] ?? 'web';
if (!['android', 'ios', 'web'].includes(target) || process.argv.length > 3) {
  console.error('Usage: npm run check:release-env -- [web|android|ios]');
  process.exit(1);
}

function isHttpsOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !!parsed.hostname && parsed.pathname === '/' &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

const env = process.env;
const problems = [];
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
if (!isHttpsOrigin(supabaseUrl) || supabaseUrl === 'https://your-project-ref.supabase.co') {
  problems.push('EXPO_PUBLIC_SUPABASE_URL must be the Supabase project HTTPS origin.');
}
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '')) {
  problems.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain a Supabase publishable key.');
}
const inviteOrigin = env.EXPO_PUBLIC_INVITE_BASE_URL;
if ((target !== 'web' || inviteOrigin) && !isHttpsOrigin(inviteOrigin)) {
  problems.push('EXPO_PUBLIC_INVITE_BASE_URL must be the browser invitation HTTPS origin.');
}

for (const problem of problems) console.error(problem);
if (problems.length) process.exitCode = 1;
else console.log('Release environment is configured for ' + target + '.');
