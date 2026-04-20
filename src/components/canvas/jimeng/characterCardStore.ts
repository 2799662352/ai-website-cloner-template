import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CharacterCard } from './characterCardTypes';
import { characterCardService } from './characterCardService';
import { message } from 'antd';
import { zustandStorageAdapter } from './storageAdapter';

interface CharacterCardState {
  cards: Map<string, CharacterCard>;
  activeCardId: string | null;
  loadingStates: Map<string, boolean>;
  searchQuery: string;

  getActiveCard: () => CharacterCard | null;
  getCardByToken: (token: string) => CharacterCard | undefined;
  getTokenSuggestions: (partial: string) => string[];
  getFavoriteCards: () => CharacterCard[];
  getFilteredCards: () => CharacterCard[];

  addCard: (card: CharacterCard, silent?: boolean) => void;
  removeCard: (name: string, silent?: boolean) => void;
  updateCard: (name: string, updates: Partial<CharacterCard['data']>) => void;
  setActiveCard: (name: string | null) => void;

  importFromPNG: (file: File) => Promise<CharacterCard | null>;
  exportToPNG: (name: string, imageFile?: File) => Promise<void>;

  updateToken: (name: string, newToken: string) => void;
  checkTokenUnique: (token: string, excludeName?: string) => boolean;
  toggleFavorite: (name: string) => void;
  setSearchQuery: (query: string) => void;
  clearAllCards: () => void;
  importMultiplePNGs: (files: File[]) => Promise<void>;
  getCardStats: () => { total: number; favorites: number; recentlyUsed: number };
}

