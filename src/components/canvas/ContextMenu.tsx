"use client";

import { useEffect, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { AnyNodeData, CanvasNode } from "@/types/canvas";

const CLIPBOARD_KEY = "__canvas_node_clipboard__";

function readClipboardNode(): CanvasNode | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CanvasNode;
  } catch {
    return null;
  }
}

function writeClipboardNode(node: CanvasNode) {
  sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(node));
  window.dispatchEvent(new Event("canvas-clipboard-changed"));
}

function makeNodeData(type: string): AnyNodeData {
  switch (type) {
    case "image":
      return {
        type: "image",
        action: "image_resource",
        name: `图片节点`,
        url: [],
        contentWidth: 350,
        contentHeight: 350,
      };
    case "video":
      return {
        type: "video",
        action: "video_generate",
        name: `视频节点`,
        url: [],
        contentWidth: 629,
        contentHeight: 350,
        params: {
          prompt: "",
          model: "star-video2",
          modeType: "text2video",
          count: 1,
          settings: { ratio: "16:9", duration: 5, quality: "low" },
        },
      };
    case "text":
      return {
        type: "text",
        action: "text_generate",
        name: `文本`,
        content: [],
        params: { prompt: "", model: "aurora-3-prime" },
      };
    case "audio":
      return {
        type: "audio",
        action: "audio_resource",
        name: `音频节点`,
        url: [],
        params: { prompt: "", model: "eleven-v3" },
      };
    case "script":
      return {
        type: "script",
        action: "script_generate",
        name: `脚本`,
        rows: [],
        viewMode: "table",
        params: { prompt: "", model: "gvlm-3-1" },
      };
    default:
      return {
        type: "text",
        action: "text_generate",
        name: `节点`,
        content: [],
      };
  }
}

export type MenuBaseProps = {
  x: number;
  y: number;
  onClose: () => void;
};

/** Right-click on a node — `nodeId` is required. */
export type NodeContextMenuProps = MenuBaseProps & { nodeId: string };

/** Right-click on empty canvas — optional `flowX` / `flowY` for paste and “添加节点” placement (flow coordinates). */
export type CanvasContextMenuProps = MenuBaseProps & {
  nodeId?: string;
  flowX?: number;
  flowY?: number;
};

function Separator() {
  return <div className="my-1 h-px bg-[var(--canvas-node-border)]/60" />;
}

function useCanPasteFromSession() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("canvas-clipboard-changed", onChange);
    return () => window.removeEventListener("canvas-clipboard-changed", onChange);
  }, []);
  void tick;
  return typeof sessionStorage !== "undefined" && !!readClipboardNode();
}

function MenuItem({
  label,
  shortcut,
  disabled,
  onClick,
  destructive,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-left text-sm text-fg-default hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive ? "text-red-400 hover:bg-red-500/10" : ""
      }`}
    >
      <span>{label}</span>
      {shortcut ? (
        <span className="ml-4 text-xs text-fg-muted">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function NodeContextMenu({
  x,
  y,
  onClose,
  nodeId,
}: NodeContextMenuProps) {
  const nodes = useCanvasStore((s) => s.nodes);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const addNode = useCanvasStore((s) => s.addNode);
  const ungroupNodes = useCanvasStore((s) => s.ungroupNodes);
  const canPaste = useCanPasteFromSession();

  const node = nodes.find((n) => n.id === nodeId);
  const isGroup = node?.type === "group";

  const handleCopy = async () => {
    if (!node) return;
    const payload = node as CanvasNode;
    writeClipboardNode(payload);
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    onClose();
  };

  const handlePaste = () => {
    const clip = readClipboardNode();
    if (!clip) return;
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const base = node?.position ?? { x: 0, y: 0 };
    const pasted: CanvasNode = {
      ...clip,
      id,
      position: { x: base.x + 80, y: base.y + 80 },
      selected: false,
      data: structuredClone(clip.data),
    };
    addNode(pasted);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateNode(nodeId);
    onClose();
  };

  const handleDelete = () => {
    deleteNode(nodeId);
    onClose();
  };

  const handleCopyToClipboard = async () => {
    if (!node) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(node));
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      role="menu"
      className="fixed z-[100] min-w-[200px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MenuItem label="复制" shortcut="⌘C" onClick={handleCopy} />
      <MenuItem
        label="粘贴"
        shortcut="⌘V"
        disabled={!canPaste}
        onClick={handlePaste}
      />
      <Separator />
      <MenuItem label="创建副本" onClick={handleDuplicate} />
      {isGroup && (
        <>
          <Separator />
          <MenuItem
            label="解除分组"
            onClick={() => {
              ungroupNodes(nodeId);
              onClose();
            }}
          />
        </>
      )}
      <Separator />
      <MenuItem label="删除" shortcut="⌘⌫" destructive onClick={handleDelete} />
      <Separator />
      <MenuItem label="复制到剪贴板" onClick={handleCopyToClipboard} />
    </div>
  );
}

/** Right-click when multiple nodes are selected */
export type MultiSelectContextMenuProps = MenuBaseProps & {
  nodeIds: string[];
};

export function MultiSelectContextMenu({
  x,
  y,
  onClose,
  nodeIds,
}: MultiSelectContextMenuProps) {
  const groupNodes = useCanvasStore((s) => s.groupNodes);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const handleGroup = () => {
    groupNodes(nodeIds);
    onClose();
  };

  const handleDeleteAll = () => {
    for (const id of nodeIds) deleteNode(id);
    onClose();
  };

  return (
    <div
      role="menu"
      className="fixed z-[100] min-w-[200px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MenuItem label="打组" shortcut="⌘G" onClick={handleGroup} />
      <Separator />
      <MenuItem
        label={`删除 ${nodeIds.length} 个节点`}
        shortcut="⌘⌫"
        destructive
        onClick={handleDeleteAll}
      />
    </div>
  );
}

export function CanvasContextMenu({
  x,
  y,
  onClose,
  flowX = 0,
  flowY = 0,
}: CanvasContextMenuProps) {
  const addNode = useCanvasStore((s) => s.addNode);
  const canPaste = useCanPasteFromSession();

  const handleUpload = () => {
    onClose();
  };

  const handleAddNode = () => {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const node: CanvasNode = {
      id,
      type: "text",
      position: { x: flowX, y: flowY },
      data: makeNodeData("text"),
    };
    addNode(node);
    onClose();
  };

  const handleUndo = () => {
    onClose();
  };

  const handlePaste = () => {
    const clip = readClipboardNode();
    if (!clip) return;
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pasted: CanvasNode = {
      ...clip,
      id,
      position: { x: flowX, y: flowY },
      selected: false,
      data: structuredClone(clip.data),
    };
    addNode(pasted);
    onClose();
  };

  return (
    <div
      role="menu"
      className="fixed z-[100] min-w-[200px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MenuItem label="上传" onClick={handleUpload} />
      <MenuItem label="添加节点" onClick={handleAddNode} />
      <Separator />
      <MenuItem label="撤销" shortcut="⌘Z" onClick={handleUndo} />
      <MenuItem label="重做" shortcut="⇧⌘Z" disabled onClick={onClose} />
      <Separator />
      <MenuItem
        label="粘贴"
        shortcut="⌘V"
        disabled={!canPaste}
        onClick={handlePaste}
      />
    </div>
  );
}
