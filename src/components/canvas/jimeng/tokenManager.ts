export interface TokenItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail?: string;
  images?: string[];
  projectId?: string;
  isPublic?: boolean;
  author?: string;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt?: number;
  isFavorite?: boolean;
}

interface TokenCategory {
  name: string;
  color: string;
  icon?: string;
}

interface TokenProject {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  tokens: string[];
  createdAt: number;
  updatedAt: number;
  author?: string;
  isPublic?: boolean;
  tags?: string[];
}

class TokenManager {
  private tokens: Map<string, TokenItem> = new Map();
  private categories: Map<string, TokenCategory> = new Map();
  private projects: Map<string, TokenProject> = new Map();
  private readonly STORAGE_KEY = 'sora-ui-prompt-tokens';
  private readonly CATEGORIES_KEY = 'sora-ui-token-categories';
  private readonly PROJECTS_KEY = 'sora-ui-token-projects';

  constructor() {
    this.initDefaultCategories();
    this.loadFromStorage();
  }

  private initDefaultCategories() {
    const defaults: TokenCategory[] = [
      { name: '人物', color: '#1890ff', icon: '👤' },
      { name: '场景', color: '#52c41a', icon: '🏞️' },
      { name: '风格', color: '#722ed1', icon: '🎨' },
      { name: '动作', color: '#fa8c16', icon: '🎬' },
      { name: '物体', color: '#13c2c2', icon: '📦' },
      { name: '效果', color: '#eb2f96', icon: '✨' },
      { name: '其他', color: '#8c8c8c', icon: '📌' },
    ];
    defaults.forEach(cat => this.categories.set(cat.name, cat));
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const tokensJson = localStorage.getItem(this.STORAGE_KEY);
      if (tokensJson) JSON.parse(tokensJson).forEach((t: TokenItem) => this.tokens.set(t.key, t));
      const catsJson = localStorage.getItem(this.CATEGORIES_KEY);
      if (catsJson) JSON.parse(catsJson).forEach((c: TokenCategory) => this.categories.set(c.name, c));
      const projJson = localStorage.getItem(this.PROJECTS_KEY);
      if (projJson) JSON.parse(projJson).forEach((p: TokenProject) => this.projects.set(p.id, p));
    } catch (e) { console.error('[TokenManager] Load failed:', e); }
  }

  private async saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.tokens.values())));
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(Array.from(this.categories.values())));
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(Array.from(this.projects.values())));
    } catch (e) { console.error('[TokenManager] Save failed:', e); }
  }

  public async upsertToken(token: Omit<TokenItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<TokenItem> {
    const existing = this.tokens.get(token.key);
    const item: TokenItem = {
      ...existing, ...token,
      id: existing?.id || `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      usageCount: existing?.usageCount || 0,
    };
    this.tokens.set(token.key, item);
    await this.saveToStorage();
    return item;
  }

  public async deleteToken(key: string): Promise<boolean> {
    const ok = this.tokens.delete(key);
    if (ok) await this.saveToStorage();
    return ok;
  }

  public getToken(key: string): TokenItem | undefined { return this.tokens.get(key); }
  public getAllTokens(): TokenItem[] { return Array.from(this.tokens.values()); }

  public getSuggestions(prefix: string): TokenItem[] {
    const lp = prefix.toLowerCase();
    return Array.from(this.tokens.values())
      .filter(t => t.key.toLowerCase().startsWith(lp))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  public replaceTokens(text: string, options: { preview?: boolean } = {}): {
    result: string;
    replacements: Array<{ token: string; value: string; count: number }>;
  } {
    let result = text;
    const replacements: Array<{ token: string; value: string; count: number }> = [];
    const matches = text.match(/@[\w\u4e00-\u9fa5]+/g);
    if (!matches) return { result, replacements };
    const unique = [...new Set(matches)];
    unique.forEach(tokenKey => {
      const token = this.tokens.get(tokenKey);
      if (token) {
        const count = (text.match(new RegExp(tokenKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        result = result.replace(new RegExp(tokenKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), token.value);
        replacements.push({ token: tokenKey, value: token.value, count });
        if (!options.preview) { token.usageCount += count; token.lastUsedAt = Date.now(); this.tokens.set(tokenKey, token); }
      }
    });
    if (!options.preview && replacements.length > 0) this.saveToStorage();
    return { result, replacements };
  }

  public getAllCategories(): TokenCategory[] { return Array.from(this.categories.values()); }
}

export const tokenManager = new TokenManager();
export type { TokenCategory, TokenProject };
