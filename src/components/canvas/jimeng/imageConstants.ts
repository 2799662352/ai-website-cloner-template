export interface ImageModelOption {
  value: string;
  label: string;
  description: string;
}

export interface ImageRatioOption {
  value: string;
  label: string;
}

export interface ImageQualityOption {
  value: string;
  label: string;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  { value: 'lib-nano-pro', label: 'Lib Nano Pro', description: '高质量通用模型' },
  { value: 'lib-standard', label: 'Lib Standard', description: '快速生成' },
  { value: 'nebula-ultra', label: 'Nebula Ultra', description: '超高清细节' },
];

export const IMAGE_RATIOS: ImageRatioOption[] = [
  { value: 'auto', label: '自适应' },
  { value: '1:1', label: '1:1' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '4:5', label: '4:5' },
  { value: '5:4', label: '5:4' },
  { value: '21:9', label: '21:9' },
];

export const IMAGE_QUALITIES: ImageQualityOption[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const RATIO_ICONS: Record<string, { w: number; h: number }> = {
  'auto': { w: 14, h: 14 },
  '1:1': { w: 12, h: 12 },
  '9:16': { w: 9, h: 14 },
  '16:9': { w: 14, h: 9 },
  '3:4': { w: 10, h: 14 },
  '4:3': { w: 14, h: 10 },
  '3:2': { w: 14, h: 9 },
  '2:3': { w: 9, h: 14 },
  '4:5': { w: 11, h: 14 },
  '5:4': { w: 14, h: 11 },
  '21:9': { w: 16, h: 7 },
};

export function getRatioIconSize(ratio: string): { w: number; h: number } {
  return RATIO_ICONS[ratio] ?? { w: 12, h: 12 };
}
