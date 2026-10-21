# API contracts

The app talks to Supabase through `src/services/*`. Reads use PostgREST (RLS-filtered). **All writes that change job, payment or verification state are Postgres functions** called with `supabase.rpc(name, args)`. Errors raised in SQL (`raise exception '…'`) are written for users and shown as-is.

## Customer

| Service function | RPC / table | Args → result |
| --- | --- | --- |
| `createPickupRequest` | `create_pickup_request` | `p_client_request_id uuid, p_waste_category, p_service_category, p_locality_code, p_address, p_landmark, p_latitude, p_longitude, p_notes, p_scheduled_for, p_payment_method` → `jobs` row. Retrying with the same id returns the same job. |
| `uploadPickupPhoto(job,'customer',photo)` | Storage `pickup-photos`, then `add_pickup_photo` | Compresses to JPEG (max 1600 px), uploads, registers → `pickup_photos` row |
| `cancelJob` | `cancel_job(p_job_id, p_reason)` | → `jobs` |
| `rescheduleJob` | `reschedule_job(p_job_id, p_scheduled_for)` | → `jobs` |
| `rateJob` | `rate_job(p_job_id, p_rating, p_comment)` | → `jobs` |

## Collector

| Service function | RPC | Notes |
| --- | --- | --- |
| `fetchAvailableJobs` | `available_jobs()` | Area-level `OpenJob[]`; empty unless the caller is approved and online |
| `claimJob` | `claim_job(p_job_id)` | Atomic; the losing caller gets "This job has already been taken" |
| `acceptAssignment` / `declineJob` | `accept_assignment`, `decline_job(p_job_id, p_reason)` | |
| `advanceJob(job, to, coords?)` | `advance_job(p_job_id, p_to, p_lat, p_lng)` | `to` ∈ `en_route`, `arrived`, `collecting`, `completed` |
| `uploadPickupPhoto(job,'before'|'after',photo)` | Storage, then `add_pickup_photo` | |
| `recordPayment` | `record_payment(p_job_id, p_amount, p_method, p_notes)` | Cash or Mobile Money received directly; status `successful`, provider `manual` |
| `reportProblem` | `report_problem(p_job_id, p_reason)` | → `failed` |
| `setAvailability` / `updateCollectorDetails` | `set_availability`, `update_collector_details` | Changing vehicle type resets verification |
| `fetchCollectorStats` | `collector_stats(p_collector_id?)` | Totals, today, rating, payouts paid/pending |

## Dispatch

`assign_job`, `reopen_job`, `set_final_amount`, `record_payment`, `update_payment_status` (allowed: pending→successful/failed, successful→refund_pending, refund_pending→refunded/successful), `create_payout`, `mark_payout_paid`, `set_collector_status`, `update_ticket_status`.

## Payment gateway integration point (not implemented)

When a provider is chosen (for example Paystack or Hubtel):

1. **App → Edge Function `payments-initiate`** `{ jobId }`. The function validates the caller and job, inserts a `payments` row with `status='pending'` and `provider='<name>'`, creates the provider transaction with the secret key, and returns a checkout URL or reference.
2. **App** opens the provider checkout (in-app browser) or a MoMo prompt. It never collects PINs.
3. **Provider → Edge Function `payments-webhook`** verifies the signature, then updates `payments.status` (`successful`/`failed`) with the service role.
4. The app sees the change through Realtime on `payments`. A client-side "success" screen is never treated as proof.

## Push notifications integration point (not implemented)

Notifications are already written to `public.notifications` by triggers. To deliver push:

1. Add `expo-notifications`, request permission at a meaningful moment, and store the Expo push token in a `push_tokens` table (one row per device).
2. Add a Database Webhook or Edge Function on `notifications` INSERT that sends through the Expo Push API using the service role, de-duplicating per notification id.
