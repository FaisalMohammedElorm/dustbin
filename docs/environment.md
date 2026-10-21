# Environment variables

Expo inlines variables prefixed `EXPO_PUBLIC_` into the app bundle at build time. **Anything with that prefix is public.** Put only values that are safe to ship in an app there.

| Variable | Required | Value |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` (Settings → API) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | The **publishable / anon** key (Settings → API) |

Local development: copy `.env.example` to `.env.local` (git-ignored). Restart with `npx expo start --clear` after changing values.

EAS builds: set the same variables as EAS environment variables (`npx eas-cli@latest env:create`) for each environment (development, preview, production).

## Never put these in the app

- The Supabase **service-role** key or database password.
- Payment provider secret keys or webhook secrets.
- SMS or push provider secrets.

These belong only on trusted servers (Supabase Edge Function secrets, or your own backend).

## Behaviour when unset

If either variable is missing or malformed, the app shows a **Backend not configured** screen with setup steps. It never falls back to mock data.
