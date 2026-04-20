let _mediaUidSeq = 0;
export const genMediaUid = () => `m${Date.now().toString(36)}-${(++_mediaUidSeq).toString(36)}`;

export type VolcengineArkImageRole = 'first_frame' | 'last_frame' | 'reference_image';

export interface ImageWithRole {
  url: string;
  role: VolcengineArkImageRole;
  thumbnailUrl?: string;
  previewUrl?: string;
  _uid?: string;
}

export type VolcengineArkVideoRole = 'reference_video';
export type VolcengineArkAudioRole = 'reference_audio';

export interface VideoWithRole {
  url: string;
  role: VolcengineArkVideoRole;
  duration?: number;
  thumbnail?: string;
  displayUrl?: string;
  _uid?: string;
}

export interface AudioWithRole {
  url: string;
  role: VolcengineArkAudioRole;
  duration?: number;
  _uid?: string;
}

export type UnifiedMedia = {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  displayUrl: string;
  role: string;
  typedArrayIndex: number;
  thumbnail?: string;
  duration?: number;
  label?: string;
};

export type VolcengineArkVideoMode =
  | 'text2video'
  | 'first_frame'
  | 'first_last_frame'
  | 'reference_images'
  | 'multimodal_ref'
  | 'edit_video'
  | 'extend_video';

export const VOLCENGINE_ARK_MODELS = [
  { value: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0 🔥', description: '最新旗舰，多模态参考+有声视频，4-15秒', maxDuration: 15, minDuration: 4, version: '2.0' as const },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast ⚡', description: '快速版，多模态参考+有声视频，4-15秒', maxDuration: 15, minDuration: 4, version: '2.0' as const },
  { value: 'doubao-seedance-1-5-pro-251215', label: 'Seedance 1.5 Pro ⭐', description: '稳定版，支持5-12秒时长', maxDuration: 12, minDuration: 5, version: '1.x' as const },
  { value: 'doubao-seedance-1-0-pro-250528', label: 'Seedance 1.0 Pro', description: '固定5秒', maxDuration: 5, minDuration: 2, version: '1.x' as const },
  { value: 'doubao-seedance-1-0-pro-fast-250528', label: 'Seedance 1.0 Pro Fast', description: '快速版，固定5秒', maxDuration: 5, minDuration: 2, version: '1.x' as const },
  { value: 'doubao-seedance-1-0-lite-t2v', label: 'Seedance Lite (文生视频)', description: '轻量级，固定5秒', maxDuration: 5, minDuration: 2, version: '1.x' as const },
  { value: 'doubao-seedance-1-0-lite-i2v', label: 'Seedance Lite (图生视频)', description: '轻量级，固定5秒', maxDuration: 5, minDuration: 2, version: '1.x' as const },
] as const;

export const VOLCENGINE_ARK_RATIOS = [
  { value: '16:9', label: '16:9 横屏' },
  { value: '9:16', label: '9:16 竖屏' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9 超宽' },
  { value: 'adaptive', label: '自适应（推荐）' },
] as const;

export const VOLCENGINE_ARK_VIDEO_MODES = [
  {
    value: 'text2video' as const,
    label: '✍️ 文生视频',
    description: '根据文本提示词生成视频',
    supportedModels: ['all'] as readonly string[],
  },
  {
    value: 'first_frame' as const,
    label: '🖼️ 首帧图生视频',
    description: '根据首帧图片+提示词生成视频',
    supportedModels: ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128', 'doubao-seedance-1-5-pro-251215', 'doubao-seedance-1-0-pro-250528', 'doubao-seedance-1-0-pro-fast-250528', 'doubao-seedance-1-0-lite-i2v'] as readonly string[],
  },
  {
    value: 'first_last_frame' as const,
    label: '🎬 首尾帧生视频',
    description: '根据首帧+尾帧图片+提示词生成视频',
    supportedModels: ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128', 'doubao-seedance-1-5-pro-251215', 'doubao-seedance-1-0-pro-250528', 'doubao-seedance-1-0-lite-i2v'] as readonly string[],
  },
  {
    value: 'multimodal_ref' as const,
    label: '🎯 多模态参考生视频',
    description: '图片(0~9)+视频(0~3)+音频(0~3)+提示词，生成全新视频',
    supportedModels: ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128'] as readonly string[],
  },
  {
    value: 'edit_video' as const,
    label: '✂️ 编辑视频',
    description: '通过提示词描述对参考视频进行编辑修改',
    supportedModels: ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128'] as readonly string[],
  },
  {
    value: 'extend_video' as const,
    label: '⏩ 延长视频',
    description: '将多段参考视频串联延长',
    supportedModels: ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128'] as readonly string[],
  },
] as const;

export const isSeedance2Model = (modelId: string): boolean => {
  return modelId.includes('seedance-2-0');
};

export const getArkModelConfig = (modelId: string) => {
  return VOLCENGINE_ARK_MODELS.find(m => m.value === modelId);
};
