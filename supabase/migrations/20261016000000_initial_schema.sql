-- =============================================================================
-- DustBin Africa — initial schema
-- =============================================================================
-- Roles: customer, collector, ops (dispatch), partner (recycling partner).
--
-- Security model
--   * Row Level Security on every table.
--   * Every job state change, photo registration, payment record and role-sensitive
--     write goes through a SECURITY DEFINER function that checks the caller's role
--     and the job's current state. Clients have no UPDATE/DELETE on jobs.
--   * A user's role comes from public.profiles (never from the client). Nobody can
--     self-assign 'ops'; collectors must be approved by dispatch before seeing or
--     taking work.
--   * Open jobs are exposed to collectors through available_jobs(), which returns
--     only area-level information; full address and customer contact are visible
--     to a collector only once the job is theirs.
--
-- Business configuration lives in tables (service_categories, waste_categories,
-- localities, platform_settings) so the operations team can change it without an
-- app release. Seeded values come from the DustBin storyboard and must be
-- confirmed by the business before launch (see docs/decisions.md).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'collector', 'ops', 'partner');

create type public.job_status as enum (
  'pending',     -- submitted, awaiting assignment
  'assigned',    -- dispatch offered it to a collector, awaiting their acceptance
  'accepted',    -- collector committed
  'en_route',
  'arrived',
  'collecting',  -- before-photo taken, loading in progress
  'completed',
  'cancelled',
  'failed'       -- could not be completed / requires assistance
);

create type public.vehicle_type as enum ('bicycle', 'tricycle', 'medium_truck', 'large_truck');
create type public.collector_status as enum ('pending_verification', 'approved', 'suspended');
create type public.photo_kind as enum ('customer', 'before', 'after');
create type public.payment_method as enum ('cash', 'mobile_money', 'card');
create type public.payment_status as enum ('pending', 'successful', 'failed', 'refund_pending', 'refunded');
create type public.payout_status as enum ('pending', 'paid');
create type public.material_type as enum ('plastic', 'metal', 'paper', 'glass', 'organic', 'e_waste', 'mixed');
create type public.dropoff_status as enum ('pending', 'received', 'rejected');
create type public.ticket_category as enum ('complaint', 'missed_pickup', 'payment', 'damage', 'account', 'other');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');

-- -----------------------------------------------------------------------------
-- Configuration tables
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  -- Collector share of the job amount, e.g. 70.00. NULL = policy not configured,
  -- so the app shows no earnings estimates.
  collector_share_percent numeric(5, 2) check (collector_share_percent between 0 and 100),
  require_before_photo boolean not null default true,
  scheduling_enabled boolean not null default true,
  support_phone text,
  support_email text,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true);

create table public.localities (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  region text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);
-- Storyboard: "Starting in Kasoa". Add further localities as service expands.
insert into public.localities (code, name, region, sort_order) values ('kasoa', 'Kasoa', 'Central Region', 1);

create table public.waste_categories (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null,
  icon text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);
insert into public.waste_categories (code, name, description, icon, sort_order) values
  ('household',    'Household',             'Everyday home waste',                      'home-variant-outline', 1),
  ('commercial',   'Commercial',            'Shops, restaurants, offices',              'storefront-outline',   2),
  ('recyclables',  'Plastics & recyclables', 'Plastic, paper, metal, glass',            'recycle',              3),
  ('organic',      'Organic',               'Food and garden waste',                    'leaf',                 4),
  ('bulky',        'Bulky items',           'Furniture, appliances, large items',       'sofa-outline',         5),
  ('construction', 'Construction',          'Rubble, blocks, renovation debris',        'wall',                 6),
  ('other',        'Other',                 'Describe it in the notes',                 'dots-horizontal-circle-outline', 7);

create table public.service_categories (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  vehicle_label text not null,
  description text not null,
  best_for text[] not null default '{}',
  features text[] not null default '{}',
  allowed_vehicles public.vehicle_type[] not null,
  price_min_ghs numeric(10, 2) check (price_min_ghs >= 0),
  price_max_ghs numeric(10, 2) check (price_max_ghs >= 0),
  quote_only boolean not null default false,
  -- NULL = available in every active locality; otherwise the locality codes served.
  locality_codes text[],
  is_active boolean not null default true,
  sort_order int not null default 0,
  check (quote_only or price_min_ghs is not null),
  check (price_max_ghs is null or price_min_ghs is null or price_max_ghs >= price_min_ghs)
);
-- Tiers and price ranges from the DustBin storyboard ("DustBin Service Categories").
insert into public.service_categories
  (code, name, vehicle_label, description, best_for, features, allowed_vehicles, price_min_ghs, price_max_ghs, quote_only, sort_order)
