"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { ImageNodeData, VideoNodeData } from "@/types/canvas";

/* ------------------------------------------------------------------ */
/*  SVG icons                                                         */
/* ------------------------------------------------------------------ */

function GridLayoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function HorizontalLayoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3.5" width="4" height="9" rx="1" />
      <rect x="6" y="3.5" width="4" height="9" rx="1" />
      <rect x="11" y="3.5" width="4" height="9" rx="1" />
    </svg>
  );
}

function VerticalLayoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="1" width="9" height="4" rx="1" />
      <rect x="3.5" y="6" width="9" height="4" rx="1" />
      <rect x="3.5" y="11" width="9" height="4" rx="1" />
    </svg>
  );
}

function SaveIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h8.586L13 4.414V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8" />
      <path d="M6 14v-4h4v4" />
      <rect x="5" y="2" width="5" height="3" rx=".5" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8m0 0-3-3m3 3 3-3" />
      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

function DuplicateIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
    </svg>
  );
}

function GroupIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="14" rx="3" strokeDasharray="3 2" />
      <rect x="4" y="4" width="3.5" height="3.5" rx=".75" />
      <rect x="8.5" y="4" width="3.5" height="3.5" rx=".75" />
      <rect x="4" y="8.5" width="3.5" height="3.5" rx=".75" />
    </svg>
  );
}

function UngroupIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="14" rx="3" strokeDasharray="3 2" />
      <path d="M5 8h6M8 5v6" strokeWidth="1.6" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 3.5v9l7-4.5-7-4.5z" />
    </svg>
  );
}

function ToolboxIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" />
      <path d="M1.5 7h13" />
      <path d="M6 7v1.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared: close-on-outside-click hook                               */
/* ------------------------------------------------------------------ */

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const id = requestAnimationFrame(() => document.addEventListener("pointerdown", handler));
    return () => { cancelAnimationFrame(id); document.removeEventListener("pointerdown", handler); };
  }, [open, ref, close]);
}

/* ------------------------------------------------------------------ */
/*  Layout dropdown                                                   */
/* ------------------------------------------------------------------ */

