"use client";

import { useEffect, useRef, useCallback } from "react";
import type { CanvasNodeType } from "@/types/canvas";
import { useCanvasStore } from "@/store/canvas-store";

interface ConnectionDropMenuProps {
  screenX: number;
  screenY: number;
  flowX: number;
  flowY: number;
  sourceNodeId: string;
  sourceHandleId: string;
  tempNodeId: string;
  onClose: () => void;
}

const MENU_ITEMS: { type: CanvasNodeType; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
  {
    type: "text",
    label: "文本",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
  },
  {
    type: "image",
    label: "图片",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
  {
    type: "video",
    label: "视频",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: "video-clip",
    label: "视频合成",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    type: "audio",
    label: "音频",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    type: "script",
    label: "脚本",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export function ConnectionDropMenu({
  screenX,
  screenY,
  flowX,
  flowY,
  sourceNodeId,
  sourceHandleId,
  tempNodeId,
  onClose,
}: ConnectionDropMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addNodeAndConnect = useCanvasStore((s) => s.addNodeAndConnect);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  const cleanupTemp = useCallback(() => {
    deleteEdge(`__drop_edge_${tempNodeId}`);
    deleteNode(tempNodeId);
  }, [deleteEdge, deleteNode, tempNodeId]);

  const handleCancel = useCallback(() => {
    cleanupTemp();
    onClose();
  }, [cleanupTemp, onClose]);

  useEffect(() => {
    const handleClick = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    const id = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", handleClick);
      document.addEventListener("keydown", handleKey);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [handleCancel]);

  const clampedX = Math.min(screenX, window.innerWidth - 200);
  const clampedY = Math.min(screenY, window.innerHeight - 320);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex flex-col rounded-xl border border-white/15 bg-[#1e1e1e] py-2 shadow-2xl"
      style={{ left: clampedX, top: clampedY, minWidth: 180 }}
    >
      <div className="px-3 pb-1.5 pt-0.5 text-[12px] font-medium text-white/50">
        引用该节点生成
      </div>
      {MENU_ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            cleanupTemp();
            addNodeAndConnect(
              item.type,
              { x: flowX, y: flowY },
              { nodeId: sourceNodeId, handleId: sourceHandleId },
            );
            onClose();
          }}
          className={`flex items-center gap-3 px-3 py-2 text-left text-[13px] transition-colors ${
            item.disabled
              ? "cursor-not-allowed text-white/25"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-white/60">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
