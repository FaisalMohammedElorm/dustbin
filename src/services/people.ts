import { getSupabase, rpc, unwrap } from '@/services/client';
import type { CollectorProfile, CollectorStatus, CollectorWithProfile, Profile, SavedAddress, VehicleType } from '@/types/models';

export const PROFILE_COLUMNS =
  'id, role, full_name, phone, organization_name, notify_job_updates, notify_payment_updates, notify_announcements, created_at';

export async function fetchProfile(id: string) {
  return unwrap<Profile | null>(await getSupabase().from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle());
}

export type RegisterInput = {
  role: 'customer' | 'collector' | 'partner';
  fullName: string;
  phone: string; // E.164
  organizationName: string | null;
  vehicleType: VehicleType | null;
  vehiclePlate: string | null;
};

export const registerProfile = (i: RegisterInput) =>
  rpc<Profile>('register_profile', {
    p_role: i.role,
    p_full_name: i.fullName,
    p_phone: i.phone,
    p_organization_name: i.organizationName,
    p_vehicle_type: i.vehicleType,
    p_vehicle_plate: i.vehiclePlate,
  });

export type ProfileUpdate = Partial<
  Pick<Profile, 'full_name' | 'phone' | 'organization_name' | 'notify_job_updates' | 'notify_payment_updates' | 'notify_announcements'>
>;

export async function updateProfile(id: string, patch: ProfileUpdate) {
  return unwrap<Profile>(
    await getSupabase()
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PROFILE_COLUMNS)
      .single(),
  );
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------
const COLLECTOR_COLUMNS = 'collector_id, vehicle_type, vehicle_plate, service_area, status, is_available, verified_at';

export async function fetchCollectorProfile(id: string) {
  return unwrap<CollectorProfile | null>(
    await getSupabase().from('collector_profiles').select(COLLECTOR_COLUMNS).eq('collector_id', id).maybeSingle(),
  );
}

export const setAvailability = (available: boolean) => rpc<CollectorProfile>('set_availability', { p_available: available });

export const updateCollectorDetails = (vehicleType: VehicleType, plate: string, area: string) =>
  rpc<CollectorProfile>('update_collector_details', { p_vehicle_type: vehicleType, p_vehicle_plate: plate, p_service_area: area });

/** Dispatch view of collectors with their verification state. */
export async function fetchCollectors() {
  return unwrap<CollectorWithProfile[]>(
    await getSupabase()
      .from('profiles')
      .select(`id, full_name, phone, organization_name, collector:collector_profiles(${COLLECTOR_COLUMNS})`)
      .eq('role', 'collector')
      .order('full_name'),
  );
}

export const setCollectorStatus = (collectorId: string, status: CollectorStatus) =>
  rpc<CollectorProfile>('set_collector_status', { p_collector_id: collectorId, p_status: status });

export async function fetchPartners() {
  return unwrap<Profile[]>(await getSupabase().from('profiles').select(PROFILE_COLUMNS).eq('role', 'partner').order('full_name'));
}

// ---------------------------------------------------------------------------
// Saved addresses
// ---------------------------------------------------------------------------
const ADDRESS_COLUMNS = 'id, label, locality_code, address, landmark, latitude, longitude';

export async function fetchSavedAddresses() {
  return unwrap<SavedAddress[]>(await getSupabase().from('saved_addresses').select(ADDRESS_COLUMNS).order('created_at'));
}

export async function createSavedAddress(userId: string, a: Omit<SavedAddress, 'id'>) {
  return unwrap<SavedAddress>(
    await getSupabase()
      .from('saved_addresses')
      .insert({ ...a, user_id: userId })
      .select(ADDRESS_COLUMNS)
      .single(),
  );
}

export async function deleteSavedAddress(id: string) {
  unwrap(await getSupabase().from('saved_addresses').delete().eq('id', id));
}
