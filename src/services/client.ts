import { getSupabase } from '@/lib/supabase';

export const PAGE_SIZE = 20;

export class ServiceError extends Error {}

/** Unwraps a Supabase response, turning errors into ServiceError with the server's message. */
export function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new ServiceError(error.message);
  return data as T;
}

/** Calls a Postgres function (all state changes go through these). */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return unwrap<T>(await getSupabase().rpc(fn, args));
}

export { getSupabase };