export const useCharacterCardStore = create<CharacterCardState>()(
  devtools(
    persist(
      (set, get) => ({
        cards: new Map(),
        activeCardId: null,
        loadingStates: new Map(),
        searchQuery: '',

        getActiveCard: () => {
          const { cards, activeCardId } = get();
          return activeCardId ? cards.get(activeCardId) || null : null;
        },

        getCardByToken: (token: string) => {
          return Array.from(get().cards.values()).find(
            card => card.data.extensions?.soraui?.token === token
          );
        },

        getTokenSuggestions: (partial: string) => {
          if (!partial || !partial.startsWith('@')) return [];
          const search = partial.slice(1).toLowerCase();
          const suggestions: string[] = [];
          get().cards.forEach(card => {
            const token = card.data.extensions?.soraui?.token;
            if (token && token.toLowerCase().includes(search)) suggestions.push(token);
          });
          return suggestions.sort((a, b) => {
            const aS = a.toLowerCase().startsWith('@' + search);
            const bS = b.toLowerCase().startsWith('@' + search);
            if (aS && !bS) return -1;
            if (!aS && bS) return 1;
            return a.localeCompare(b);
          }).slice(0, 10);
        },

        getFavoriteCards: () =>
          Array.from(get().cards.values()).filter(c => c.data.extensions?.soraui?.isFavorite),

        getFilteredCards: () => {
          const { cards, searchQuery } = get();
          const all = Array.from(cards.values());
          if (!searchQuery) return all;
          const q = searchQuery.toLowerCase();
          return all.filter(c =>
            c.data.name.toLowerCase().includes(q) ||
            c.data.description.toLowerCase().includes(q) ||
            (c.data.extensions?.soraui?.token?.toLowerCase() || '').includes(q) ||
            (c.data.tags?.join(' ').toLowerCase() || '').includes(q)
          );
        },

        addCard: (card, silent = false) => {
          set(state => {
            const m = new Map(state.cards);
            m.set(card.data.name, card);
            return { cards: m };
          });
          if (!silent) message.success(`已添加角色卡: ${card.data.name}`);
        },

        removeCard: (name, silent = false) => {
          set(state => {
            const m = new Map(state.cards);
            m.delete(name);
            const patch: Partial<typeof state> = { cards: m };
            if (state.activeCardId === name) patch.activeCardId = null;
            return patch;
          });
          if (!silent) message.success(`已删除角色卡: ${name}`);
        },

        updateCard: (name, updates) => {
          set(state => {
            const card = state.cards.get(name);
            if (!card) return state;
            const m = new Map(state.cards);
            m.set(name, { ...card, data: { ...card.data, ...updates } });
            return { cards: m };
          });
        },

        setActiveCard: (name) => {
          set({ activeCardId: name });
          if (name) {
            const card = get().cards.get(name);
            if (card?.data.extensions?.soraui) {
              card.data.extensions.soraui.usageCount += 1;
              get().updateCard(name, card.data);
            }
          }
        },

        importFromPNG: async (file) => {
          try {
            const isValid = await characterCardService.validatePNG(file);
            if (!isValid) return null;
            const card = await characterCardService.importFromPNG(file);
            get().addCard(card);
            return card;
          } catch (e) {
            console.error('[CharacterCardStore] 导入失败:', e);
            return null;
          }
        },

        exportToPNG: async (name, imageFile) => {
          const card = get().cards.get(name);
          if (!card) { message.error('角色卡不存在'); return; }
          try {
            const blob = await characterCardService.exportToPNG(card, imageFile);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_character_card.png`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('导出成功');
          } catch (e) { console.error('[CharacterCardStore] 导出失败:', e); }
        },

        updateToken: (name, newToken) => {
          const card = get().cards.get(name);
          if (!card) return;
          if (!get().checkTokenUnique(newToken, name)) { message.error('Token 已被其他角色使用'); return; }
          const formatted = newToken.startsWith('@') ? newToken : `@${newToken}`;
          characterCardService.setToken(card, formatted);
          get().updateCard(name, card.data);
          message.success('Token 更新成功');
        },

        checkTokenUnique: (token, excludeName) => {
          for (const [name, card] of get().cards) {
            if (name === excludeName) continue;
            if (card.data.extensions?.soraui?.token === token) return false;
          }
          return true;
        },

        toggleFavorite: (name) => {
          const card = get().cards.get(name);
          if (!card) return;
          characterCardService.toggleFavorite(card);
          get().updateCard(name, card.data);
        },

        setSearchQuery: (query) => set({ searchQuery: query }),

        clearAllCards: () => {
          if (!window.confirm('确定要清空所有角色卡吗？此操作不可恢复。')) return;
          set({ cards: new Map(), activeCardId: null });
          message.success('已清空所有角色卡');
        },

        importMultiplePNGs: async (files) => {
          let ok = 0, fail = 0;
          for (const f of files) { (await get().importFromPNG(f)) ? ok++ : fail++; }
          if (ok) message.success(`成功导入 ${ok} 个角色卡`);
          if (fail) message.warning(`${fail} 个文件导入失败`);
        },

        getCardStats: () => {
          const all = Array.from(get().cards.values());
          const now = Date.now();
          const week = 7 * 24 * 60 * 60 * 1000;
          return {
            total: all.length,
            favorites: all.filter(c => c.data.extensions?.soraui?.isFavorite).length,
            recentlyUsed: all.filter(c => now - (c.data.extensions?.soraui?.updatedAt || 0) < week).length,
          };
        },
      }),
      {
        name: 'character-card-storage',
        storage: {
          getItem: async (name) => {
            const value = await zustandStorageAdapter.getItem(name);
            if (!value) return null;
            const { state } = value;
            if (state.cards && Array.isArray(state.cards)) state.cards = new Map(state.cards);
            if (state.loadingStates && Array.isArray(state.loadingStates)) state.loadingStates = new Map(state.loadingStates);
            return { state };
          },
          setItem: async (name, value) => {
            const { state } = value;
            await zustandStorageAdapter.setItem(name, {
              state: { ...state, cards: Array.from(state.cards.entries()), loadingStates: Array.from(state.loadingStates.entries()) },
            });
          },
          removeItem: async (name) => await zustandStorageAdapter.removeItem(name),
        },
      }
    )
  )
);
