import 'expo-sqlite/localStorage/install';

/**
 * Small, non-sensitive per-device preferences (intro seen, form drafts).
 * Never store tokens, payment data or personal details here.
 */
export const localStore = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`dba:${key}`);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`dba:${key}`, JSON.stringify(value));
    } catch {
      // Storage unavailable: the feature degrades gracefully (e.g. intro shows again).
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(`dba:${key}`);
    } catch {
      // ignore
    }
  },
};
