import type { CharacterCard } from './characterCardTypes';

class CharacterCardService {
  async validatePNG(_file: File): Promise<boolean> {
    console.warn('[CharacterCardService] stub: validatePNG');
    return false;
  }

  async importFromPNG(_file: File): Promise<CharacterCard> {
    throw new Error('[CharacterCardService] stub: PNG import not available in canvas mode');
  }

  async exportToPNG(_card: CharacterCard, _imageFile?: File): Promise<Blob> {
    throw new Error('[CharacterCardService] stub: PNG export not available in canvas mode');
  }

  getToken(card: CharacterCard): string {
    return card.data.extensions?.soraui?.token || `@${card.data.name}`;
  }

  setToken(card: CharacterCard, token: string): void {
    if (card.data.extensions?.soraui) {
      card.data.extensions.soraui.token = token;
      card.data.extensions.soraui.updatedAt = Date.now();
    }
  }

  toggleFavorite(card: CharacterCard): void {
    if (card.data.extensions?.soraui) {
      card.data.extensions.soraui.isFavorite = !card.data.extensions.soraui.isFavorite;
      card.data.extensions.soraui.updatedAt = Date.now();
    }
  }
}

export const characterCardService = new CharacterCardService();