values
  ('basic', 'DustBin Basic', 'Tricycle collection', 'Affordable pickup for small to medium volumes',
    '{Households,"Small shops","Small offices"}', '{"Affordable pricing","Same-day pickup","Small to medium waste volume"}',
    '{bicycle,tricycle}', 20, 50, false, 1),
  ('premium', 'DustBin Premium', 'Medium truck', 'Larger capacity with faster, scheduled collection',
    '{Restaurants,Churches,Schools,"Small hospitals",Estates}', '{"Larger capacity","Faster collection","Scheduled pickups available"}',
    '{medium_truck}', 80, 300, false, 2),
  ('advanced', 'DustBin Advanced', 'Large truck', 'High-volume and recurring collection',
    '{Factories,Hotels,Markets,"Large hospitals","Industrial facilities"}', '{"High-volume collection","Contract services","Recurring pickups","Dedicated account management"}',
    '{large_truck}', 300, null, false, 3),
  ('industrial', 'DustBin Industrial', 'Industrial solutions', 'Custom solutions for heavy and specialised waste',
    '{"Manufacturing plants","Construction sites","Demolition waste","Mining operations"}', '{"Custom solutions","High-volume contracts","Specialized equipment"}',
    '{large_truck}', null, null, true, 4);

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  -- Normalised Ghana number, e.g. +233241234567
  phone text not null check (phone ~ '^\+233[235][0-9]{8}$'),
  organization_name text check (char_length(organization_name) <= 160),
  notify_job_updates boolean not null default true,
  notify_payment_updates boolean not null default true,
  notify_announcements boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collector_profiles (
  collector_id uuid primary key references public.profiles (id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  vehicle_plate text check (char_length(vehicle_plate) <= 20),
  service_area text check (char_length(service_area) <= 120),
  status public.collector_status not null default 'pending_verification',
  is_available boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  locality_code text not null references public.localities (code),
  address text not null check (char_length(address) between 3 and 300),
  landmark text check (char_length(landmark) <= 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);
create index saved_addresses_user_idx on public.saved_addresses (user_id);

-- Role helpers (definer so policies can read roles without recursive RLS).
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_ops()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() = 'ops', false) $$;

create or replace function public.is_approved_collector()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.collector_profiles c
     where c.collector_id = auth.uid() and c.status = 'approved'
  )
$$;

-- -----------------------------------------------------------------------------
-- Jobs (pickup requests)
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_request_id uuid not null,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  collector_id uuid references public.profiles (id) on delete set null,
  status public.job_status not null default 'pending',
  waste_category text not null references public.waste_categories (code),
  service_category text not null references public.service_categories (code),
  locality_code text not null references public.localities (code),
  address text not null check (char_length(address) between 3 and 300),
  landmark text check (char_length(landmark) <= 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  notes text check (char_length(notes) <= 500),
  scheduled_for timestamptz,
  estimate_min_ghs numeric(10, 2),
  estimate_max_ghs numeric(10, 2),
  quote_required boolean not null default false,
  final_amount_ghs numeric(10, 2) check (final_amount_ghs >= 0),
  payment_method public.payment_method not null default 'cash',
  cancel_reason text,
  failure_reason text,
  rating smallint check (rating between 1 and 5),
  rating_comment text check (char_length(rating_comment) <= 500),
  created_at timestamptz not null default now(),
  assigned_at timestamptz,
  accepted_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  collecting_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (customer_id, client_request_id)
);
create index jobs_customer_idx on public.jobs (customer_id, created_at desc);
create index jobs_collector_idx on public.jobs (collector_id, created_at desc);
create index jobs_status_idx on public.jobs (status, created_at);

create table public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  status public.job_status not null,
  note text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
create index job_events_job_idx on public.job_events (job_id, created_at);

-- Collectors who passed on an open job (hidden from their list afterwards).
create table public.job_declines (
  job_id uuid not null references public.jobs (id) on delete cascade,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (job_id, collector_id)
);

