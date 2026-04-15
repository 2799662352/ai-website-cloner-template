"use client";

import { memo, useState, useCallback, type ReactNode } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import type { ImageNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import {
  IconImage,
  IconSend,
  IconTranslate,
  IconChevronDown,
} from "../icons";
import { MultiAngleEditor } from "../MultiAngleEditor";
import { LightEditor } from "../LightEditor";
import { NineGridDropdown, GridSplitDropdown } from "../ToolbarDropdowns";
import { spawnOutputNode } from "@/lib/spawn-output-node";

function ImageNodeInner({ id, data, selected }: NodeProps & { data: ImageNodeData }) {
  const hasImage = data.url.length > 0 && data.url[0] !== "";
  const isGenerate = data.action === "image_generate";
  const w = Math.min(data.contentWidth, 627);
  const h = Math.min(data.contentHeight, 350);
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");
  const [activeEditor, setActiveEditor] = useState<"angle" | "light" | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"nine" | "split" | null>(null);
  const isGenerating = data.taskInfo?.loading === true;
  const showPanel = selected && hasImage && !isGenerating;
  const { getNode } = useReactFlow();

  const toggleEditor = (editor: "angle" | "light") => {
    setActiveEditor(activeEditor === editor ? null : editor);
    setOpenDropdown(null);
  };
  const toggleDropdown = (key: "nine" | "split") => {
    setOpenDropdown(openDropdown === key ? null : key);
    setActiveEditor(null);
  };

  const handleSpawn = useCallback((kind: "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split") => {
    const node = getNode(id);
    if (!node) return;
    spawnOutputNode(id, node.position, w, kind);
    setActiveEditor(null);
  }, [id, getNode, w]);

  const resolution =
    data.contentWidth && data.contentHeight
      ? `${data.contentWidth} × ${data.contentHeight}`
      : "";

  /* ────── Context toolbar (above image, integrates node title) ────── */
  const contextToolbar = selected && hasImage ? (
    <div
      className="nodrag absolute left-1/2 z-30 -translate-x-1/2"
      style={{ top: -62 }}
    >
      <div className="flex items-center gap-0 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-1 py-0.5 shadow-lg">
        {/* Text buttons: open editors / dropdowns, generate button inside editor spawns node */}
        <TBBtn label="多角度" icon={<MultiAngleIcon />} active={activeEditor === "angle"} onClick={() => toggleEditor("angle")} />
        <TBBtn label="打光" icon={<LightIcon />} active={activeEditor === "light"} onClick={() => toggleEditor("light")} />
        <NineGridDropdown
          open={openDropdown === "nine"}
          onToggle={() => toggleDropdown("nine")}
          onSelect={() => handleSpawn("nine-grid")}
          trigger={<TBBtn label="九宫格" icon={<GridNineIcon />} hasDropdown active={openDropdown === "nine"} />}
        />
        <TBBtn label="扩图" icon={<ExpandIcon />} hasDropdown onClick={() => handleSpawn("expand")} />
        <GridSplitDropdown
          open={openDropdown === "split"}
          onToggle={() => toggleDropdown("split")}
          onSelect={() => handleSpawn("grid-split")}
          trigger={<TBBtn label="宫格切分" icon={<GridSplitIcon />} hasDropdown active={openDropdown === "split"} />}
        />

        <ToolbarSep />

        {/* Icon-only buttons: 标注, 旋转, 下载, 预览 */}
        <TBIconBtn title="标注"><AnnotateIcon /></TBIconBtn>
        <TBIconBtn title="旋转"><RotateIcon /></TBIconBtn>
        <TBIconBtn title="下载"><DownloadIcon /></TBIconBtn>
        <TBIconBtn title="预览"><PreviewIcon /></TBIconBtn>
      </div>
    </div>
  ) : undefined;

  /* ────── Editor overlays (multi-angle / lighting) ────── */
  const editorOverlay = selected && hasImage && activeEditor ? (
    <div className="p-3 pb-0">
      {activeEditor === "angle" && (
        <MultiAngleEditor
          onClose={() => setActiveEditor(null)}
          onApply={() => handleSpawn("multi-angle")}
          imageUrl={hasImage ? data.url[0] : undefined}
        />
      )}
      {activeEditor === "light" && (
        <LightEditor
          onClose={() => setActiveEditor(null)}
          onApply={() => handleSpawn("lighting")}
        />
      )}
    </div>
  ) : undefined;

  /* ────── Floating control panel (below image) ────── */
  const controlPanel = showPanel ? (
    <div className="relative flex min-h-0 w-full flex-col gap-2 p-3">
      {/* Row 1: Style/Mark/Focus + input refs + add buttons + expand */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <PanelToolBtn icon={<StyleIcon />} label="风格" />
          <PanelToolBtn icon={<MarkIcon />} label="标记" />
          <PanelToolBtn icon={<FocusIcon />} label="聚焦" />
        </div>

        {/* Input reference badges */}
        <div className="flex items-center gap-1.5 pl-1">
          {(data.params?.imageList ?? []).map((ref, i) => (
            <RefBadge key={ref.nodeId || i} index={i + 1} url={ref.url} />
          ))}
          {/* Plus buttons to add more refs */}
          <AddRefBtn />
          <AddRefBtn />
        </div>

        <div className="flex-1" />

        {/* Expand button */}
        <button
          type="button"
          className="nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-white/5 hover:text-fg-default"
          title="展开"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {/* Row 2: Prompt textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想要生成的画面内容，按/呼出指令，@引用素材"
        className="nodrag h-[72px] w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
      />

      {/* Row 3: Model / Ratio / Camera + Actions */}
      <div className="flex w-full items-center gap-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <PanelSelector icon={<GreenDot />} label={data.params?.model === "nebula-ultra" ? "Lib Nano Pro" : data.params?.model ?? "模型"} />
          <PanelSelector icon={<RatioIcon />} label={`${data.params?.settings?.ratio ?? "16:9"} · ${data.params?.settings?.quality ?? "2K"}`} />
          <PanelSelector icon={<CamCtrlIcon />} label="摄像机控制" />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <PanelIconBtn title="翻译提示词"><IconTranslate className="h-3.5 w-3.5" /></PanelIconBtn>
          <PanelIconBtn title="链接"><LinkIcon /></PanelIconBtn>
          <PanelSelector label={`${data.params?.count ?? 1}张`} compact />
          <span className="flex items-center gap-0.5 px-1 text-[11px] tabular-nums text-fg-muted">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" /></svg>
            26
          </span>
          <button
            type="button"
            className="nodrag flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600"
            title="生成"
          >
            <IconSend className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  ) : undefined;

  const floatingPanel = (editorOverlay || controlPanel) ? (
    <>
      {editorOverlay}
      {!activeEditor && controlPanel}
    </>
  ) : undefined;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      resolution={resolution}
      icon={<IconImage className="h-3.5 w-3.5" />}
      selected={selected}
      width={hasImage ? w : 350}
      height={hasImage ? h : 350}
      floatingPanel={floatingPanel}
      contextToolbar={contextToolbar}
    >
      {isGenerating ? (
        <GeneratingOverlay
          percent={data.taskInfo?.progressPercent ?? 0}
          onCancel={() => {
            import("@/lib/spawn-output-node").then(({ cancelGeneration }) =>
              cancelGeneration(id)
            );
          }}
        />
      ) : hasImage ? (
        <div className="h-full w-full">
          <img
            src={data.url[0]}
            alt={data.alt || data.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
          <button className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="mb-4">
            <IconImage className="h-16 w-16 text-fg-muted opacity-30" />
          </div>
          <div className="w-full">
            <div className="mb-2 text-sm text-fg-muted">尝试：</div>
            <div className="flex flex-col items-start gap-1">
              <SuggestButton>图生图</SuggestButton>
              <SuggestButton>图片高清</SuggestButton>
            </div>
          </div>
        </div>
      )}
    </NodeShell>
  );
}

export const ImageNodeComponent = memo(ImageNodeInner);

/* ═══════════════════════════════════════════════════════
   Context Toolbar components
   ═══════════════════════════════════════════════════════ */

function ToolbarSep() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />;
}

function TBBtn({ label, icon, active, hasDropdown, onClick }: { label: string; icon?: ReactNode; active?: boolean; hasDropdown?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 select-none items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[12px] leading-none transition-colors ${
        active
          ? "bg-blue-600/80 text-white"
          : "text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)]"
      }`}
    >
      {icon && <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-80">{icon}</span>}
      <span>{label}</span>
      {hasDropdown && <IconChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />}
    </button>
  );
}

function TBIconBtn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)]"
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Floating Panel components
   ═══════════════════════════════════════════════════════ */

function PanelToolBtn({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="nodrag flex items-center gap-1 rounded-lg border border-[var(--canvas-node-border)] px-2 py-1.5 text-fg-muted transition-colors hover:border-[var(--canvas-node-border-selected)] hover:text-fg-default"
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}

function RefBadge({ index, url }: { index: number; url?: string }) {
  const hasImg = url && url !== "";
  return (
    <div className="relative">
      <div className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border ${hasImg ? "border-[var(--canvas-node-border)]" : "border-dashed border-[var(--canvas-node-border)]"} bg-white/5`}>
        {hasImg ? (
          <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted/40">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </div>
      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-bold text-white">
        {index}
      </span>
    </div>
  );
}

function AddRefBtn() {
  return (
    <button
      type="button"
      className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[var(--canvas-node-border)] text-fg-muted/40 transition-colors hover:border-[var(--canvas-node-border-selected)] hover:text-fg-muted"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

function PanelSelector({ label, icon, compact }: { label: string; icon?: ReactNode; compact?: boolean }) {
  return (
    <button
      type="button"
      className={`nodrag flex items-center gap-0.5 rounded-lg text-fg-default transition-colors hover:bg-white/5 ${compact ? "px-1 py-0.5 text-[11px]" : "px-1.5 py-1 text-[12px]"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
    </button>
  );
}

function PanelIconBtn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="nodrag flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:text-fg-default"
    >
      {children}
    </button>
  );
}

function SuggestButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="nodrag flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-default hover:bg-[var(--canvas-controls-hover)]">
      <span>→</span>
      <span>{children}</span>
    </button>
  );
}

function GreenDot() {
  return (
    <span className="flex h-3 w-3 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   SVG icons for toolbar
   ═══════════════════════════════════════════════════════ */

function MultiAngleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM13 3h6v6h-6zM8 13h6v6H8z" />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}

function GridNineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="1" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="7.25" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="7.25" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="7.25" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="13.5" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="13.5" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function HDIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="4" width="18" height="12" rx="2" />
      <path d="M6 8v4M6 10h3M9 8v4M13 8v2a2 2 0 0 1-2 2h0" />
    </svg>
  );
}

function GridSplitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <path d="M8 1v14M1 8h14" />
    </svg>
  );
}

function AnnotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 19" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v4h4" />
      <path d="M1 8A7 7 0 0 1 13.94 5" />
      <path d="M15 12v-4h-4" />
      <path d="M15 8A7 7 0 0 1 2.06 11" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10M6 9l4 4 4-4M3 15v2h14v-2" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14 1 17 1 17 4" />
      <polyline points="4 17 1 17 1 14" />
      <polyline points="17 14 17 17 14 17" />
      <polyline points="1 4 1 1 4 1" />
    </svg>
  );
}

function StyleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813h6.088l-4.956 3.574 1.912 5.813L12 14.626l-4.956 3.574 1.912-5.813L4 8.813h6.088z" />
    </svg>
  );
}

function MarkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function RatioIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
    </svg>
  );
}

function CamCtrlIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="15" height="12" rx="2" />
      <polygon points="23 8 17 12 23 16 23 8" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="12" height="12" rx="2" strokeDasharray="3 2" />
      <rect x="1" y="1" width="18" height="18" rx="3" />
    </svg>
  );
}

function GeneratingOverlay({ percent, onCancel }: { percent: number; onCancel: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[rgb(38,38,38)]">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-white/60">
          生成中 {percent}%...
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="nodrag text-[13px] text-white/40 hover:text-white/70"
        >
          取消
        </button>
      </div>
      <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
