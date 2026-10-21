# Architecture

DustBin Africa is an Expo (SDK 57) React Native app in TypeScript (strict), backed by Supabase. Routing uses Expo Router (file-based).

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes / screens | `src/app/` | One file per screen. `_layout.tsx` files define navigators and role guards. Screens are kept thin. |
| Feature modules | `src/features/<area>/` | Hooks and composite UI for an area: `auth`, `jobs`, `pickup` (wizard), `collector`, `account`, `location`. |
| Domain rules | `src/domain/` | Pure, tested business logic: the job status model and allowed actions, pricing presentation, Ghana phone numbers, scheduling windows, geo, payment summaries. No React or network code. |
| Validation | `src/validation/` | Zod schemas for every form, used through React Hook Form (`zodResolver`). |
| Data access | `src/services/` | Typed Supabase calls. Every state change goes through a Postgres function (`rpc`). Screens never call Supabase directly. |
| Design system | `src/constants/theme.ts`, `src/components/ui/` | Tokens (colour, typography, spacing, radius, elevation, motion) and primitives (Button, Card, TextField, Badge, Skeleton, BottomSheet, StepProgress, Collapsible, SuccessCheck…). |
| Shared composites | `src/components/` | Brand mark and logo, job/open-job/drop-off/service cards, status timeline, home header, tabs, offline banner, animated splash. |
| Backend | `supabase/migrations/` | Schema, Row Level Security, workflow functions, storage policies, realtime publication. |

## State

- **Server state:** TanStack Query. Keys live in `src/features/query-keys.ts`; every workflow mutation invalidates the jobs, payments, stats and notifications prefixes. Mutations use `networkMode: 'always'`, so they fail fast offline rather than firing later without the user knowing.
- **Session:** `AuthProvider` (React Context) holds the Supabase session and the user's profile. The role always comes from `profiles` on the server.
- **Local UI state:** component state. Small, non-sensitive preferences (intro seen, wizard draft) go through `src/lib/local-store.ts`.

No global client store (Zustand/Redux) is needed at this size.

## Navigation and authorization

`src/app/_layout.tsx` uses `Stack.Protected` guards:

```
signed out            → (auth): welcome/intro, sign-in, sign-up, forgot-password
signed in, no profile → onboarding (role, details, vehicle)
customer              → customer/ tabs (Home, My Pickups, Tracking, Notifications, Profile)
                        + request-pickup, pickup-confirmed/[id], receipt/[id], addresses
collector             → collector/ tabs (Jobs, My Jobs, Active, Earnings, Profile)
                        + collector-details, log-dropoff
ops (dispatch)        → ops/ tabs (Dispatch, All jobs, Collectors, Recycling, Profile)
                        + assign/[id], job-amount/[id]
partner               → partner/ tabs + confirm-dropoff/[id]
any signed-in role    → job/[id], edit-profile, help, new-ticket, notification-settings, privacy
```

Client guards only shape the UI. **Authorization is enforced in Postgres:** RLS on every table, `SECURITY DEFINER` functions that check `auth.uid()`, the caller's role and the job's current state, and storage policies keyed by job ownership and status. A modified client gains nothing.

## Job status model

`pending → (assigned →) accepted → en_route → arrived → collecting → completed`, plus `cancelled` and `failed` (needs assistance). The graph is defined once in SQL (enforced) and mirrored in `src/domain/job-status.ts` (which actions to offer), with tests on both sides. Details are in [backend-schema.md](backend-schema.md).

## Realtime

`useRealtimeSync` subscribes to `jobs`, `payments`, `dropoffs`, `collector_profiles` and the user's own `notifications`, and invalidates the matching queries. RLS applies to change events. Collectors can't read open jobs as rows, so `available_jobs()` is polled every 30 seconds while the collector is online.

## Animation

Reanimated 4 with restrained timings (`Motion` tokens):

- Staggered card entrances and a press-scale on buttons and cards.
- Animated wizard progress and status badge transitions.
- A pulsing current step on the timeline.
- A gesture-dismissable bottom sheet, collapsibles and skeleton shimmer.
- A success check, shown only after the server confirms the action.
- A branded splash hand-off.

Continuous animations stop when the OS requests reduced motion (`useReducedMotion`), and layout animations follow the system setting.