create table public.pickup_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  kind public.photo_kind not null,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index pickup_photos_job_idx on public.pickup_photos (job_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  amount_ghs numeric(10, 2) not null check (amount_ghs > 0),
  method public.payment_method not null,
  status public.payment_status not null,
  -- 'manual' = recorded by a collector/dispatcher. Gateway integrations set their
  -- own provider and reference from a trusted server (webhook), never the app.
  provider text not null default 'manual',
  provider_reference text,
  recorded_by uuid references public.profiles (id),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_job_idx on public.payments (job_id, created_at desc);

create table public.collector_payouts (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.profiles (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  amount_ghs numeric(10, 2) not null check (amount_ghs > 0),
  status public.payout_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index collector_payouts_collector_idx on public.collector_payouts (collector_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  category public.ticket_category not null,
  message text not null check (char_length(message) between 10 and 2000),
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

create table public.dropoffs (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.profiles (id) on delete restrict,
  partner_id uuid not null references public.profiles (id) on delete restrict,
  material public.material_type not null,
  estimated_weight_kg numeric(10, 2) not null check (estimated_weight_kg > 0),
  confirmed_weight_kg numeric(10, 2) check (confirmed_weight_kg >= 0),
  status public.dropoff_status not null default 'pending',
  notes text check (char_length(notes) <= 500),
  partner_notes text check (char_length(partner_notes) <= 500),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index dropoffs_collector_idx on public.dropoffs (collector_id, created_at desc);
create index dropoffs_partner_idx on public.dropoffs (partner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Event log + notifications
-- -----------------------------------------------------------------------------
create or replace function public.log_job_event(
  p_job_id uuid, p_status public.job_status, p_note text,
  p_lat double precision default null, p_lng double precision default null)
returns void language sql security definer set search_path = public
as $$
  insert into public.job_events (job_id, actor_id, status, note, latitude, longitude)
  values (p_job_id, auth.uid(), p_status, p_note, p_lat, p_lng);
$$;
revoke all on function public.log_job_event(uuid, public.job_status, text, double precision, double precision)
  from public, anon, authenticated;

-- In-app notifications for status changes. Bodies avoid personal details because
-- they may be mirrored to push notification previews later.
create or replace function public.job_events_notify()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_job public.jobs;
  v_title text;
  v_body text;
begin
  select * into v_job from public.jobs where id = new.job_id;

  v_title := case new.status
    when 'pending' then 'Pickup requested'
    when 'assigned' then 'Collector being assigned'
    when 'accepted' then 'Collector confirmed'
    when 'en_route' then 'Collector on the way'
    when 'arrived' then 'Collector has arrived'
    when 'collecting' then 'Collection in progress'
    when 'completed' then 'Pickup completed'
    when 'cancelled' then 'Pickup cancelled'
    when 'failed' then 'Pickup needs attention'
  end;
  v_body := 'Pickup ' || v_job.reference || ': ' || coalesce(new.note, v_title) || '.';

  if new.actor_id is distinct from v_job.customer_id then
    insert into public.notifications (user_id, job_id, title, body)
    select v_job.customer_id, v_job.id, v_title, v_body
      from public.profiles p where p.id = v_job.customer_id and p.notify_job_updates;
  end if;

  if new.status = 'assigned' and v_job.collector_id is not null then
    insert into public.notifications (user_id, job_id, title, body)
    values (v_job.collector_id, v_job.id, 'New job assigned to you',
            'Pickup ' || v_job.reference || ' was assigned by dispatch. Accept or decline it.');
  elsif new.status = 'cancelled' and v_job.collector_id is not null and new.actor_id is distinct from v_job.collector_id then
    insert into public.notifications (user_id, job_id, title, body)
    values (v_job.collector_id, v_job.id, 'Job cancelled', 'Pickup ' || v_job.reference || ' was cancelled.');
  end if;
  return new;
end;
$$;

create trigger job_events_notify after insert on public.job_events
  for each row execute function public.job_events_notify();

-- -----------------------------------------------------------------------------
-- Registration & profile functions
-- -----------------------------------------------------------------------------
create or replace function public.register_profile(
  p_role public.app_role,
  p_full_name text,
  p_phone text,
  p_organization_name text default null,
  p_vehicle_type public.vehicle_type default null,
  p_vehicle_plate text default null,
  p_service_area text default null)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_role not in ('customer', 'collector', 'partner') then
    raise exception 'This account type cannot be self-registered';
  end if;
  if p_role = 'collector' and p_vehicle_type is null then
    raise exception 'Collectors must provide a vehicle type';
  end if;
  if p_role = 'partner' and coalesce(trim(p_organization_name), '') = '' then
    raise exception 'Recycling partners must provide a business name';
  end if;

  insert into public.profiles (id, role, full_name, phone, organization_name)
  values (auth.uid(), p_role, trim(p_full_name), p_phone, nullif(trim(p_organization_name), ''))
  returning * into v_profile;

  if p_role = 'collector' then
    insert into public.collector_profiles (collector_id, vehicle_type, vehicle_plate, service_area)
    values (auth.uid(), p_vehicle_type, nullif(upper(trim(p_vehicle_plate)), ''), nullif(trim(p_service_area), ''));
  end if;
  return v_profile;
end;
$$;

-- Collectors edit vehicle details; changing the vehicle type requires re-verification.
create or replace function public.update_collector_details(
  p_vehicle_type public.vehicle_type, p_vehicle_plate text, p_service_area text)
returns public.collector_profiles
language plpgsql security definer set search_path = public
as $$
declare v_row public.collector_profiles;
begin
  update public.collector_profiles
     set status = case when vehicle_type <> p_vehicle_type and status = 'approved'
                       then 'pending_verification'::public.collector_status else status end,
         is_available = case when vehicle_type <> p_vehicle_type then false else is_available end,
         vehicle_type = p_vehicle_type,
         vehicle_plate = nullif(upper(trim(p_vehicle_plate)), ''),
         service_area = nullif(trim(p_service_area), ''),
         updated_at = now()
   where collector_id = auth.uid()
  returning * into v_row;
  if v_row.collector_id is null then raise exception 'Collector profile not found'; end if;
  return v_row;
end;
$$;

create or replace function public.set_availability(p_available boolean)
returns public.collector_profiles
language plpgsql security definer set search_path = public
as $$
declare v_row public.collector_profiles;
begin
  if p_available and not public.is_approved_collector() then
    raise exception 'Your account must be verified by DustBin before you can go online';
  end if;
  update public.collector_profiles set is_available = p_available, updated_at = now()
   where collector_id = auth.uid()
  returning * into v_row;
  if v_row.collector_id is null then raise exception 'Collector profile not found'; end if;
  return v_row;
end;
$$;

-- Dispatch verifies / suspends collectors.
create or replace function public.set_collector_status(p_collector_id uuid, p_status public.collector_status)
returns public.collector_profiles
language plpgsql security definer set search_path = public
as $$
declare v_row public.collector_profiles;
begin
  if not public.is_ops() then raise exception 'Only dispatch can verify collectors'; end if;
  update public.collector_profiles
     set status = p_status,
         verified_at = case when p_status = 'approved' then now() else verified_at end,
         is_available = case when p_status = 'approved' then is_available else false end,
         updated_at = now()
   where collector_id = p_collector_id
  returning * into v_row;
  if v_row.collector_id is null then raise exception 'Collector not found'; end if;
  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- Customer: create request (idempotent), photos, cancel, reschedule, rate
-- -----------------------------------------------------------------------------
create or replace function public.create_pickup_request(
  p_client_request_id uuid,
  p_waste_category text,
  p_service_category text,
  p_locality_code text,
  p_address text,
  p_landmark text,
  p_latitude double precision,
  p_longitude double precision,
  p_notes text,
  p_scheduled_for timestamptz,
  p_payment_method public.payment_method)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.jobs;
  v_service public.service_categories;
  v_settings public.platform_settings;
  v_id uuid := gen_random_uuid();
begin
  if public.current_app_role() is distinct from 'customer' then
    raise exception 'Only customers can request pickups';
  end if;

  -- Idempotency: a retried submission returns the original request.
  select * into v_job from public.jobs where customer_id = auth.uid() and client_request_id = p_client_request_id;
  if found then return v_job; end if;

  if not exists (select 1 from public.waste_categories where code = p_waste_category and is_active) then
    raise exception 'Unknown or inactive waste category';
  end if;
  if not exists (select 1 from public.localities where code = p_locality_code and is_active) then
    raise exception 'DustBin does not serve this area yet';
  end if;
  select * into v_service from public.service_categories where code = p_service_category and is_active;
  if not found then raise exception 'Unknown or inactive service'; end if;
  if v_service.locality_codes is not null and not (p_locality_code = any (v_service.locality_codes)) then
    raise exception '% is not available in this area yet', v_service.name;
  end if;

  select * into v_settings from public.platform_settings;
  if p_scheduled_for is not null then
    if not v_settings.scheduling_enabled then raise exception 'Scheduled pickups are not enabled'; end if;
    if p_scheduled_for < now() - interval '5 minutes' or p_scheduled_for > now() + interval '30 days' then
      raise exception 'Choose a pickup time within the next 30 days';
    end if;
  end if;
  if p_payment_method = 'card' then
    raise exception 'Card payments are not available yet';
  end if;

  insert into public.jobs (
    id, reference, client_request_id, customer_id, waste_category, service_category, locality_code,
    address, landmark, latitude, longitude, notes, scheduled_for,
    estimate_min_ghs, estimate_max_ghs, quote_required, payment_method)
  values (
    v_id, 'DB-' || upper(substr(replace(v_id::text, '-', ''), 1, 6)), p_client_request_id, auth.uid(),
    p_waste_category, p_service_category, p_locality_code,
    trim(p_address), nullif(trim(p_landmark), ''), p_latitude, p_longitude, nullif(trim(p_notes), ''), p_scheduled_for,
    v_service.price_min_ghs, v_service.price_max_ghs, v_service.quote_only, p_payment_method)
  returning * into v_job;

  perform public.log_job_event(v_job.id, 'pending', 'Pickup requested');
  return v_job;
end;
$$;

-- Registers an uploaded photo. Storage policies already restrict who can upload
-- where; this enforces the same rules for the database record.
create or replace function public.add_pickup_photo(p_job_id uuid, p_kind public.photo_kind, p_storage_path text)
returns public.pickup_photos
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.jobs;
  v_row public.pickup_photos;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found then raise exception 'Job not found'; end if;
  if split_part(p_storage_path, '/', 1) <> p_job_id::text or split_part(p_storage_path, '/', 2) <> p_kind::text then
    raise exception 'Invalid photo path';
  end if;

  if p_kind = 'customer' then
    if v_job.customer_id <> auth.uid() or v_job.status not in ('pending', 'assigned', 'accepted') then
      raise exception 'Photos can only be added to your open requests';
    end if;
    if (select count(*) from public.pickup_photos where job_id = p_job_id and kind = 'customer') >= 4 then
      raise exception 'A request can have at most 4 photos';
    end if;
  elsif p_kind = 'before' then
    if v_job.collector_id is distinct from auth.uid() or v_job.status <> 'arrived' then
      raise exception 'Before photos are taken on arrival';
    end if;
  else
    if v_job.collector_id is distinct from auth.uid() or v_job.status <> 'collecting' then
      raise exception 'After photos are taken while collecting';
    end if;
  end if;

  insert into public.pickup_photos (job_id, kind, storage_path, uploaded_by)
  values (p_job_id, p_kind, p_storage_path, auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.cancel_job(p_job_id uuid, p_reason text)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if public.is_ops() then
    update public.jobs
       set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 300), updated_at = now()
     where id = p_job_id and status in ('pending', 'assigned', 'accepted', 'en_route', 'arrived', 'failed')
    returning * into v_job;
  else
    -- Customers may cancel until a collector is on the way (no cancellation fee policy defined yet).
    update public.jobs
       set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 300), updated_at = now()
     where id = p_job_id and customer_id = auth.uid() and status in ('pending', 'assigned', 'accepted')
    returning * into v_job;
  end if;
  if v_job.id is null then raise exception 'This pickup can no longer be cancelled'; end if;
  perform public.log_job_event(p_job_id, 'cancelled', coalesce(nullif(trim(p_reason), ''), 'Cancelled'));
  return v_job;
end;
$$;

create or replace function public.reschedule_job(p_job_id uuid, p_scheduled_for timestamptz)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if not (select scheduling_enabled from public.platform_settings) then
    raise exception 'Scheduled pickups are not enabled';
  end if;
  if p_scheduled_for is not null and (p_scheduled_for < now() or p_scheduled_for > now() + interval '30 days') then
    raise exception 'Choose a pickup time within the next 30 days';
  end if;
  update public.jobs set scheduled_for = p_scheduled_for, updated_at = now()
   where id = p_job_id and customer_id = auth.uid() and status in ('pending', 'assigned')
  returning * into v_job;
  if v_job.id is null then raise exception 'This pickup can no longer be rescheduled'; end if;
  perform public.log_job_event(p_job_id, v_job.status,
    case when p_scheduled_for is null then 'Rescheduled to as soon as possible' else 'Pickup time changed' end);
  return v_job;
end;
$$;

create or replace function public.rate_job(p_job_id uuid, p_rating smallint, p_comment text)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  update public.jobs
     set rating = p_rating, rating_comment = nullif(left(trim(p_comment), 500), ''), updated_at = now()
   where id = p_job_id and customer_id = auth.uid() and status = 'completed' and rating is null
  returning * into v_job;
  if v_job.id is null then raise exception 'This pickup cannot be rated'; end if;
  return v_job;
end;
$$;

-- -----------------------------------------------------------------------------
-- Collector: discovery and workflow
-- -----------------------------------------------------------------------------

-- Area-level view of open work for an approved, online collector. Coordinates are
-- rounded (~1 km) and street address / customer details are withheld until the
-- job is accepted.
create or replace function public.available_jobs()
returns table (
  id uuid, reference text, waste_category text, service_category text, locality_code text,
  approx_latitude double precision, approx_longitude double precision,
  scheduled_for timestamptz, estimate_min_ghs numeric, estimate_max_ghs numeric,
  quote_required boolean, payment_method public.payment_method, has_photos boolean, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select j.id, j.reference, j.waste_category, j.service_category, j.locality_code,
         round(j.latitude::numeric, 2)::double precision, round(j.longitude::numeric, 2)::double precision,
         j.scheduled_for, j.estimate_min_ghs, j.estimate_max_ghs, j.quote_required, j.payment_method,
         exists (select 1 from public.pickup_photos p where p.job_id = j.id and p.kind = 'customer'),
         j.created_at
    from public.jobs j
    join public.service_categories s on s.code = j.service_category
    join public.collector_profiles c on c.collector_id = auth.uid()
   where j.status = 'pending'
     and j.collector_id is null
     and c.status = 'approved'
     and c.is_available
     and c.vehicle_type = any (s.allowed_vehicles)
     and not s.quote_only
     and not exists (select 1 from public.job_declines d where d.job_id = j.id and d.collector_id = auth.uid())
   order by coalesce(j.scheduled_for, j.created_at)
   limit 50
$$;

-- Atomic claim: the conditional UPDATE guarantees only one collector can win.
create or replace function public.claim_job(p_job_id uuid)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if not exists (
    select 1 from public.collector_profiles c
      join public.jobs j on j.id = p_job_id
      join public.service_categories s on s.code = j.service_category
     where c.collector_id = auth.uid() and c.status = 'approved' and c.is_available
       and c.vehicle_type = any (s.allowed_vehicles) and not s.quote_only
  ) then
    raise exception 'You are not eligible to accept this job';
  end if;

  update public.jobs
     set collector_id = auth.uid(), status = 'accepted', accepted_at = now(), updated_at = now()
   where id = p_job_id and status = 'pending' and collector_id is null
  returning * into v_job;
  if v_job.id is null then raise exception 'This job has already been taken'; end if;

  perform public.log_job_event(p_job_id, 'accepted', 'Collector accepted the job');
  return v_job;
end;
$$;

create or replace function public.accept_assignment(p_job_id uuid)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  update public.jobs set status = 'accepted', accepted_at = now(), updated_at = now()
   where id = p_job_id and status = 'assigned' and collector_id = auth.uid()
  returning * into v_job;
  if v_job.id is null then raise exception 'This assignment is no longer available'; end if;
  perform public.log_job_event(p_job_id, 'accepted', 'Collector accepted the job');
  return v_job;
end;
$$;

-- Decline an open job (hides it) or an assignment (returns it to the queue).
create or replace function public.decline_job(p_job_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if public.current_app_role() is distinct from 'collector' then raise exception 'Only collectors can decline jobs'; end if;

  update public.jobs set status = 'pending', collector_id = null, assigned_at = null, updated_at = now()
   where id = p_job_id and status = 'assigned' and collector_id = auth.uid()
  returning * into v_job;
  if v_job.id is not null then
    perform public.log_job_event(p_job_id, 'pending', 'Collector declined; returned to queue');
  end if;

  insert into public.job_declines (job_id, collector_id, reason)
  values (p_job_id, auth.uid(), left(p_reason, 200))
  on conflict (job_id, collector_id) do nothing;
end;
$$;

create or replace function public.advance_job(
  p_job_id uuid, p_to public.job_status,
  p_lat double precision default null, p_lng double precision default null)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.jobs;
  v_from public.job_status;
  v_note text;
begin
  v_from := case p_to
    when 'en_route' then 'accepted'::public.job_status
    when 'arrived' then 'en_route'
    when 'collecting' then 'arrived'
    when 'completed' then 'collecting'
  end;
  if v_from is null then raise exception 'Unsupported transition'; end if;

  if p_to = 'collecting' and (select require_before_photo from public.platform_settings)
     and not exists (select 1 from public.pickup_photos where job_id = p_job_id and kind = 'before') then
    raise exception 'Take a before-collection photo first';
  end if;
  if p_to = 'completed'
     and not exists (select 1 from public.pickup_photos where job_id = p_job_id and kind = 'after') then
    raise exception 'Take an after-collection photo first';
  end if;

  update public.jobs
     set status = p_to,
         en_route_at = case when p_to = 'en_route' then now() else en_route_at end,
         arrived_at = case when p_to = 'arrived' then now() else arrived_at end,
         collecting_at = case when p_to = 'collecting' then now() else collecting_at end,
         completed_at = case when p_to = 'completed' then now() else completed_at end,
         updated_at = now()
   where id = p_job_id and status = v_from and collector_id = auth.uid()
  returning * into v_job;
  if v_job.id is null then raise exception 'This step is not available for the job right now'; end if;

  v_note := case p_to
    when 'en_route' then 'Collector is on the way'
    when 'arrived' then 'Collector arrived at pickup'
    when 'collecting' then 'Collection started'
    when 'completed' then 'Waste collected'
  end;
  perform public.log_job_event(p_job_id, p_to, v_note, p_lat, p_lng);
  return v_job;
end;
$$;

create or replace function public.report_problem(p_job_id uuid, p_reason text)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'Describe the problem'; end if;
  update public.jobs
     set status = 'failed', failed_at = now(), failure_reason = left(trim(p_reason), 300), updated_at = now()
   where id = p_job_id and collector_id = auth.uid() and status in ('accepted', 'en_route', 'arrived', 'collecting')
  returning * into v_job;
  if v_job.id is null then raise exception 'Cannot report a problem for this job now'; end if;
  perform public.log_job_event(p_job_id, 'failed', 'Needs assistance: ' || left(trim(p_reason), 200));
  return v_job;
end;
$$;

-- -----------------------------------------------------------------------------
-- Dispatch (ops)
-- -----------------------------------------------------------------------------
create or replace function public.assign_job(p_job_id uuid, p_collector_id uuid)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if not public.is_ops() then raise exception 'Only dispatch can assign jobs'; end if;
  if not exists (
    select 1 from public.collector_profiles c
      join public.jobs j on j.id = p_job_id
      join public.service_categories s on s.code = j.service_category
     where c.collector_id = p_collector_id and c.status = 'approved' and c.vehicle_type = any (s.allowed_vehicles)
  ) then
    raise exception 'This collector is not verified for this service';
  end if;

  update public.jobs
     set collector_id = p_collector_id, status = 'assigned', assigned_at = now(),
         accepted_at = null, en_route_at = null, updated_at = now()
   where id = p_job_id and status in ('pending', 'assigned', 'accepted', 'failed')
  returning * into v_job;
  if v_job.id is null then raise exception 'Job cannot be assigned in its current state'; end if;

  delete from public.job_declines where job_id = p_job_id and collector_id = p_collector_id;
  perform public.log_job_event(p_job_id, 'assigned', 'Assigned by dispatch');
  return v_job;
end;
$$;

create or replace function public.reopen_job(p_job_id uuid)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if not public.is_ops() then raise exception 'Only dispatch can reopen jobs'; end if;
  update public.jobs set status = 'pending', collector_id = null, failure_reason = null, updated_at = now()
   where id = p_job_id and status = 'failed'
  returning * into v_job;
  if v_job.id is null then raise exception 'Only jobs needing assistance can be reopened'; end if;
  perform public.log_job_event(p_job_id, 'pending', 'Returned to the queue by dispatch');
  return v_job;
end;
$$;

create or replace function public.set_final_amount(p_job_id uuid, p_amount numeric)
returns public.jobs
language plpgsql security definer set search_path = public
as $$
declare v_job public.jobs;
begin
  if not public.is_ops() then raise exception 'Only dispatch can confirm amounts'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'Enter a valid amount'; end if;
  update public.jobs set final_amount_ghs = round(p_amount, 2), updated_at = now()
   where id = p_job_id and status not in ('cancelled')
  returning * into v_job;
  if v_job.id is null then raise exception 'Job not found'; end if;
  return v_job;
end;
$$;

-- Manual payment record (cash or Mobile Money paid directly). Gateway payments
-- must be created/confirmed by a trusted server, not through this function.
create or replace function public.record_payment(p_job_id uuid, p_amount numeric, p_method public.payment_method, p_notes text)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.jobs;
  v_row public.payments;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found then raise exception 'Job not found'; end if;
  if not (public.is_ops() or (v_job.collector_id = auth.uid() and v_job.status in ('collecting', 'completed'))) then
    raise exception 'Not allowed to record a payment for this job';
  end if;
  if p_method = 'card' then raise exception 'Card payments are recorded by the payment provider'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount received'; end if;

  insert into public.payments (job_id, amount_ghs, method, status, provider, recorded_by, notes)
  values (p_job_id, round(p_amount, 2), p_method, 'successful', 'manual', auth.uid(), nullif(left(trim(p_notes), 300), ''))
  returning * into v_row;

  insert into public.notifications (user_id, job_id, title, body)
  select v_job.customer_id, v_job.id, 'Payment recorded',
         'GHS ' || to_char(v_row.amount_ghs, 'FM999999990.00') || ' received for pickup ' || v_job.reference || '.'
    from public.profiles p where p.id = v_job.customer_id and p.notify_payment_updates;
  return v_row;
end;
$$;

create or replace function public.update_payment_status(p_payment_id uuid, p_status public.payment_status)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare v_row public.payments;
begin
  if not public.is_ops() then raise exception 'Only dispatch can change payment status'; end if;
  update public.payments set status = p_status, updated_at = now()
   where id = p_payment_id
     and (status, p_status) in (
       ('pending', 'successful'), ('pending', 'failed'),
       ('successful', 'refund_pending'), ('refund_pending', 'refunded'), ('refund_pending', 'successful'))
  returning * into v_row;
  if v_row.id is null then raise exception 'Invalid payment status change'; end if;
  return v_row;
end;
$$;

create or replace function public.create_payout(p_collector_id uuid, p_job_id uuid, p_amount numeric)
returns public.collector_payouts
language plpgsql security definer set search_path = public
as $$
declare v_row public.collector_payouts;
begin
  if not public.is_ops() then raise exception 'Only dispatch can record payouts'; end if;
  insert into public.collector_payouts (collector_id, job_id, amount_ghs, created_by)
  values (p_collector_id, p_job_id, round(p_amount, 2), auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.mark_payout_paid(p_payout_id uuid)
returns public.collector_payouts
language plpgsql security definer set search_path = public
as $$
declare v_row public.collector_payouts;
begin
  if not public.is_ops() then raise exception 'Only dispatch can update payouts'; end if;
  update public.collector_payouts set status = 'paid', paid_at = now()
   where id = p_payout_id and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'Payout not found or already paid'; end if;
  return v_row;
end;
$$;

create or replace function public.update_ticket_status(p_ticket_id uuid, p_status public.ticket_status)
returns public.support_tickets
language plpgsql security definer set search_path = public
as $$
declare v_row public.support_tickets;
begin
  if not public.is_ops() then raise exception 'Only dispatch can update tickets'; end if;
  update public.support_tickets set status = p_status, updated_at = now() where id = p_ticket_id
  returning * into v_row;
  if v_row.id is null then raise exception 'Ticket not found'; end if;
  return v_row;
end;
$$;

-- Collector performance summary (self or dispatch). Amounts come only from
-- recorded payouts; estimates are computed in the app from platform_settings.
create or replace function public.collector_stats(p_collector_id uuid default null)
returns table (
  completed_total bigint, completed_today bigint, average_rating numeric, ratings_count bigint,
  payouts_paid_ghs numeric, payouts_pending_ghs numeric)
language plpgsql stable security definer set search_path = public
as $$
declare v_id uuid := coalesce(p_collector_id, auth.uid());
begin
  if v_id <> auth.uid() and not public.is_ops() then raise exception 'Not allowed'; end if;
  return query
  select
    (select count(*) from public.jobs where collector_id = v_id and status = 'completed'),
    (select count(*) from public.jobs where collector_id = v_id and status = 'completed'
        and completed_at >= date_trunc('day', now() at time zone 'Africa/Accra') at time zone 'Africa/Accra'),
    (select round(avg(rating)::numeric, 2) from public.jobs where collector_id = v_id and rating is not null),
    (select count(*) from public.jobs where collector_id = v_id and rating is not null),
    (select coalesce(sum(amount_ghs), 0) from public.collector_payouts where collector_id = v_id and status = 'paid'),
    (select coalesce(sum(amount_ghs), 0) from public.collector_payouts where collector_id = v_id and status = 'pending');
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = public
as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- -----------------------------------------------------------------------------
-- Recycling drop-offs
-- -----------------------------------------------------------------------------
create or replace function public.dropoffs_before_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (select role from public.profiles where id = new.partner_id) is distinct from 'partner' then
    raise exception 'Selected recipient is not a recycling partner';
  end if;
  new.status := 'pending';
  new.confirmed_weight_kg := null;
  new.confirmed_at := null;
  new.partner_notes := null;
  new.created_at := now();
  return new;
end;
$$;
create trigger dropoffs_before_insert before insert on public.dropoffs
  for each row execute function public.dropoffs_before_insert();

create or replace function public.confirm_dropoff(p_dropoff_id uuid, p_accept boolean, p_weight_kg numeric, p_notes text)
returns public.dropoffs
language plpgsql security definer set search_path = public
as $$
declare v_row public.dropoffs;
begin
  if p_accept and (p_weight_kg is null or p_weight_kg < 0) then raise exception 'Confirmed weight is required'; end if;
  update public.dropoffs
     set status = case when p_accept then 'received'::public.dropoff_status else 'rejected'::public.dropoff_status end,
         confirmed_weight_kg = case when p_accept then p_weight_kg else null end,
         partner_notes = nullif(left(trim(p_notes), 500), ''),
         confirmed_at = now()
   where id = p_dropoff_id and partner_id = auth.uid() and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'Drop-off cannot be updated'; end if;
  return v_row;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.platform_settings enable row level security;
alter table public.localities enable row level security;
alter table public.waste_categories enable row level security;
alter table public.service_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.collector_profiles enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.job_declines enable row level security;
alter table public.pickup_photos enable row level security;
alter table public.payments enable row level security;
alter table public.collector_payouts enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.dropoffs enable row level security;

-- Defence in depth: tables changed only through the functions above get no direct
-- write privileges, and anonymous users get no table access at all.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on
  public.jobs, public.job_events, public.job_declines, public.pickup_photos, public.payments,
  public.collector_payouts, public.notifications, public.collector_profiles,
  public.platform_settings, public.localities, public.waste_categories, public.service_categories
  from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke update, delete on public.dropoffs, public.support_tickets from authenticated;

-- Configuration: readable by signed-in users; changed via dashboard / service role.
create policy settings_read on public.platform_settings for select to authenticated using (true);
create policy localities_read on public.localities for select to authenticated using (true);
create policy waste_categories_read on public.waste_categories for select to authenticated using (true);
create policy service_categories_read on public.service_categories for select to authenticated using (true);

-- Profiles (inserted only through register_profile()).
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_ops()
    or role = 'partner'
    or exists (
      select 1 from public.jobs j
       where (j.customer_id = auth.uid() and j.collector_id = profiles.id)
          or (j.collector_id = auth.uid() and j.customer_id = profiles.id)
    )
    or exists (select 1 from public.dropoffs d where d.partner_id = auth.uid() and d.collector_id = profiles.id)
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, phone, organization_name, notify_job_updates, notify_payment_updates, notify_announcements, updated_at)
  on public.profiles to authenticated;

create policy collector_profiles_select on public.collector_profiles for select to authenticated
  using (
    collector_id = auth.uid()
    or public.is_ops()
    or exists (select 1 from public.jobs j where j.customer_id = auth.uid() and j.collector_id = collector_profiles.collector_id)
  );
-- Writes only through update_collector_details / set_availability / set_collector_status.

create policy saved_addresses_own on public.saved_addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Jobs: customers see their own; collectors see jobs assigned to them; dispatch sees all.
-- Open jobs reach collectors only through available_jobs().
create policy jobs_select on public.jobs for select to authenticated
  using (customer_id = auth.uid() or collector_id = auth.uid() or public.is_ops());

create policy job_events_select on public.job_events for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_events.job_id));

create policy job_declines_select on public.job_declines for select to authenticated
  using (collector_id = auth.uid() or public.is_ops());

create policy pickup_photos_select on public.pickup_photos for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = pickup_photos.job_id));

create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = payments.job_id));

create policy payouts_select on public.collector_payouts for select to authenticated
  using (collector_id = auth.uid() or public.is_ops());

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'open'
    and (job_id is null or exists (select 1 from public.jobs j where j.id = job_id))
  );
