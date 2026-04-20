import type { Node, Edge } from "@xyflow/react";

export type NodeAction =
  | "image_resource"
  | "image_generate"
  | "video_generate"
  | "video_resource"
  | "text_generate"
  | "audio_resource"
  | "audio_generate"
  | "script_generate"
  | "video_clip_resource"
  | "video_story_resource";

export type CanvasNodeType =
  | "image"
  | "video"
  | "text"
  | "audio"
  | "script"
  | "video-clip"
  | "video-story"
  | "temp";

export interface TaskInfo {
  taskId: string;
  loading: boolean;
  status: 0 | 1 | 2 | 3;
  progressPercent: number;
}

export interface InputRef {
  nodeId: string;
  url: string;
}

export interface ImageNodeData {
  [key: string]: unknown;
  type: "image";
  action: "image_resource" | "image_generate";
  name: string;
  url: string[];
  alt?: string;
  contentWidth: number;
  contentHeight: number;
  generatorType?: "default" | "enhance";
  isStale?: boolean;
  rotationMode?: boolean;
  params?: {
    prompt: string;
    model: string;
    scene?: string;
    count: number;
    modeType?: "image2image" | "text2image";
    settings: { quality: string; ratio: string };
    advancedSettings?: { searchable?: number };
    cameraControl?: {
      enabled: boolean;
      camera: string;
      lens: string;
      focal: string;
      aperture: string;
    };
    imageList?: InputRef[];
    videoList?: unknown[];
    audioList?: unknown[];
    textList?: unknown[];
  };
  taskInfo?: TaskInfo;
}

export interface VideoNodeData {
  [key: string]: unknown;
  type: "video";
  action: "video_generate" | "video_resource";
  name: string;
  url: string[];
  poster?: string;
  contentWidth: number;
  contentHeight: number;
  generatorType?: "default";
  isStale?: boolean;
  params?: {
    prompt: string;
    model: string;
    scene?: string;
    modeType: string;
    count: number;
    settings: {
      ratio: string;
      duration: number;
      quality: string;
      enableSound?: string;
      multi_shot?: boolean;
    };
    advancedSettings?: object;
    imageList?: InputRef[];
    videoList?: unknown[];
    audioList?: unknown[];
    textList?: unknown[];
    mixedList?: { nodeId: string; url: string; mediaType: string }[];
    subjectList?: { uuid: string; name: string; coverUrl: string; klingId?: string }[];
  };
  taskInfo?: TaskInfo;
}

export interface TextNodeData {
  [key: string]: unknown;
  type: "text";
  action: "text_generate";
  name: string;
  content: unknown[];
  generatorType?: "default";
  params?: {
    prompt: string;
    model: string;
    scene?: string;
    count?: number;
    imageList?: InputRef[];
    videoList?: unknown[];
    audioList?: unknown[];
    textList?: unknown[];
  };
  taskInfo?: TaskInfo;
}

export interface AudioNodeData {
  [key: string]: unknown;
  type: "audio";
  action: "audio_resource" | "audio_generate";
  name: string;
  url: string[];
  generatorType?: "default";
  params?: {
    prompt: string;
    model: string;
    scene?: string;
    count?: number;
    settings?: object;
    advancedSettings?: { stability?: number };
    imageList?: unknown[];
    videoList?: unknown[];
    audioList?: unknown[];
    textList?: unknown[];
  };
  taskInfo?: TaskInfo;
}

export interface ScriptNodeData {
  [key: string]: unknown;
  type: "script";
  action: "script_generate";
  name: string;
  rows: StoryboardRow[];
  viewMode: "table" | "card";
  generatorType?: "default";
  params?: {
    prompt: string;
    model: string;
    scene?: string;
    count?: number;
    imageList?: unknown[];
    videoList?: unknown[];
    audioList?: unknown[];
    textList?: unknown[];
  };
  taskInfo?: TaskInfo;
}

export interface StoryboardRow {
  shot_number: number;
  start_time: number;
  end_time: number;
  duration: number;
  visual_description: string;
  content: string;
  shot_size: string;
  camera_angle: string;
  camera_movement: string;
  focal_depth: string;
  lighting: string;
  audio_music: string;
  audio_voice: string;
  image_generation_prompt: string;
  video_motion_prompt: string;
  frameUrl: string;
}

export interface ShotColumn {
  field: string;
  label: string;
  description: string;
}

export interface VideoClipNodeData {
  [key: string]: unknown;
  type: "video-clip";
  action: "video_clip_resource";
  name: string;
  url: string[];
  params?: object;
}

export interface VideoStoryNodeData {
  [key: string]: unknown;
  type: "video-story";
  action: "video_story_resource";
  name: string;
  sourceVideoNodeId?: string;
  nodeWidth: number;
  nodeHeight: number;
  rows: StoryboardRow[];
  shotColumns: ShotColumn[];
  sourceType?: string;
}

export type AnyNodeData =
  | ImageNodeData
  | VideoNodeData
  | TextNodeData
  | AudioNodeData
  | ScriptNodeData
  | VideoClipNodeData
  | VideoStoryNodeData;

export type CanvasNode = Node<AnyNodeData, CanvasNodeType>;
export type CanvasEdge = Edge;
