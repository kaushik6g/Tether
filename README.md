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

```powershell
npm run check
```

## Current stage

Tether supports email and password accounts, private circles, invitations, mutual taps, and match chat.

## Supabase Auth

For password recovery, copy [the recovery email template](supabase/templates/recovery.html) into the **Reset password** template in Supabase Authentication. The app expects an emailed code.

1. Copy `.env.example` to `.env.local`.
2. In the Tether Supabase dashboard, open **Connect** and enter the project URL and publishable key in the two environment variables.
3. Enable the Email provider in Supabase Auth. If email confirmation is enabled, use a reachable site URL for the signup confirmation redirect. After confirming, reopen Tether and sign in with the same email and password.
4. Restart Expo after changing the environment variables.

## Build the circle and chat features

Apply the SQL migrations in `supabase/migrations` to the Tether Supabase project in filename order. They create profiles and private circles, expiring invitations, mutual matches, and participant-only chat. The app uses the publishable key with signed-in user sessions.

After signing in, save your display name and open **Invitations**. You can share a single-use code with a friend. They can paste the code into their Invitations screen, review who sent it, and choose whether to join.

[Publish browser invitations](docs/BROWSER_INVITATIONS.md) to give friends an HTTPS link they can open without installing Tether. Guests return to the same invitation after signing in.

A private tap expires after seven days. When friends tap each other within that window, Tether creates a catch-up and adds a suggested opener. The chat shows on both friends’ circle screens while the app is open. Either participant can mark the plan as made. Closed chats remain readable under **Catch-ups**.

[Set up background match notifications](docs/MATCH_NOTIFICATIONS.md)

[Read how circle privacy and account controls work](docs/PRIVACY_CONTROLS.md).

[Make and manage confirmed catch-up plans](docs/CATCHUP_PLANS.md).

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
- An Expo Router web route for browser invitations.

## Git workflow

Make commits for complete, understandable changes. Avoid empty commits or splitting one trivial edit into several commits.

Read the [original product concept](docs/PRODUCT_CONCEPT.md).