create policy tickets_select on public.support_tickets for select to authenticated
  using (user_id = auth.uid() or public.is_ops());

create policy dropoffs_insert_collector on public.dropoffs for insert to authenticated
  with check (collector_id = auth.uid() and public.is_approved_collector());
create policy dropoffs_select on public.dropoffs for select to authenticated
  using (collector_id = auth.uid() or partner_id = auth.uid() or public.is_ops());

-- -----------------------------------------------------------------------------
-- Storage: private bucket, path = <job_id>/<kind>/<file>
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pickup-photos', 'pickup-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy pickup_photos_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pickup-photos'
    and exists (
      select 1 from public.jobs j
       where j.id::text = (storage.foldername(name))[1]
         and (
           ((storage.foldername(name))[2] = 'customer' and j.customer_id = auth.uid()
              and j.status in ('pending', 'assigned', 'accepted'))
           or ((storage.foldername(name))[2] = 'before' and j.collector_id = auth.uid() and j.status = 'arrived')
           or ((storage.foldername(name))[2] = 'after' and j.collector_id = auth.uid() and j.status = 'collecting')
         )
    )
  );

create policy pickup_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'pickup-photos'
    and exists (
      select 1 from public.jobs j
       where j.id::text = (storage.foldername(name))[1]
         and (j.customer_id = auth.uid() or j.collector_id = auth.uid() or public.is_ops())
    )
  );

-- -----------------------------------------------------------------------------
-- Realtime (RLS applies to change events)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.jobs, public.notifications, public.payments, public.dropoffs, public.collector_profiles;
