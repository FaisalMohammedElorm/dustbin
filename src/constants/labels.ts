import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { STATUS_LABEL } from '@/domain/job-status';
import type {
  AppRole,
  CollectorStatus,
  DropoffStatus,
  JobStatus,
  MaterialType,
  PaymentMethod,
  PaymentStatus,
  TicketCategory,
  TicketStatus,
  VehicleType,
} from '@/types/models';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

/** Icons stored in configuration tables are validated before use. */
export function iconOr(name: string | null | undefined, fallback: IconName): IconName {
  return name && name in MaterialCommunityIcons.glyphMap ? (name as IconName) : fallback;
}

export const ROLE_INFO: Record<AppRole, { label: string; description: string; icon: IconName }> = {
  customer: { label: 'Customer', description: 'Request waste pickups for your home or business.', icon: 'home-variant-outline' },
  collector: { label: 'Collector', description: 'Tricycle or truck operator completing pickup jobs.', icon: 'truck-outline' },
  partner: { label: 'Recycling partner', description: 'Receive and confirm recyclable material drop-offs.', icon: 'recycle' },
  ops: { label: 'Dispatch', description: 'DustBin operations team.', icon: 'headset' },
};

export const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone; icon: IconName }> = {
  pending: { label: STATUS_LABEL.pending, tone: 'warning', icon: 'clock-outline' },
  assigned: { label: STATUS_LABEL.assigned, tone: 'info', icon: 'account-arrow-right-outline' },
  accepted: { label: STATUS_LABEL.accepted, tone: 'info', icon: 'account-check-outline' },
  en_route: { label: STATUS_LABEL.en_route, tone: 'info', icon: 'truck-fast-outline' },
  arrived: { label: STATUS_LABEL.arrived, tone: 'info', icon: 'map-marker-check-outline' },
  collecting: { label: STATUS_LABEL.collecting, tone: 'info', icon: 'delete-restore' },
  completed: { label: STATUS_LABEL.completed, tone: 'success', icon: 'check-circle-outline' },
  cancelled: { label: STATUS_LABEL.cancelled, tone: 'neutral', icon: 'close-circle-outline' },
  failed: { label: STATUS_LABEL.failed, tone: 'danger', icon: 'lifebuoy' },
};

export const VEHICLES: Record<VehicleType, { label: string; icon: IconName }> = {
  bicycle: { label: 'Bicycle', icon: 'bicycle-cargo' },
  tricycle: { label: 'Tricycle (aboboyaa)', icon: 'rickshaw' },
  medium_truck: { label: 'Medium truck', icon: 'truck-outline' },
  large_truck: { label: 'Large truck', icon: 'dump-truck' },
};

export const SERVICE_ICONS: Record<string, IconName> = {
  basic: 'rickshaw',
  premium: 'truck-outline',
  advanced: 'dump-truck',
  industrial: 'factory',
};

export const COLLECTOR_STATUS: Record<CollectorStatus, { label: string; tone: Tone }> = {
  pending_verification: { label: 'Awaiting verification', tone: 'warning' },
  approved: { label: 'Verified', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; short: string; icon: IconName }> = {
  cash: { label: 'Cash on pickup', short: 'Cash', icon: 'cash' },
  mobile_money: { label: 'Mobile Money on pickup', short: 'Mobile Money', icon: 'cellphone' },
  card: { label: 'Card', short: 'Card', icon: 'credit-card-outline' },
};

export const PAYMENT_STATUS: Record<PaymentStatus | 'none', { label: string; tone: Tone }> = {
  none: { label: 'Not yet paid', tone: 'neutral' },
  pending: { label: 'Payment pending', tone: 'warning' },
  successful: { label: 'Paid', tone: 'success' },
  failed: { label: 'Payment failed', tone: 'danger' },
  refund_pending: { label: 'Refund pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const MATERIALS: Record<MaterialType, { label: string; icon: IconName }> = {
  plastic: { label: 'Plastic', icon: 'bottle-soda-classic-outline' },
  metal: { label: 'Metal', icon: 'nut' },
  paper: { label: 'Paper & card', icon: 'package-variant' },
  glass: { label: 'Glass', icon: 'glass-fragile' },
  organic: { label: 'Organic', icon: 'leaf' },
  e_waste: { label: 'E-waste', icon: 'cellphone-cog' },
  mixed: { label: 'Mixed', icon: 'shape-outline' },
};

export const DROPOFF_STATUS: Record<DropoffStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Awaiting confirmation', tone: 'warning' },
  received: { label: 'Received', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const TICKET_CATEGORIES: Record<TicketCategory, { label: string; icon: IconName }> = {
  missed_pickup: { label: 'Missed or late pickup', icon: 'clock-alert-outline' },
  complaint: { label: 'Service complaint', icon: 'comment-alert-outline' },
  payment: { label: 'Payment issue', icon: 'cash-remove' },
  damage: { label: 'Damage or spillage', icon: 'alert-octagon-outline' },
  account: { label: 'Account help', icon: 'account-question-outline' },
  other: { label: 'Something else', icon: 'help-circle-outline' },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};
