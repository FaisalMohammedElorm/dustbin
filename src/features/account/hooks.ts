import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/features/query-keys';
import { PAGE_SIZE } from '@/services/client';
import {
  confirmDropoff,
  createDropoff,
  createTicket,
  fetchDropoff,
  fetchDropoffs,
  fetchNotificationsPage,
  fetchTickets,
  fetchUnreadCount,
  markNotificationsRead,
} from '@/services/engagement';
import { createSavedAddress, deleteSavedAddress, fetchSavedAddresses } from '@/services/people';
import type { MaterialType, SavedAddress, TicketCategory } from '@/types/models';

// Notifications
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: qk.notifications,
    queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
    select: (d) => d.pages.flat(),
  });
}
export const useUnreadCount = () => useQuery({ queryKey: qk.unread, queryFn: fetchUnreadCount });
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

// Saved addresses
export const useSavedAddresses = () => useQuery({ queryKey: qk.addresses, queryFn: fetchSavedAddresses });
export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { userId: string; address: Omit<SavedAddress, 'id'> }) => createSavedAddress(a.userId, a.address),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  });
}
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteSavedAddress, onSettled: () => qc.invalidateQueries({ queryKey: qk.addresses }) });
}

// Support
export const useTickets = () => useQuery({ queryKey: qk.tickets, queryFn: fetchTickets });
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { userId: string; category: TicketCategory; message: string; jobId: string | null }) =>
      createTicket(a.userId, a),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tickets }),
  });
}

// Recycling drop-offs
export const useDropoffs = (filter: { collectorId?: string; partnerId?: string }) =>
  useQuery({ queryKey: qk.dropoffList(filter), queryFn: () => fetchDropoffs(filter) });
export const useDropoff = (id: string) => useQuery({ queryKey: qk.dropoff(id), queryFn: () => fetchDropoff(id) });

function useDropoffMutation<TArgs, TResult>(fn: (a: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: qk.dropoffs }) });
}
export const useCreateDropoff = () =>
  useDropoffMutation(
    (a: { collectorId: string; input: { partner_id: string; material: MaterialType; estimated_weight_kg: number; notes: string | null } }) =>
      createDropoff(a.collectorId, a.input),
  );
export const useConfirmDropoff = () =>
  useDropoffMutation((a: { id: string; accept: boolean; weightKg: number | null; notes: string }) =>
    confirmDropoff(a.id, a.accept, a.weightKg, a.notes),
  );
