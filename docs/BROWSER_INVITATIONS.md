# Publish browser invitations

Tether's web build serves both the app and public invitation previews. The Vercel configuration routes direct links such as `/invite/<code>` to the web app. Invitation pages request that search engines skip indexing and avoid passing their URL to other sites.

1. Apply the SQL migrations in `supabase/migrations` in filename order to the Tether Supabase project.
2. Import `kaushik6g/Tether` into Vercel. Use the repository root. The build command and output directory come from `vercel.json`.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Vercel project environment. Deploy the web app.
4. Set the Supabase Auth **Site URL** to the production HTTPS origin so sign-up confirmation can return visitors to Tether.
5. Use the production HTTPS origin for `EXPO_PUBLIC_INVITE_BASE_URL` in native builds. The web app uses the origin it is serving from when this variable is empty.

A guest can preview a friend's invitation without installing Tether. The app remembers the invitation on the same browser or device while they confirm their account and sign in. They still choose whether to accept. The **Open in the Tether app** link uses the scheme registered by the native build.
