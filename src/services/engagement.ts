import { getSupabase, PAGE_SIZE, rpc, unwrap } from '@/services/client';
import type { AppNotification, Dropoff, MaterialType, SupportTicket, TicketCategory, TicketStatus } from '@/types/models';

// ---------------------------------------------------------------------------
// In-app notifications (created by database triggers)
// ---------------------------------------------------------------------------
export async function fetchNotificationsPage(page: number) {
  const from = page * PAGE_SIZE;
  return unwrap<AppNotification[]>(
    await getSupabase()
      .from('notifications')
      .select('id, job_id, title, body, read_at, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
  );
}

export async function fetchUnreadCount() {
  const { count, error } = await getSupabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const markNotificationsRead = (ids?: string[]) => rpc<void>('mark_notifications_read', { p_ids: ids ?? null });

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------
const TICKET_COLUMNS = 'id, job_id, category, message, status, created_at';

export async function fetchTickets() {
  return unwrap<SupportTicket[]>(
    await getSupabase().from('support_tickets').select(TICKET_COLUMNS).order('created_at', { ascending: false }).limit(50),
  );
}

export async function createTicket(userId: string, t: { category: TicketCategory; message: string; jobId: string | null }) {
  return unwrap<SupportTicket>(
    await getSupabase()
      .from('support_tickets')
      .insert({ user_id: userId, category: t.category, message: t.message, job_id: t.jobId })
      .select(TICKET_COLUMNS)
      .single(),
  );
}

export const updateTicketStatus = (id: string, status: TicketStatus) =>
  rpc<SupportTicket>('update_ticket_status', { p_ticket_id: id, p_status: status });

// ---------------------------------------------------------------------------
// Recycling drop-offs
// ---------------------------------------------------------------------------
const DROPOFF = `*,
  collector:profiles!dropoffs_collector_id_fkey(id, full_name, phone),
  partner:profiles!dropoffs_partner_id_fkey(id, full_name, organization_name, phone)`;

export async function fetchDropoffs(filter: { collectorId?: string; partnerId?: string }) {
  let q = getSupabase().from('dropoffs').select(DROPOFF);
  if (filter.collectorId) q = q.eq('collector_id', filter.collectorId);
  if (filter.partnerId) q = q.eq('partner_id', filter.partnerId);
  return unwrap<Dropoff[]>(await q.order('created_at', { ascending: false }).limit(50));
}

export async function fetchDropoff(id: string) {
  return unwrap<Dropoff | null>(await getSupabase().from('dropoffs').select(DROPOFF).eq('id', id).maybeSingle());
}

export async function createDropoff(
  collectorId: string,
  d: { partner_id: string; material: MaterialType; estimated_weight_kg: number; notes: string | null },
) {
  return unwrap<Dropoff>(await getSupabase().from('dropoffs').insert({ ...d, collector_id: collectorId }).select('*').single());
}

export const confirmDropoff = (id: string, accept: boolean, weightKg: number | null, notes: string) =>
  rpc<Dropoff>('confirm_dropoff', { p_dropoff_id: id, p_accept: accept, p_weight_kg: weightKg, p_notes: notes });
