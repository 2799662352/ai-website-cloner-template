const STORAGE_WARNING_THRESHOLD = 4 * 1024 * 1024;

export interface IStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getStorageInfo: () => Promise<{ type: 'localStorage'; isEncrypted: boolean }>;
}

class LocalStorageAdapter implements IStorageAdapter {
  private get isAvailable() { return typeof window !== 'undefined'; }

  async getItem(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;
    try { return localStorage.getItem(key); }
    catch { return null; }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isAvailable) return;
    try { localStorage.setItem(key, value); }
    catch (error: unknown) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanupOldData();
        localStorage.setItem(key, value);
      } else throw error;
    }
  }

  async removeItem(key: string): Promise<void> { if (this.isAvailable) localStorage.removeItem(key); }
  async clear(): Promise<void> { if (this.isAvailable) localStorage.clear(); }
  async getStorageInfo() { return { type: 'localStorage' as const, isEncrypted: false }; }

  private cleanupOldData(): void {
    const keys = Object.keys(localStorage).filter(k => k.includes('history') || k.includes('cache')).sort();
    const toDelete = Math.max(1, Math.floor(keys.length * 0.1));
    for (let i = 0; i < toDelete; i++) localStorage.removeItem(keys[i]);
  }
}

export const storage = new LocalStorageAdapter();

export const zustandStorageAdapter = {
  getItem: async (name: string) => {
    const value = await storage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: async (name: string, value: unknown) => {
    await storage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await storage.removeItem(name);
  },
};
