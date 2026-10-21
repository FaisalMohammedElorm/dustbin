import { useMemo } from 'react';

import { iconOr, SERVICE_ICONS, type IconName } from '@/constants/labels';
import { useCatalog } from '@/features/jobs/hooks';
import type { Catalog, ServiceCategory } from '@/types/models';

export type Lookup = {
  catalog: Catalog | undefined;
  waste: (code: string) => { name: string; icon: IconName };
  service: (code: string) => { name: string; vehicle: string; icon: IconName; config: ServiceCategory | undefined };
  locality: (code: string) => string;
};

const titleCase = (code: string) => code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Resolves configured codes (waste/service/locality) to display names, with safe fallbacks. */
export function useLookup(): Lookup {
  const { data } = useCatalog();
  return useMemo(() => {
    const waste = new Map(data?.wasteCategories.map((w) => [w.code, w]));
    const services = new Map(data?.serviceCategories.map((s) => [s.code, s]));
    const localities = new Map(data?.localities.map((l) => [l.code, l]));
    return {
      catalog: data,
      waste: (code) => {
        const w = waste.get(code);
        return { name: w?.name ?? titleCase(code), icon: iconOr(w?.icon, 'delete-outline') };
      },
      service: (code) => {
        const s = services.get(code);
        return {
          name: s?.name ?? titleCase(code),
          vehicle: s?.vehicle_label ?? '',
          icon: SERVICE_ICONS[code] ?? 'truck-outline',
          config: s,
        };
      },
      locality: (code) => localities.get(code)?.name ?? titleCase(code),
    };
  }, [data]);
}
