# Decisions

## Technical decisions (made)

| Decision | Rationale |
| --- | --- |
| Supabase (Auth, Postgres, RLS, Storage, Realtime) | Approved backend. Postgres functions give atomic, auditable workflow transitions. |
| All state changes through `SECURITY DEFINER` functions, with no direct writes on workflow tables | One enforced status graph; client role checks are never trusted. |
| Collectors must be verified by dispatch before seeing or accepting work | Customer addresses and safety require vetting. Unverified collectors only see a pending notice. |
| Open jobs exposed at area level only (`available_jobs()`) | Collectors don't need a street address or customer identity until they commit. |
| Idempotent request creation (`client_request_id`) and fail-fast offline mutations | No duplicate bookings from double taps or retries, and no booking sent later without the user's knowledge. |
| Session storage: `expo-sqlite` `localStorage` (Expo's documented Supabase setup), not SecureStore | Supabase sessions exceed SecureStore's ~2 KB per-value limit. The storage is app-sandboxed. To encrypt tokens at rest, add an AES-wrapped adapter with the key in SecureStore. |
| React Hook Form + Zod; TanStack Query; Context for session | As specified in the brief. No additional global store needed. |
| JS tabs (`expo-router/js-tabs`) instead of native tabs | Consistent badges, icons and styling across iOS and Android. `Tabs` from `expo-router` is deprecated in SDK 57. |
| No maps SDK yet | A map needs a Google Maps API key (Android) and billing. The app records coordinates and deep-links to Google Maps for directions, and shows no simulated live tracking. |
| Web output `single` (SPA) | An authenticated app doesn't benefit from static rendering, and SSR would run storage code on the server. |
| Logo assets generated from the supplied JPG | `assets/brand/logo.png` (full logo, rounded tile), `emblem.png`, app icon, adaptive and monochrome icons, splash. The original is kept as `assets/brand/logo-original.jpg`. A vector or high-resolution PNG export from the designer would improve sharpness. |

## Business decisions needing confirmation

| Topic | Current state |
| --- | --- |
| **Service prices** | Seeded from the storyboard: Basic GHS 20–50, Premium 80–300, Advanced 300+, Industrial by quote. Shown to customers as estimates only. Confirm the figures and whether ranges vary by locality. |
| **Final amount** | Set by dispatch (`set_final_amount`). Decide whether collectors may propose it, and what tolerance from the estimate is acceptable. |
| **Collector payout policy** | `platform_settings.collector_share_percent` is NULL, so no earnings estimates are shown. Set a percentage to enable estimates. Payouts are recorded manually by dispatch. |
| **Platform commission, cancellation fees, refunds** | Not modelled. Customers can cancel free of charge until the collector is en route. |
| **Payment provider** | None integrated: cash and MoMo-to-collector are recorded manually. Choose a provider (Paystack, Hubtel, …) and supply credentials, then follow the integration point in [api-contracts.md](api-contracts.md). |
| **Service areas** | Only Kasoa is seeded ("Starting in Kasoa"). Add localities and restrict tiers with `service_categories.locality_codes`. |
| **Before photo requirement** | `require_before_photo = true`. |
| **Scheduling windows** | ASAP, this afternoon (before 1 pm), tomorrow morning/afternoon, in 2 days. Adjust in `src/domain/schedule.ts` once operating hours are known. |
| **Support contacts** | `support_phone` / `support_email` are empty. Fill them in `platform_settings`. |
| **Sign-in method** | Email and password. Phone OTP suits Ghana better but needs an SMS provider (Twilio, Termii, Hubtel SMS) configured in Supabase Auth. |
| **Legal privacy policy** | The in-app Privacy screen is a plain-language summary, not a legal policy. |
