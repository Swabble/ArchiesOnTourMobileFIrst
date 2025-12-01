export const storage = {
  get<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error('Storage get failed', error);
      return null;
    }
  },
  set<T>(key: string, value: T) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set failed', error);
    }
  },
};
