# Tether

Tether helps people reconnect with close friends through private, mutual signals. One-sided taps stay private. When both friends tap for each other, Tether opens a small chat to help them make a plan.

## Local development

Use Node.js 24 LTS and npm.

```powershell
npm ci
npm run start
```

Use the Expo development server to open the app on a device, Android emulator, iOS simulator, or web browser. The iOS simulator requires macOS.

Run these checks before opening a pull request.

`powershell
npm run lint
npm run typecheck
`

## Current stage

Tether has a welcome screen, email and password accounts, and a signed-in circle screen. Adding friends and private taps are planned for later phases.

## Supabase Auth

1. Copy `.env.example` to `.env.local`.
2. In the Tether Supabase dashboard, open **Connect** and enter the project URL and publishable key in the two environment variables.
3. Enable the Email provider in Supabase Auth. If email confirmation is enabled, use a reachable site URL for the signup confirmation redirect. After confirming, reopen Tether and sign in with the same email and password.
4. Restart Expo after changing the environment variables.

## Product principles

- One-sided taps stay private.
- Only mutual taps create a match.
- Tether starts the conversation with a concrete plan suggestion.
- Circles stay small and are chosen by each user.
- Browser invitations explain the invite before the recipient installs the app.

## Planned stack

- React Native, Expo, Expo Router, and TypeScript for the mobile app.
- Supabase Auth and PostgreSQL for identity and relational data.
- PostgreSQL functions and row-level security for private mutual matching.
- Expo push notifications for match alerts.
- A small Next.js site on Vercel for browser invitations and app links.

## Git workflow

Make commits for complete, understandable changes. Avoid empty commits or splitting one trivial edit into several commits.

Read the [original product concept](docs/PRODUCT_CONCEPT.md).
