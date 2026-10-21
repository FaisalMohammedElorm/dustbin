# Backend schema

Source of truth: [`supabase/migrations/20261016000000_initial_schema.sql`](../supabase/migrations/20261016000000_initial_schema.sql). RLS is enabled on every table.

## Tables

| Table | Purpose | Client access |
| --- | --- | --- |
| `profiles` | User, role (`customer`, `collector`, `ops`, `partner`), name, Ghana phone (E.164), notification preferences | Read own, plus counterparts on shared jobs and partners. Update own name, phone, organisation and preferences only (column grants). Insert via `register_profile()`. |
| `collector_profiles` | Vehicle, plate, service area, verification `status`, `is_available` | Read own; customers read their assigned collector's; dispatch reads all. Writes via functions only. |
| `service_categories` | Basic/Premium/Advanced/Industrial: prices, allowed vehicles, localities, quote-only | Read |
| `waste_categories`, `localities`, `platform_settings` | Business configuration | Read |
| `jobs` | Pickup requests (status, estimate, final amount, location, timestamps per step) | Read own (customer), assigned (collector), all (dispatch). **No direct writes.** |
| `job_events` | Audit trail of every transition (actor, note, optional lat/lng) | Read where the job is readable |
| `job_declines` | Collectors who passed on an open job | Read own |
| `pickup_photos` | Photo records (`customer`, `before`, `after`) → storage path | Read where the job is readable |
| `payments` | Payment records with status `pending`, `successful`, `failed`, `refund_pending`, `refunded` | Read where the job is readable |
| `collector_payouts` | Payouts recorded by dispatch (`pending`, `paid`) | Read own / dispatch |
| `notifications` | In-app inbox, created by triggers | Read own; mark read via function |
| `support_tickets` | Complaints and support requests | Insert/read own; dispatch reads all |
| `saved_addresses` | Customer address book | Full CRUD on own |
| `dropoffs` | Recyclables delivered by collectors to partners | Insert (verified collector); read own / partner / dispatch |

## Job state machine

| From → To | Who | Function | Guard |
| --- | --- | --- | --- |
| *(new)* → `pending` | customer | `create_pickup_request` | Active category, served locality, idempotent `client_request_id` |
| `pending` → `accepted` | approved, online collector with a compatible vehicle | `claim_job` | Atomic conditional `UPDATE … WHERE status='pending' AND collector_id IS NULL`, so only one collector can win |
| `pending`/`assigned`/`accepted`/`failed` → `assigned` | dispatch | `assign_job` | Collector approved and vehicle allowed for the service |
| `assigned` → `accepted` | assigned collector | `accept_assignment` | |
| `assigned` → `pending` | assigned collector | `decline_job` | Also hides the job from that collector |
| `accepted` → `en_route` → `arrived` → `collecting` → `completed` | assigned collector | `advance_job` | One step at a time. `collecting` needs a before photo (configurable); `completed` needs an after photo. Location is optional evidence. |
| active → `failed` | assigned collector | `report_problem` | Reason required |
| `failed` → `pending` | dispatch | `reopen_job` | |
| `pending`/`assigned`/`accepted` → `cancelled` | customer | `cancel_job` | |
| non-terminal → `cancelled` | dispatch | `cancel_job` | |

Other functions:

- `reschedule_job` and `rate_job` (customer).
- `set_final_amount`, `record_payment`, `update_payment_status`, `create_payout`, `mark_payout_paid`, `set_collector_status`, `update_ticket_status` (dispatch; `record_payment` also for the assigned collector).
- `available_jobs`, `collector_stats`, `set_availability`, `update_collector_details` (collector).
- `register_profile`, `mark_notifications_read`, `add_pickup_photo`, `confirm_dropoff`.

## Privacy rules

- Open jobs reach collectors only through `available_jobs()`. It returns area-level data: locality, coordinates rounded to about 1 km, service, timing and estimate. Street address, notes and customer identity become visible only once the job is the collector's.
- Notification bodies carry only the job reference and status, never addresses or names, so they're safe to mirror into push previews later.

## Storage

The private bucket `pickup-photos` (5 MB, JPEG/PNG/WebP) uses the path `<job_id>/<kind>/<file>`. The upload policy allows customers to upload `customer` photos to their own open jobs. The assigned collector can upload `before` photos while `arrived` and `after` photos while `collecting`. Reads are limited to the job's customer, collector and dispatch, through signed URLs that expire after 1 hour.
