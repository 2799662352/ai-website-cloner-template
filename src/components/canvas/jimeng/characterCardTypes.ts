export interface CharacterBookEntry {
  keys: string[];
  secondary_keys?: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  enabled: boolean;
  position: 'before_char' | 'after_char';
  extensions: Record<string, unknown>;
  id?: number;
  priority?: number;
}

export interface CharacterBook {
  name?: string;
  entries: CharacterBookEntry[];
}

export interface V2CharData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  character_book?: CharacterBook;
  tags: string[];
  creator: string;
  character_version: string;
  avatar?: string;
  extensions: {
    talkativeness?: number;
    fav?: boolean;
    world?: string;
    depth_prompt?: { prompt: string; depth: number; role: 'system' | 'user' | 'assistant' };
    soraui?: {
      token: string;
      usageCount: number;
      isFavorite: boolean;
      createdAt: number;
      updatedAt: number;
      avatarUrl?: string;
      dbId?: string;
      videoPreferences?: { defaultDuration: number; defaultResolution: string; defaultFps: number };
    };
    [key: string]: unknown;
  };
}

export interface CharacterCard {
  spec: 'chara_card_v2' | 'chara_card_v3';
  spec_version: '2.0' | '3.0';
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment?: string;
  avatar: string;
  chat: string;
  talkativeness: number;
  fav: boolean;
  tags: string[];
  create_date: string;
  data: V2CharData;
  json_data?: string;
  date_added?: number;
  date_last_chat?: number;
  chat_size?: number;
  data_size?: number;
}
