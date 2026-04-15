"use client";

import { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { AnyNodeData, CanvasNode } from "@/types/canvas";
import {
  IconPlus,
  IconToolbox,
  IconAssets,
  IconHistory,
  IconHelp,
  IconSupport,
} from "./icons";

const NODE_TEMPLATES = [
  { label: "文本", desc: "剧本、广告词、品牌文案", type: "text" as const, icon: "T" },
  { label: "图片", desc: "海报、分镜、角色设计", type: "image" as const, icon: "🖼" },
  { label: "视频", desc: "创意广告、动画、电影", type: "video" as const, icon: "▶" },
  { label: "视频合成 Beta", desc: "多个视频片段合为一个", type: "video-clip" as const, icon: "✂" },
  { label: "音频", desc: "音效、配音、音乐", type: "audio" as const, icon: "♪" },
  { label: "脚本 Beta", desc: "创意脚本、生成故事板", type: "script" as const, icon: "📄" },
];

function makeNodeData(type: string): AnyNodeData {
  switch (type) {
    case "image":
      return { type: "image", action: "image_resource", name: "图片节点", url: [], contentWidth: 350, contentHeight: 350 };
    case "video":
      return { type: "video", action: "video_generate", name: "视频节点", url: [], contentWidth: 629, contentHeight: 350, params: { prompt: "", model: "star-video2", modeType: "text2video", count: 1, settings: { ratio: "16:9", duration: 5, quality: "low" } } };
    case "text":
      return { type: "text", action: "text_generate", name: "文本", content: [], params: { prompt: "", model: "aurora-3-prime" } };
    case "audio":
      return { type: "audio", action: "audio_resource", name: "音频节点", url: [], params: { prompt: "", model: "eleven-v3" } };
    case "script":
      return { type: "script", action: "script_generate", name: "脚本", rows: [], viewMode: "table", params: { prompt: "", model: "gvlm-3-1" } };
    case "video-clip":
      return { type: "video-clip", action: "video_clip_resource", name: "视频合成", url: [] };
    default:
      return { type: "text", action: "text_generate", name: "节点", content: [] };
  }
}

export function LeftSidebar() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const addNode = useCanvasStore((s) => s.addNode);

  const handleAddNode = useCallback(
    (type: string) => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const node: CanvasNode = {
        id,
        type: type as CanvasNode["type"],
        position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 400 },
        data: makeNodeData(type),
      };
      addNode(node);
      setShowAddPanel(false);
    },
    [addNode]
  );

  const sidebarItems = [
    { icon: IconPlus, label: "添加节点", group: "main" },
    { icon: IconToolbox, label: "打开工具箱", group: "main" },
    { icon: IconAssets, label: "我的素材", group: "main" },
    { icon: IconHistory, label: "历史记录", group: "main" },
    { icon: IconHelp, label: "教程", group: "secondary" },
    { icon: IconSupport, label: "联系客服", group: "secondary" },
  ] as const;

  return (
    <>
      <div
        data-sidebar-container
        className="absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl bg-[var(--surface-panel-bg)] p-1.5 shadow-lg shadow-black/30"
      >
        {sidebarItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeIdx === idx || (idx === 0 && showAddPanel);
          const showGap =
            idx > 0 && sidebarItems[idx].group !== sidebarItems[idx - 1].group;
          return (
            <div key={item.label}>
              {showGap && (
                <div className="my-1.5 h-px w-6 self-center bg-white/10" />
              )}
              <button
                title={item.label}
                onClick={() => {
                  if (idx === 0) {
                    setShowAddPanel(!showAddPanel);
                  } else {
                    setActiveIdx(isActive ? null : idx);
                  }
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-fg-muted hover:bg-[var(--canvas-controls-hover)] hover:text-fg-default"
                }`}
              >
                <Icon />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Node Panel */}
      {showAddPanel && (
        <div className="absolute left-16 top-1/2 z-30 -translate-y-1/2 rounded-xl bg-[var(--surface-panel-bg)] p-3 shadow-xl shadow-black/40">
          <div className="mb-2 text-xs font-medium text-fg-muted">添加上下文</div>
          <div className="flex flex-col gap-0.5">
            {NODE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.type}
                onClick={() => handleAddNode(tpl.type)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-default transition-colors hover:bg-[var(--canvas-controls-hover)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs">
                  {tpl.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-fg-default">{tpl.label}</div>
                  <div className="truncate text-xs text-fg-muted/60">{tpl.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
