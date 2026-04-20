export interface MediaReference {
  index: number;
  type: 'image' | 'video' | 'audio';
  thumbnail?: string;
  label?: string;
  fileName?: string;
  url?: string;
  duration?: number;
}

export type ImageReference = MediaReference;
