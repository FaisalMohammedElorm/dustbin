// Domain types mirroring supabase/migrations. Keep in sync with the schema
// (or replace with `npx supabase gen types typescript` once the project is linked).

export type AppRole = 'customer' | 'collector' | 'ops' | 'partner';

export type JobStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'collecting'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type VehicleType = 'bicycle' | 'tricycle' | 'medium_truck' | 'large_truck';
export type CollectorStatus = 'pending_verification' | 'approved' | 'suspended';
export type PhotoKind = 'customer' | 'before' | 'after';
export type PaymentMethod = 'cash' | 'mobile_money' | 'card';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refund_pending' | 'refunded';
export type PayoutStatus = 'pending' | 'paid';
export type MaterialType = 'plastic' | 'metal' | 'paper' | 'glass' | 'organic' | 'e_waste' | 'mixed';
export type DropoffStatus = 'pending' | 'received' | 'rejected';
export type TicketCategory = 'complaint' | 'missed_pickup' | 'payment' | 'damage' | 'account' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export interface PlatformSettings {
  collector_share_percent: number | null;
  require_before_photo: boolean;
  scheduling_enabled: boolean;
  support_phone: string | null;
  support_email: string | null;
}

export interface Locality {
  code: string;
  name: string;
  region: string;
}

export interface WasteCategory {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export interface ServiceCategory {
  code: string;
  name: string;
  vehicle_label: string;
  description: string;
  best_for: string[];
  features: string[];
  allowed_vehicles: VehicleType[];
  price_min_ghs: number | null;
  price_max_ghs: number | null;
  quote_only: boolean;
  locality_codes: string[] | null;
}

export interface Catalog {
  settings: PlatformSettings;
  localities: Locality[];
  wasteCategories: WasteCategory[];
  serviceCategories: ServiceCategory[];
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  role: AppRole;
  full_name: string;
  phone: string;
  organization_name: string | null;
  notify_job_updates: boolean;
  notify_payment_updates: boolean;
  notify_announcements: boolean;
  created_at: string;
}

export interface CollectorProfile {
  collector_id: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  service_area: string | null;
  status: CollectorStatus;
  is_available: boolean;
  verified_at: string | null;
}

export type PersonSummary = Pick<Profile, 'id' | 'full_name' | 'phone'>;

export interface CollectorWithProfile extends PersonSummary {
  organization_name: string | null;
  collector: CollectorProfile | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  locality_code: string;
  address: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export interface Job {
  id: string;
  reference: string;
  customer_id: string;
  collector_id: string | null;
  status: JobStatus;
  waste_category: string;
  service_category: string;
  locality_code: string;
  address: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  scheduled_for: string | null;
  estimate_min_ghs: number | null;
  estimate_max_ghs: number | null;
  quote_required: boolean;
  final_amount_ghs: number | null;
  payment_method: PaymentMethod;
  cancel_reason: string | null;
  failure_reason: string | null;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  collecting_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  failed_at: string | null;
}

export interface JobWithPeople extends Job {
  customer: PersonSummary | null;
  collector: (PersonSummary & { collector_profile: Pick<CollectorProfile, 'vehicle_type' | 'vehicle_plate'> | null }) | null;
}

/** Area-level open job as returned by available_jobs() (no address / customer). */
export interface OpenJob {
  id: string;
  reference: string;
  waste_category: string;
  service_category: string;
  locality_code: string;
  approx_latitude: number | null;
  approx_longitude: number | null;
  scheduled_for: string | null;
  estimate_min_ghs: number | null;
  estimate_max_ghs: number | null;
  quote_required: boolean;
  payment_method: PaymentMethod;
  has_photos: boolean;
  created_at: string;
}

export interface JobEvent {
  id: number;
  job_id: string;
  status: JobStatus;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface PickupPhoto {
  id: string;
  job_id: string;
  kind: PhotoKind;
  storage_path: string;
  created_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  amount_ghs: number;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  provider_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface CollectorPayout {
  id: string;
  collector_id: string;
  job_id: string | null;
  amount_ghs: number;
  status: PayoutStatus;
  created_at: string;
  paid_at: string | null;
}

export interface CollectorStats {
  completed_total: number;
  completed_today: number;
  average_rating: number | null;
  ratings_count: number;
  payouts_paid_ghs: number;
  payouts_pending_ghs: number;
}

export interface AppNotification {
  id: string;
  job_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  job_id: string | null;
  category: TicketCategory;
  message: string;
  status: TicketStatus;
  created_at: string;
}

export interface Dropoff {
  id: string;
  collector_id: string;
  partner_id: string;
  material: MaterialType;
  estimated_weight_kg: number;
  confirmed_weight_kg: number | null;
  status: DropoffStatus;
  notes: string | null;
  partner_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  collector: PersonSummary | null;
  partner: (PersonSummary & { organization_name: string | null }) | null;
}
