# Release Tether

## Before publishing

Run `npm ci` and `npm run check` from a clean checkout. Set the release environment variables in the shell or the appropriate local Expo environment file, then run the checks for your target.

| Target | Check configuration | Export a bundle |
| --- | --- | --- |
| Web | `npm run check:release-env -- web` | `npm run build:web` writes to `dist/` |
| Android | `npm run check:release-env -- android` | `npm run build:android` writes to `dist/android/` |
| iOS | `npm run check:release-env -- ios` | `npx expo export --platform ios --output-dir dist/ios` |

A native bundle export checks that Metro can package the code. Use EAS Build to create signed Android and iOS releases. Run native exports after the web export when using the same checkout, since the web export can clear its output directory.

Check that the target Supabase project has all migrations in `supabase/migrations` applied in order. Keep the service-role key on the backend. The Expo client uses a publishable key.

## Web

Set the Supabase project URL and publishable key in Vercel and deploy over HTTPS. Set the Supabase Auth Site URL to the deployed origin. That origin also serves the browser invitation pages.

For the signup age check, apply `20261125002200_signup_age_attestation.sql` and `20261125002300_private_signup_birth_dates.sql` before enabling the updated signup flow. In **Authentication → Hooks → Before User Created**, enable the hook and select `public.require_tether_signup_age`. Coordinate the migration with the updated app release if this hook is already enabled. The app and hook check the self-reported date against an 18-year minimum using the UTC calendar date. The signup trigger saves the date in `tether_private.account_birth_dates` and removes it from Auth metadata. Account deletion removes the private row. Existing accounts can sign in without supplying a date.

Install the included recovery email template under **Authentication → Email Templates → Reset password** before enabling password recovery. The recovery form expects a code from that email.

## Restore account access

If the app says account access is unavailable, check that the build's `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for the same project. For local development, use `.env.local` and restart Metro with `npm run start -- --clear`. For a cloud build, set both variables in the environment used by its build profile, then rebuild. Web and Android bundle exports validate the auth configuration before packaging.

## Mobile

Link the Expo project and configure notification credentials before creating the mobile build. Set the browser invite origin with `EXPO_PUBLIC_INVITE_BASE_URL`. Background match alerts also need the scheduled Supabase worker.

- [Browser invitations](BROWSER_INVITATIONS.md)
- [Match notification setup](MATCH_NOTIFICATIONS.md)
