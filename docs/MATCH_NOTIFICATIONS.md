# Match notification setup

Background match alerts use a native Expo development or production build. Expo Go is suitable for the in-app catch-up list.

1. Apply the SQL migrations in `supabase/migrations` in order.
2. Link the app to its Expo project and configure push credentials for Android and iOS. Tether reads the linked project ID. `EXPO_PUBLIC_EAS_PROJECT_ID` is a fallback for a separately configured native build.
3. Add `TETHER_PUSH_WORKER_SECRET` as an Edge Function secret. Use the same value in Vault under `tether_push_worker_secret`. If your Expo project uses enhanced push security, also add `EXPO_PUSH_ACCESS_TOKEN` as an Edge Function secret.
4. Deploy the worker with `supabase functions deploy send-match-push --no-verify-jwt`. The worker authenticates its caller using the `x-tether-worker-key` header.
5. Enable `pg_cron` and `pg_net` in Supabase. Store the project origin in Vault under `tether_project_url`, then schedule the worker from the SQL editor.

```sql
select cron.schedule(
  'tether-match-push',
  '* * * * *',
  $worker$
    select net.http_post(
      url := (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'tether_project_url'
      ) || '/functions/v1/send-match-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-tether-worker-key', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'tether_push_worker_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $worker$
);
```

In the native app, open **Your circle → Match notifications** and enable alerts on each device you want to use. Turning alerts off or signing out removes that device registration. The lock-screen message says that a catch-up is available. The chat opens under the signed-in account’s existing access rules.

- [Set up Expo push notifications](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Schedule Supabase Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
