"use client";

import { useEffect, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode, CanvasNodeType } from "@/types/canvas";
import {
  canRedo,
  canUndo,
  redo,
  subscribeHistory,
  undo,
} from "@/lib/canvas-history";
import { pickImageFiles, spawnImageNodeFromUrl } from "@/lib/spawn-image-from-url";
import { toast } from "@/components/ui/Toast";

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

export type MenuBaseProps = {
  x: number;
  y: number;
  onClose: () => void;
};

export type NodeContextMenuProps = MenuBaseProps & { nodeId: string };

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

function useHistoryFlags() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeHistory(() => setTick((t) => t + 1));
    return () => {
      unsubscribe();
    };
  }, []);
  return { canUndo: canUndo(), canRedo: canRedo() };
}

function MenuItem({
  label,
  shortcut,
  disabled,
  onClick,
  destructive,
  hasSubmenu,
  onMouseEnter,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  hasSubmenu?: boolean;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick?.();
      }}
      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-left text-sm text-fg-default hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive ? "text-red-400 hover:bg-red-500/10" : ""
      }`}
    >
      <span>{label}</span>
      <span className="ml-4 flex items-center gap-2 text-xs text-fg-muted">
        {shortcut ? <span>{shortcut}</span> : null}
        {hasSubmenu ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 2.5L6 5l-2.5 2.5" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

function AddNodeSubmenu({
  onPick,
}: {
  onPick: (type: CanvasNodeType) => void;
}) {
  const items: { type: CanvasNodeType; label: string; icon: string }[] = [
    { type: "image", label: "图片", icon: "🖼" },
    { type: "video", label: "视频", icon: "▶" },
    { type: "video-clip", label: "视频合成", icon: "✂" },
    { type: "audio", label: "音频", icon: "♪" },
    { type: "text", label: "文本", icon: "T" },
    { type: "script", label: "脚本", icon: "📄" },
  ];
  return (
    <div
      className="absolute left-full top-0 ml-1 min-w-[160px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.type}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(it.type);
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm text-fg-default hover:bg-white/5"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/5 text-xs">
            {it.icon}
          </span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
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
  const pasteNodeFromClipboard = useCanvasStore((s) => s.pasteNodeFromClipboard);
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
    const base = node?.position;
    pasteNodeFromClipboard(
      clip,
      base ? { x: base.x + 24, y: base.y + 24 } : undefined,
    );
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
      toast("已复制节点 JSON 到剪贴板", "success");
    } catch {
      toast("复制失败", "error");
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
      <MenuItem
        label="保存到我的素材"
        onClick={() => {
          toast("功能开发中：保存到我的素材", "info");
          onClose();
        }}
      />
      <MenuItem
        label="创建主体"
        onClick={() => {
          toast("功能开发中：从节点提取角色/主体", "info");
          onClose();
        }}
      />
      <MenuItem
        label="优化工作流布局"
        onClick={() => {
          toast("功能开发中：单节点 auto-layout", "info");
          onClose();
        }}
      />
      <MenuItem
        label="创建脚本"
        onClick={() => {
          toast("功能开发中：从节点生成脚本", "info");
          onClose();
        }}
      />
      <Separator />
      <MenuItem label="复制到剪贴板" onClick={handleCopyToClipboard} />
      <Separator />
      <MenuItem label="删除" shortcut="⌘⌫" destructive onClick={handleDelete} />
    </div>
  );
}

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
  const addNodeOfType = useCanvasStore((s) => s.addNodeOfType);
  const pasteNodeFromClipboard = useCanvasStore((s) => s.pasteNodeFromClipboard);
  const canPaste = useCanPasteFromSession();
  const { canUndo: u, canRedo: r } = useHistoryFlags();
  const [submenu, setSubmenu] = useState<null | "add">(null);

  const handleUpload = async () => {
    onClose();
    const picked = await pickImageFiles(true);
    if (!picked || picked.length === 0) return;
    let dx = 0;
    for (const file of picked) {
      try {
        await spawnImageNodeFromUrl(file.url, {
          name: file.name,
          position: { x: flowX + dx, y: flowY + dx },
        });
        dx += 32;
      } catch {
        toast(`添加失败：${file.name}`, "error");
      }
    }
    toast(`已添加 ${picked.length} 张图片`, "success");
  };

  const handleAddType = (type: CanvasNodeType) => {
    addNodeOfType(type, { x: flowX, y: flowY });
    onClose();
  };

  const handleUndo = () => {
    undo();
    onClose();
  };
  const handleRedo = () => {
    redo();
    onClose();
  };

  const handlePaste = () => {
    const clip = readClipboardNode();
    if (!clip) return;
    pasteNodeFromClipboard(clip, { x: flowX, y: flowY });
    onClose();
  };

  return (
    <div
      role="menu"
      className="fixed z-[100] min-w-[220px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MenuItem label="上传" onClick={handleUpload} />
      <div className="relative">
        <MenuItem
          label="添加节点"
          hasSubmenu
          onMouseEnter={() => setSubmenu("add")}
          onClick={() => setSubmenu(submenu === "add" ? null : "add")}
        />
        {submenu === "add" && <AddNodeSubmenu onPick={handleAddType} />}
      </div>
      <Separator />
      <MenuItem label="撤销" shortcut="⌘Z" disabled={!u} onClick={handleUndo} />
      <MenuItem label="重做" shortcut="⇧⌘Z" disabled={!r} onClick={handleRedo} />
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
