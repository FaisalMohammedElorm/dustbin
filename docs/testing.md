# Testing

| Command | What it covers |
| --- | --- |
| `npm test` | Jest (`jest-expo` preset). Unit tests for the domain rules and validation in `src/**/__tests__`: status transitions and available actions per role, pricing and estimate formatting, earnings estimates (only when configured), service availability by locality, Ghana phone normalisation, scheduling windows, distances, payment-status summaries, and every Zod form schema. |
| `npm run test:db` | Database integration test (`supabase/tests/workflow.test.mjs`). Applies the real migration to PGlite (Postgres in WASM) with a Supabase shim, then acts as six users to verify registration rules, idempotent requests, RLS isolation, collector verification gating, the atomic claim race, step-by-step transitions with photo requirements, payments, ratings, stats, notifications, assignment/decline/failure/reopen/cancel, quote-only services and storage upload/read policies. |
| `npx tsc --noEmit` | Strict typecheck, including typed routes. Run `npx expo start` once after adding routes to regenerate `.expo/types`. |
| `npx expo lint` | ESLint (`eslint-config-expo`) including React Compiler rules |
| `npx expo-doctor` | Dependency and config checks |
| `npx expo export --platform android` | Confirms the app bundles |

## Not yet covered

- **Component and screen tests** (React Native Testing Library). Add these for the wizard and collector workflow once the UI settles.
- **End-to-end tests** against a real Supabase project (Maestro is recommended for Expo). The DB test covers server rules, but not network, Realtime or Storage behaviour on a device.
- **Visual review on physical iOS and Android devices**, especially small screens (iPhone SE, 5-inch Android) and large font sizes.

## Manual smoke test (with a configured backend)

1. Sign up as a customer, complete the profile, and request a Basic pickup with a photo. You should see the confirmation and reference.
2. Sign up a second account as a collector (tricycle). Make the first-dispatch user ops (see setup.md) and verify the collector.
3. As the collector: go online, accept the job, then go through en route → arrived → before photo → collecting → after photo → complete → record cash payment.
4. As the customer, watch the tracking timeline update live. Rate the job and open the receipt.
5. On a third device, try to accept the same job as another collector. It must fail with "already been taken".
