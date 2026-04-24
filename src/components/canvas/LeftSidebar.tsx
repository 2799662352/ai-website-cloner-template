"use client";

import { useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNodeType } from "@/types/canvas";
import {
  IconPlus,
  IconToolbox,
  IconAssets,
  IconHistory,
  IconHelp,
  IconSupport,
} from "./icons";
import { AssetPickerModal } from "./AssetPickerModal";
import { HistoryDrawer } from "./HistoryDrawer";
import { pickImageFiles, spawnImageNodeFromUrl } from "@/lib/spawn-image-from-url";
import { toast } from "@/components/ui/Toast";

const NODE_TEMPLATES: { label: string; desc: string; type: CanvasNodeType; icon: string }[] = [
  { label: "文本", desc: "剧本、广告词、品牌文案", type: "text", icon: "T" },
  { label: "图片", desc: "海报、分镜、角色设计", type: "image", icon: "🖼" },
  { label: "视频", desc: "创意广告、动画、电影", type: "video", icon: "▶" },
  { label: "视频合成 Beta", desc: "多个视频片段合为一个", type: "video-clip", icon: "✂" },
  { label: "音频", desc: "音效、配音、音乐", type: "audio", icon: "♪" },
  { label: "脚本 Beta", desc: "创意脚本、生成故事板", type: "script", icon: "📄" },
];

type Panel = "add" | "history" | null;

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const addNodeOfType = useCanvasStore((s) => s.addNodeOfType);

  const handleAddNode = useCallback(
    (type: CanvasNodeType) => {
      addNodeOfType(type);
      setActivePanel(null);
    },
    [addNodeOfType],
  );

  const handleUpload = useCallback(async () => {
    const picked = await pickImageFiles(true);
    if (!picked || picked.length === 0) return;
    let dx = 0;
    for (const file of picked) {
      try {
        await spawnImageNodeFromUrl(file.url, {
          name: file.name || "上传图片",
          position: { x: 280 + dx, y: 240 + dx },
        });
        dx += 32;
      } catch {
        toast(`添加失败：${file.name}`, "error");
      }
    }
    toast(`已添加 ${picked.length} 张图片`, "success");
    setActivePanel(null);
  }, []);

  const handlePickFromGallery = useCallback(() => {
    setShowAssetPicker(true);
    setActivePanel(null);
  }, []);

  const sidebarItems = [
    { icon: IconPlus, label: "添加节点", group: "main", panel: "add" as const },
    { icon: IconToolbox, label: "打开工具箱", group: "main", panel: null },
    { icon: IconAssets, label: "我的素材", group: "main", panel: null },
    { icon: IconHistory, label: "历史记录", group: "main", panel: "history" as const },
    { icon: IconHelp, label: "教程", group: "secondary", panel: null },
    { icon: IconSupport, label: "联系客服", group: "secondary", panel: null },
  ];

  return (
    <>
      <div
        data-sidebar-container
        className="absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl bg-[var(--surface-panel-bg)] p-1.5 shadow-lg shadow-black/30"
      >
        {sidebarItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activePanel === item.panel && item.panel !== null;
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
                  if (item.panel === "add") {
                    setActivePanel((p) => (p === "add" ? null : "add"));
                  } else if (item.panel === "history") {
                    setActivePanel((p) => (p === "history" ? null : "history"));
                  } else {
                    toast(`功能开发中：${item.label}`, "info");
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
      {activePanel === "add" && (
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

          <div className="my-2 h-px bg-white/10" />

          <button
            onClick={handleUpload}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-default transition-colors hover:bg-[var(--canvas-controls-hover)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5">
              <UploadIcon />
            </span>
            <div className="min-w-0">
              <div className="text-sm text-fg-default">上传</div>
              <div className="truncate text-xs text-fg-muted/60">本地图片文件</div>
            </div>
          </button>
          <button
            onClick={handlePickFromGallery}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-default transition-colors hover:bg-[var(--canvas-controls-hover)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5">
              <GalleryIcon />
            </span>
            <div className="min-w-0">
              <div className="text-sm text-fg-default">从图库选择</div>
              <div className="truncate text-xs text-fg-muted/60">官方图库素材</div>
            </div>
          </button>
        </div>
      )}

      {activePanel === "history" && (
        <HistoryDrawer onClose={() => setActivePanel(null)} />
      )}

      {showAssetPicker && (
        <AssetPickerModal onClose={() => setShowAssetPicker(false)} />
      )}
    </>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11V3m0 0L5 6m3-3l3 3" />
      <path d="M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="6" cy="7" r="1.2" />
      <path d="M14 11l-3-3-5 5" />
    </svg>
  );
}
