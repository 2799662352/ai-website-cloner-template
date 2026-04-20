import { tokenManager, TokenItem } from './tokenManager';
import { useCharacterCardStore } from './characterCardStore';
import type { CharacterCard } from './characterCardTypes';

export interface TokenSuggestion {
  key: string;
  value: string;
  description?: string;
  category: string;
  type: 'character' | 'token' | 'image_ref';
  thumbnail?: string;
  usageCount: number;
  isFavorite?: boolean;
  // The concrete shape varies (CharacterCard, TokenItem, or mediaRef meta);
  // consumers narrow at the call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

export interface AutocompleteOptions {
  maxResults?: number;
  includeCharacters?: boolean;
  includeTokens?: boolean;
  favoriteFirst?: boolean;
  sortBy?: 'usage' | 'name' | 'recent';
}

class CharacterCardTokenManager {
  detectAtSymbol(text: string, cursorPosition: number): {
    atPosition: number;
    prefix: string;
    shouldShow: boolean;
  } | null {
    let atPosition = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      if (/[\s\n\r,，。！？!?]/.test(char)) break;
      if (char === '@') { atPosition = i; break; }
    }
    if (atPosition === -1) return null;
    const prefix = text.substring(atPosition, cursorPosition);
    const isValidPosition = atPosition === 0 || /[\s\n\r]/.test(text[atPosition - 1]);
    return { atPosition, prefix, shouldShow: isValidPosition && prefix.length >= 1 };
  }

  async getSuggestions(prefix: string, options: AutocompleteOptions = {}): Promise<TokenSuggestion[]> {
    const { maxResults = 10, includeCharacters = true, includeTokens = true, favoriteFirst = true, sortBy = 'usage' } = options;
    const cleanPrefix = prefix.replace('@', '').toLowerCase();
    const suggestions: TokenSuggestion[] = [];

    if (includeCharacters) {
      const store = useCharacterCardStore.getState();
      store.getTokenSuggestions(prefix).forEach(token => {
        const card = store.getCardByToken(token);
        if (card) {
          suggestions.push({
            key: token,
            value: card.data.name,
            description: card.data.description.slice(0, 100) + '...',
            category: '角色卡',
            type: 'character',
            thumbnail: card.data.avatar || card.data.extensions?.soraui?.avatarUrl,
            usageCount: card.data.extensions?.soraui?.usageCount || 0,
            isFavorite: card.data.extensions?.soraui?.isFavorite,
            metadata: { tags: card.data.tags, creator: card.data.creator },
          });
        }
      });
    }

    if (includeTokens) {
      tokenManager.getSuggestions(prefix).forEach((token: TokenItem) => {
        suggestions.push({
          key: token.key,
          value: token.value,
          description: token.description,
          category: token.category || '其他',
          type: 'token',
          thumbnail: token.thumbnail,
          usageCount: token.usageCount,
          isFavorite: token.isFavorite,
          metadata: { tags: token.tags, author: token.author },
        });
      });
    }

    suggestions.sort((a, b) => {
      if (favoriteFirst) {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
      }
      switch (sortBy) {
        case 'usage': return b.usageCount - a.usageCount;
        case 'name': return a.value.localeCompare(b.value);
        default: return b.usageCount - a.usageCount;
      }
    });

    return suggestions.slice(0, maxResults);
  }

  applyToken(text: string, cursorPosition: number, selectedToken: string): { newText: string; newCursorPosition: number } {
    const detection = this.detectAtSymbol(text, cursorPosition);
    if (!detection) {
      const before = text.substring(0, cursorPosition);
      const after = text.substring(cursorPosition);
      return { newText: before + selectedToken + ' ' + after, newCursorPosition: cursorPosition + selectedToken.length + 1 };
    }
    const before = text.substring(0, detection.atPosition);
    const after = text.substring(cursorPosition);
    const newText = before + selectedToken + ' ' + after;
    this.recordTokenUsage(selectedToken);
    return { newText, newCursorPosition: detection.atPosition + selectedToken.length + 1 };
  }

  private recordTokenUsage(token: string): void {
    const store = useCharacterCardStore.getState();
    const card = store.getCardByToken(token);
    if (card) store.setActiveCard(card.data.name);
  }

  replaceAllTokens(text: string) {
    let result = text;
    const replacements: Array<{ token: string; value: string; source: 'character' | 'token' }> = [];
    const matches = text.match(/@[\w\u4e00-\u9fa5]+/g) || [];
    const unique = [...new Set(matches)];
    const store = useCharacterCardStore.getState();

    unique.forEach(tokenKey => {
      const card = store.getCardByToken(tokenKey);
      if (card) {
        result = result.replace(new RegExp(tokenKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), card.data.name);
        replacements.push({ token: tokenKey, value: card.data.name, source: 'character' });
        this.recordTokenUsage(tokenKey);
      } else {
        const t = tokenManager.getToken(tokenKey);
        if (t) {
          result = result.replace(new RegExp(tokenKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), t.value);
          replacements.push({ token: tokenKey, value: t.value, source: 'token' });
        }
      }
    });

    const tokenResult = tokenManager.replaceTokens(result, { preview: true });
    return {
      result: tokenResult.result,
      replacements: [...replacements, ...tokenResult.replacements.map(r => ({ ...r, source: 'token' as const }))],
    };
  }

  isTokenExists(token: string): boolean {
    return !!useCharacterCardStore.getState().getCardByToken(token) || !!tokenManager.getToken(token);
  }

  getTokenDetail(token: string): { type: 'character' | 'token'; data: CharacterCard | TokenItem | null } | null {
    const card = useCharacterCardStore.getState().getCardByToken(token);
    if (card) return { type: 'character', data: card };
    const t = tokenManager.getToken(token);
    if (t) return { type: 'token', data: t };
    return null;
  }

  getAllAvailableTokens(): TokenSuggestion[] {
    const suggestions: TokenSuggestion[] = [];
    const store = useCharacterCardStore.getState();
    store.getFilteredCards().forEach(card => {
      const token = card.data.extensions?.soraui?.token;
      if (token) {
        suggestions.push({
          key: token, value: card.data.name, description: card.data.description,
          category: '角色卡', type: 'character',
          thumbnail: card.data.avatar || card.data.extensions?.soraui?.avatarUrl,
          usageCount: card.data.extensions?.soraui?.usageCount || 0,
          isFavorite: card.data.extensions?.soraui?.isFavorite, metadata: card,
        });
      }
    });
    tokenManager.getAllTokens().forEach((t: TokenItem) => {
      suggestions.push({
        key: t.key, value: t.value, description: t.description,
        category: t.category || '其他', type: 'token',
        thumbnail: t.thumbnail, usageCount: t.usageCount, isFavorite: t.isFavorite, metadata: t,
      });
    });
    return suggestions;
  }
}

export const characterCardTokenManager = new CharacterCardTokenManager();