function LayoutDropdown({ onLayout }: { onLayout: (mode: "grid" | "horizontal" | "vertical") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="mst-btn flex items-center gap-0.5">
        <GridLayoutIcon className="h-4 w-4 opacity-70" />
        <ChevronDownIcon className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div className="mst-dropdown absolute bottom-full left-0 mb-2 min-w-[140px] rounded-lg border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-1 shadow-xl">
          <button type="button" className="mst-dropdown-item" onClick={() => { onLayout("grid"); close(); }}>
            <GridLayoutIcon className="h-4 w-4 opacity-70" /><span>宫格排列</span>
          </button>
          <button type="button" className="mst-dropdown-item" onClick={() => { onLayout("horizontal"); close(); }}>
            <HorizontalLayoutIcon className="h-4 w-4 opacity-70" /><span>水平排列</span>
          </button>
          <button type="button" className="mst-dropdown-item" onClick={() => { onLayout("vertical"); close(); }}>
            <VerticalLayoutIcon className="h-4 w-4 opacity-70" /><span>垂直排列</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                    */
/* ------------------------------------------------------------------ */

function TBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="mst-btn" onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Color picker dropdown (LibTV 10-color palette)                    */
/* ------------------------------------------------------------------ */

const GROUP_COLORS = [
  null,
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#ec4899",
  "#a3a3a3",
];

function ColorPicker({ groupId, currentColor }: { groupId: string; currentColor?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const handlePick = (color: string | null) => {
    updateNodeData(groupId, { groupColor: color ?? undefined });
    close();
  };

  const display = currentColor || "rgba(255,255,255,0.12)";
  const border = currentColor || "rgba(255,255,255,0.25)";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="mst-btn flex items-center justify-center"
        style={{ padding: "6px 4px" }}
        title="分组颜色"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="block h-[18px] w-[18px] rounded-full border-2"
          style={{ borderColor: border, background: display }}
        />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-2.5 shadow-xl"
          style={{ width: 176 }}
        >
          <div className="grid grid-cols-5 gap-2">
            {GROUP_COLORS.map((c, i) => (
              <button
                key={i}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{
                  background: c ?? "transparent",
                  border: c ? "none" : "2px solid rgba(255,255,255,0.25)",
                  outline: (c ?? undefined) === currentColor || (!c && !currentColor) ? "2px solid #3b82f6" : "none",
                  outlineOffset: 2,
                }}
                onClick={() => handlePick(c)}
                title={c ?? "无颜色"}
              >
                {!c && (
                  <svg width="14" height="14" viewBox="0 0 14 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="2" x2="12" y2="12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ungroup confirmation dialog                                       */
/* ------------------------------------------------------------------ */

function UngroupDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className="relative z-10 w-[380px] rounded-2xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-6 shadow-2xl"
      >
        <h3 className="mb-2 text-base font-semibold text-fg-default">解组</h3>
        <p className="mb-6 text-sm leading-relaxed text-fg-muted">
          确定要解散当前分组吗？解组后节点将恢复为独立状态。
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-fg-default transition-colors hover:bg-white/8"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            确定解组
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch download helper                                             */
/* ------------------------------------------------------------------ */

async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function batchDownloadNodes(nodeIds: string[]) {
  const { nodes } = useCanvasStore.getState();
  const targets = nodes.filter((n) => nodeIds.includes(n.id) || (n.parentId && nodeIds.includes(n.parentId)));

  const items: { url: string; name: string }[] = [];
  for (const n of targets) {
    const d = n.data;
    if (d.type === "image") {
      const img = d as ImageNodeData;
      if (img.url?.length) {
        items.push({ url: img.url[0], name: `${img.name || "image"}.png` });
      }
    } else if (d.type === "video") {
      const vid = d as VideoNodeData;
      if (vid.url?.length) {
        items.push({ url: vid.url[0], name: `${vid.name || "video"}.mp4` });
      }
    }
  }

  if (items.length === 0) return;

  for (const { url, name } of items) {
    forceDownload(url, name);
  }
}

/* ------------------------------------------------------------------ */
/*  Shared positioning hook                                           */
/* ------------------------------------------------------------------ */

function useToolbarPosition(
  targetIds: string[],
  show: boolean,
  toolbarRef: React.RefObject<HTMLDivElement | null>,
) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const getSelectionBounds = useCallback(() => {
    const selectedEls = targetIds
      .map((id) => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`))
      .filter(Boolean) as HTMLElement[];
    if (selectedEls.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedEls) {
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.right);
      maxY = Math.max(maxY, r.bottom);
    }
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2 };
  }, [targetIds]);

  useEffect(() => {
    if (!show) { setPos(null); return; }
    const update = () => {
      const bounds = getSelectionBounds();
      if (!bounds) return;
      const tbW = toolbarRef.current?.offsetWidth ?? 400;
      setPos({
        left: Math.max(8, bounds.cx - tbW / 2),
        top: Math.max(8, bounds.minY - 56),
      });
    };
    update();
    const id = setInterval(update, 120);
    return () => clearInterval(id);
  }, [show, getSelectionBounds, targetIds, toolbarRef]);

  return pos;
}

/* ------------------------------------------------------------------ */
/*  Multi-select toolbar (2+ non-group nodes selected)                */
/* ------------------------------------------------------------------ */

function MultiSelectBar({ selectedNodeIds }: { selectedNodeIds: string[] }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const groupNodesFn = useCanvasStore((s) => s.groupNodes);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const arrangeNodes = useCanvasStore((s) => s.arrangeNodes);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const pos = useToolbarPosition(selectedNodeIds, true, toolbarRef);

  if (!pos) return null;

  const selectedNonGroup = selectedNodeIds.filter((id) => {
    const n = nodes.find((nd) => nd.id === id);
    return n && n.type !== "group";
  });

  return (
    <div
      ref={toolbarRef}
      className="multi-select-toolbar"
      style={{ left: pos.left, top: pos.top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <LayoutDropdown onLayout={(mode) => arrangeNodes(selectedNonGroup, mode)} />
      <div className="mst-divider" />
      <TBtn icon={<SaveIcon className="h-4 w-4 opacity-70" />} label="保存到素材" onClick={() => {}} />
      <TBtn icon={<DownloadIcon className="h-4 w-4 opacity-70" />} label="批量下载" onClick={() => batchDownloadNodes(selectedNonGroup)} />
      <TBtn icon={<DuplicateIcon className="h-4 w-4 opacity-70" />} label="创建副本" onClick={() => {
        for (const id of selectedNonGroup) duplicateNode(id);
      }} />
      <TBtn icon={<GroupIcon className="h-4 w-4 opacity-70" />} label="打组" onClick={() => groupNodesFn(selectedNonGroup)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group toolbar (single group node selected)                        */
/* ------------------------------------------------------------------ */

function GroupBar({ groupId }: { groupId: string }) {
  const ungroupNodes = useCanvasStore((s) => s.ungroupNodes);
  const nodes = useCanvasStore((s) => s.nodes);
  const [showUngroupDialog, setShowUngroupDialog] = useState(false);

  const groupNode = nodes.find((n) => n.id === groupId);
  const groupColor = (groupNode?.data as { groupColor?: string })?.groupColor;
  const childIds = nodes.filter((n) => n.parentId === groupId).map((n) => n.id);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const pos = useToolbarPosition([groupId], true, toolbarRef);

  if (!pos) return null;

  return (
    <>
      <div
        ref={toolbarRef}
        className="multi-select-toolbar"
        style={{ left: pos.left, top: pos.top }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ColorPicker groupId={groupId} currentColor={groupColor} />
        <LayoutDropdown onLayout={() => {}} />
        <div className="mst-divider" />
        <TBtn icon={<PlayIcon className="h-4 w-4 opacity-70" />} label="整组执行" onClick={() => {}} />
        <TBtn icon={<ToolboxIcon className="h-4 w-4 opacity-70" />} label="添加到工具箱" onClick={() => {}} />
        <TBtn icon={<UngroupIcon className="h-4 w-4 opacity-70" />} label="解组" onClick={() => setShowUngroupDialog(true)} />
        <TBtn icon={<DownloadIcon className="h-4 w-4 opacity-70" />} label="批量下载" onClick={() => batchDownloadNodes(childIds)} />
      </div>
      {showUngroupDialog && (
        <UngroupDialog
          onConfirm={() => { setShowUngroupDialog(false); ungroupNodes(groupId); }}
          onCancel={() => setShowUngroupDialog(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                       */
/* ------------------------------------------------------------------ */

export function MultiSelectToolbar() {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);

  if (selectedNodeIds.length === 1) {
    const node = nodes.find((n) => n.id === selectedNodeIds[0]);
    if (node?.type === "group") {
      return <GroupBar groupId={node.id} />;
    }
    return null;
  }

  if (selectedNodeIds.length >= 2) {
    return <MultiSelectBar selectedNodeIds={selectedNodeIds} />;
  }

  return null;
}
