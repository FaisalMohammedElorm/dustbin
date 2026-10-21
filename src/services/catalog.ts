import { getSupabase, unwrap } from '@/services/client';
import type { Catalog, Locality, PlatformSettings, ServiceCategory, WasteCategory } from '@/types/models';

/** Business configuration (services, waste types, areas, settings) maintained by operations. */
export async function fetchCatalog(): Promise<Catalog> {
  const supabase = getSupabase();
  const [settings, localities, waste, services] = await Promise.all([
    supabase
      .from('platform_settings')
      .select('collector_share_percent, require_before_photo, scheduling_enabled, support_phone, support_email')
      .maybeSingle(),
    supabase.from('localities').select('code, name, region').eq('is_active', true).order('sort_order'),
    supabase.from('waste_categories').select('code, name, description, icon').eq('is_active', true).order('sort_order'),
    supabase
      .from('service_categories')
      .select(
        'code, name, vehicle_label, description, best_for, features, allowed_vehicles, price_min_ghs, price_max_ghs, quote_only, locality_codes',
      )
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  const s = unwrap<PlatformSettings | null>(settings);
  return {
    settings: s ?? {
      collector_share_percent: null,
      require_before_photo: true,
      scheduling_enabled: false,
      support_phone: null,
      support_email: null,
    },
    localities: unwrap<Locality[]>(localities),
    wasteCategories: unwrap<WasteCategory[]>(waste),
    serviceCategories: unwrap<ServiceCategory[]>(services),
  };
}
