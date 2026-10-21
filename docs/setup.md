# Setup

## Prerequisites

- Node 20+ and npm (the project uses `package-lock.json`).
- A Supabase project (free tier is fine for development).
- For device testing: Expo Go, or a development build (recommended, because the app uses native modules for location, camera and image manipulation).

## 1. Install

```bash
npm install
```

Always add dependencies with `npx expo install <pkg>` so versions match SDK 57.

## 2. Create the database

1. Create a project at https://supabase.com.
2. Apply the migration in `supabase/migrations/` using either:
   - **SQL editor:** paste `20261016000000_initial_schema.sql` and run it, or
   - **CLI:** `npx supabase link --project-ref <ref>`, then `npx supabase db push`.
3. **Realtime:** the migration adds the tables to the `supabase_realtime` publication. Check that Realtime is enabled for the project.
4. **Storage:** the migration creates the private `pickup-photos` bucket and its policies.

## 3. Configure Auth

In Supabase → Authentication:

- **Email provider:** enabled. Decide whether "Confirm email" is on. The app supports both: when confirmation is required, sign-up shows a "Check your email" screen.
- **Password recovery:** the app uses a one-time code rather than a deep link. Edit the **Reset Password** email template so it includes the code, for example:

  ```html
  <p>Your DustBin Africa password reset code is <strong>{{ .Token }}</strong></p>
  ```

## 4. Environment

Copy `.env.example` to `.env.local` and fill in the values (see [environment.md](environment.md)).

## 5. Run

```bash
npx expo start            # then press a / i, or scan with Expo Go
npx expo run:android      # local development build
npx eas-cli@latest build --profile development --platform android   # cloud dev build
```

## 6. Create the first dispatch account

Users can't make themselves dispatch. Sign up in the app (any role), then run in the SQL editor:

```sql
update public.profiles set role = 'ops' where id = '<auth user id>';
```

Dispatch then verifies collectors in the **Collectors** tab. Unverified collectors can't go online or see jobs.

## 7. Business configuration (no app release needed)

Edit these tables in the Supabase table editor:

| Table | Purpose |
| --- | --- |
| `service_categories` | Basic / Premium / Advanced / Industrial: price ranges, allowed vehicles, `locality_codes` (availability), `is_active` |
| `waste_categories` | Waste types offered in the wizard |
| `localities` | Areas served (seeded with Kasoa) |
| `platform_settings` | `collector_share_percent` (null = no earnings estimates), `require_before_photo`, `scheduling_enabled`, `support_phone`, `support_email` |

Review [decisions.md](decisions.md) before launch: the seeded values are placeholders taken from the storyboard.
