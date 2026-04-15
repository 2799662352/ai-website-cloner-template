"use client";

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VideoNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconChevronDown, IconTranslate, IconSend } from "../icons";

const VIDEO_TABS = [
  "文生视频", "全能参考", "图生视频", "首尾帧",
  "图片参考", "标记", "运镜", "角色库",
];

const MODEL_MAP: Record<string, string> = {
  "star-video2": "Seedance 2.0 VIP",
  "kling-v3-omni": "Kling O3",
  "wanx2.7-video": "Wan 2.7",
};

function VideoNodeInner({ id, data, selected }: NodeProps & { data: VideoNodeData }) {
  const hasVideo = data.url.length > 0 && data.url[0] !== "";
  const [activeTab, setActiveTab] = useState(0);
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");
  const modelName = MODEL_MAP[data.params?.model ?? ""] ?? data.params?.model ?? "模型";
  const dur = data.params?.settings.duration ?? 5;
  const ratio = data.params?.settings.ratio ?? "16:9";
  const w = hasVideo ? Math.min(data.contentWidth, 629) : 350;
  const h = hasVideo ? 220 : 350;

  const controlPanel = selected ? (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-col gap-2 p-2">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1">
          {VIDEO_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                i === activeTab
                  ? "bg-white/10 text-fg-default"
                  : "text-fg-muted hover:text-fg-default"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div className="relative min-h-10 flex-1 overflow-hidden rounded-xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的画面内容，@引用素材"
            className="h-full w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2 text-xs text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
            rows={1}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex w-full items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Sel value={modelName} />
            <Sel value={`${ratio} · 720P · ${dur}s`} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button className="flex h-7 w-7 items-center justify-center text-fg-muted hover:text-fg-default"><IconTranslate /></button>
            <Sel value="1个" small />
            <span className="flex items-center gap-0.5 px-1 text-[10px] tabular-nums text-fg-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" /></svg>
              108
            </span>
            <button className="flex h-6 w-6 items-center justify-center rounded-full bg-fg-default text-canvas-bg hover:opacity-90">
              <IconSend className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      icon={<VideoIcon />}
      selected={selected}
      width={w}
      height={h}
      floatingPanel={controlPanel}
    >
      {/* Video preview — always visible, fills the card */}
      {hasVideo ? (
        <div className="h-full w-full">
          <video
            src={data.url[0]}
            poster={data.poster || undefined}
            className="h-full w-full object-cover"
            controls={false}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <VideoIcon className="h-16 w-16 text-fg-muted opacity-20" />
        </div>
      )}
    </NodeShell>
  );
}

export const VideoNodeComponent = memo(VideoNodeInner);

function Sel({ value, small }: { value: string; small?: boolean }) {
  return (
    <button className={`flex items-center gap-0.5 rounded-md text-fg-default hover:bg-white/5 ${small ? "px-1 text-[10px]" : "px-1.5 py-0.5 text-[11px]"}`}>
      <span className="truncate">{value}</span>
      <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
    </button>
  );
}

function VideoIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
