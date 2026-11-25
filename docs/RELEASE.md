# Release Tether

## Before publishing

Run `npm ci`, `npm run check`, and `npm run build:web` from a clean checkout. Check that the target Supabase project has all migrations in `supabase/migrations` applied in order. Keep the service-role key on the backend. The Expo client uses a publishable key.

## Web

Set the Supabase project URL and publishable key in Vercel and deploy over HTTPS. Set the Supabase Auth Site URL to the deployed origin. That origin also serves the browser invitation pages.

Install the included recovery email template under **Authentication → Email Templates → Reset password** before enabling password recovery. The recovery form expects a code from that email.

## Mobile

Link the Expo project and configure notification credentials before creating the mobile build. Set the browser invite origin with `EXPO_PUBLIC_INVITE_BASE_URL`. Background match alerts also need the scheduled Supabase worker.

- [Browser invitations](BROWSER_INVITATIONS.md)
- [Match notification setup](MATCH_NOTIFICATIONS.md)
