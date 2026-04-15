"use client";

import { memo, useState, useCallback, useRef, type ReactNode, lazy, Suspense } from "react";
import { generateCameraAngleEdit, buildCameraPrompt } from "@/lib/camera-angle-api";

const ThreeGlobe = lazy(() => import("./ThreeGlobe").then((m) => ({ default: m.ThreeGlobe })));

/* ═══════════════════════════════════════════════════════
   Preset definitions
   ═══════════════════════════════════════════════════════ */

interface Preset {
  label: string;
  horizontal: number;
  vertical: number;
  zoom: number;
}

const PRESETS: Preset[] = [
  { label: "自定义", horizontal: 0, vertical: 0, zoom: 5 },
  { label: "鱼眼视角", horizontal: 0, vertical: 60, zoom: 0 },
  { label: "倾斜视角", horizontal: 45, vertical: 30, zoom: 5 },
  { label: "正面俯拍", horizontal: 0, vertical: 60, zoom: 5 },
  { label: "正面仰拍", horizontal: 0, vertical: -30, zoom: 5 },
  { label: "全景俯拍", horizontal: 0, vertical: 60, zoom: 10 },
  { label: "背面视角", horizontal: 180, vertical: 0, zoom: 5 },
];

const ZOOM_LABELS: Record<number, string> = {
  0: "特写",
  5: "中景",
  10: "远景",
};

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

interface MultiAngleEditorProps {
  onClose: () => void;
  onApply?: (data: { horizontal: number; vertical: number; zoom: number; promptEnabled: boolean; resultImageUrl?: string }) => void;
  imageUrl?: string;
}

function MultiAngleEditorInner({ onClose, onApply, imageUrl }: MultiAngleEditorProps) {
  const [activePreset, setActivePreset] = useState(0);
  const [horizontal, setHorizontal] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [zoom, setZoom] = useState(5);
  const [promptEnabled, setPromptEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cameraPromptText = buildCameraPrompt(horizontal, vertical, zoom);

  const applyPreset = useCallback((i: number) => {
    setActivePreset(i);
    const p = PRESETS[i];
    setHorizontal(p.horizontal);
    setVertical(p.vertical);
    setZoom(p.zoom);
  }, []);

  const setCustom = useCallback(() => setActivePreset(0), []);

  const resetParams = useCallback(() => {
    setActivePreset(0);
    setHorizontal(0);
    setVertical(0);
    setZoom(5);
    setPromptEnabled(false);
    setResultImage(null);
    setGenError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageUrl) {
      setGenError("请先选择一张图片");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setResultImage(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const result = await generateCameraAngleEdit(imageUrl, horizontal, vertical, zoom, ac.signal);
      if (result.success && result.imageDataUrl) {
        setResultImage(result.imageDataUrl);
      } else {
        setGenError(result.error || "生成失败");
      }
    } catch {
      if (!ac.signal.aborted) setGenError("请求异常");
    } finally {
      setGenerating(false);
    }
  }, [imageUrl, horizontal, vertical, zoom]);

  const handleApply = useCallback(() => {
    onApply?.({ horizontal, vertical, zoom, promptEnabled, resultImageUrl: resultImage ?? undefined });
  }, [onApply, horizontal, vertical, zoom, promptEnabled, resultImage]);

  const zoomLabel = ZOOM_LABELS[zoom] ?? `${zoom}`;

  const horizontalDeg = horizontal;
  const verticalDeg = vertical;

  return (
    <div
      className="nodrag nopan flex flex-col"
      style={{
        width: 600,
        backgroundColor: "rgb(38, 38, 38)",
        borderRadius: 12,
        padding: "12px 8px 8px",
        gap: 8,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <header className="flex items-center px-2" style={{ height: 24, gap: 16 }}>
        <h1 className="flex-1 text-[14px] font-medium text-[rgb(247,247,247)]">
          多角度编辑器
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[rgb(145,145,145)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon />
        </button>
      </header>

      {/* ── Presets row ── */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(i)}
            className="select-none whitespace-nowrap transition-colors"
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid rgb(54, 54, 54)",
              backgroundColor:
                activePreset === i ? "rgba(255, 255, 255, 0.15)" : "transparent",
              color: activePreset === i ? "rgb(247, 247, 247)" : "rgb(145, 145, 145)",
              fontSize: 13,
              lineHeight: "21px",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Body: Scene + Controls ── */}
      <div className="flex" style={{ gap: 8, height: 240 }}>
        {/* 3D Scene */}
        <div className="relative shrink-0" style={{ width: 240, height: 240 }}>
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center rounded-xl bg-[rgb(54,54,54)]"><span className="text-xs text-white/30">Loading 3D...</span></div>}>
            <ThreeGlobe horizontal={horizontalDeg} vertical={verticalDeg} width={240} height={240} imageUrl={imageUrl} onRotate={(h, v) => { setHorizontal(h); setVertical(v); setCustom(); }} />
          </Suspense>
          <DirBtn pos="top" onClick={() => { setVertical((v) => Math.min(60, v + 30)); setCustom(); }}><ChevronUpIcon /></DirBtn>
          <DirBtn pos="bottom" onClick={() => { setVertical((v) => Math.max(-30, v - 30)); setCustom(); }}><ChevronDownIcon /></DirBtn>
          <DirBtn pos="left" onClick={() => { setHorizontal((h) => Math.max(0, h - 45)); setCustom(); }}><ChevronLeftIcon /></DirBtn>
          <DirBtn pos="right" onClick={() => { setHorizontal((h) => Math.min(315, h + 45)); setCustom(); }}><ChevronRightIcon /></DirBtn>
          <span className="absolute right-2 top-2 text-[10px] text-white/20">B</span>
          <span className="absolute bottom-2 right-2 text-[10px] text-white/20">R</span>
          <span className="absolute bottom-2 left-2 text-[10px] text-white/20">L</span>
          <span className="absolute left-2 top-2 text-[10px] text-white/20">T</span>
        </div>

        {/* Controls */}
        <div className="flex flex-1 flex-col justify-center" style={{ gap: 0 }}>
          <div className="flex flex-col" style={{ gap: 2 }}>
            <SliderRow
              label="水平环绕"
              min={0}
              max={315}
              step={45}
              value={horizontal}
              displayValue={`${horizontal}°`}
              onChange={(v) => { setHorizontal(v); setCustom(); }}
            />
            <SliderRow
              label="垂直俯仰"
              min={-30}
              max={60}
              step={30}
              value={vertical}
              displayValue={`${vertical}°`}
              onChange={(v) => { setVertical(v); setCustom(); }}
            />
            <SliderRow
              label="景别缩放"
              min={0}
              max={10}
              step={5}
              value={zoom}
              displayValue={zoomLabel}
              onChange={(v) => { setZoom(v); setCustom(); }}
            />
          </div>

          {/* Camera prompt preview */}
          <div className="mt-2 flex items-center gap-2 px-1">
            <span className="text-[11px] text-white/30">Prompt:</span>
            <span className="text-[11px] text-white/50">{cameraPromptText}</span>
          </div>

          {/* Prompt toggle */}
          <div className="mt-2 flex items-center gap-3 px-1">
            <label className="text-[13px] text-[rgb(145,145,145)]">提示词</label>
            <button
              type="button"
              role="switch"
              aria-checked={promptEnabled}
              onClick={() => setPromptEnabled(!promptEnabled)}
              className="relative flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors"
              style={{
                backgroundColor: promptEnabled
                  ? "rgb(59, 130, 246)"
                  : "rgb(82, 82, 82)",
              }}
            >
              <div
                className="h-[16px] w-[16px] rounded-full bg-white shadow transition-transform"
                style={{
                  transform: promptEnabled ? "translateX(18px)" : "translateX(2px)",
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Result preview ── */}
      {(resultImage || generating || genError) && (
        <div className="flex items-center gap-3 px-1">
          {generating && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              <span className="text-[12px] text-white/50">生成中...</span>
            </div>
          )}
          {genError && (
            <span className="text-[12px] text-red-400">{genError}</span>
          )}
          {resultImage && (
            <div className="flex items-center gap-2">
              <img
                src={resultImage}
                alt="生成结果"
                className="h-16 w-16 rounded-lg border border-white/10 object-cover"
              />
              <span className="text-[11px] text-green-400">生成成功</span>
            </div>
          )}
        </div>
      )}

      {/* ── Footer (matches LibTV: 重置参数 | ⚡1 | ↑ apply) ── */}
      <footer className="flex items-center" style={{ gap: 12, minHeight: 36 }}>
        <button
          type="button"
          onClick={resetParams}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-[rgb(145,145,145)] transition-colors hover:bg-white/5 hover:text-white"
        >
          <ResetIcon />
          <span>重置参数</span>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Cost indicator */}
          <span className="flex items-center gap-0.5 text-[13px] text-[rgb(145,145,145)]">
            <LightningIcon />
            <span>1</span>
          </span>
          {/* Submit button → spawn output node via onApply */}
          <button
            type="button"
            onClick={handleApply}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm transition-[filter,opacity] hover:brightness-110 active:brightness-95"
            style={{ backgroundColor: "white" }}
            title="生成多角度"
          >
            <ArrowUpIcon />
          </button>
        </div>
      </footer>
    </div>
  );
}

export const MultiAngleEditor = memo(MultiAngleEditorInner);

function DirBtn({
  pos,
  onClick,
  children,
}: {
  pos: "top" | "bottom" | "left" | "right";
  onClick: () => void;
  children: ReactNode;
}) {
  const posStyle: React.CSSProperties =
    pos === "top"
      ? { top: 4, left: "50%", transform: "translateX(-50%)" }
      : pos === "bottom"
        ? { bottom: 4, left: "50%", transform: "translateX(-50%)" }
        : pos === "left"
          ? { left: 4, top: "50%", transform: "translateY(-50%)" }
          : { right: 4, top: "50%", transform: "translateY(-50%)" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
      style={posStyle}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Slider Row
   ═══════════════════════════════════════════════════════ */

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3 px-1 py-1.5">
      <span className="w-[56px] shrink-0 text-right text-[13px] text-[rgb(145,145,145)]">
        {label}
      </span>
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="angle-slider w-full cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, rgb(145,145,145) 0%, rgb(145,145,145) ${pct}%, rgb(82,82,82) ${pct}%, rgb(82,82,82) 100%)`,
            height: 4,
            borderRadius: 2,
          }}
        />
      </div>
      <span className="w-[40px] shrink-0 text-right text-[13px] tabular-nums text-[rgb(247,247,247)]">
        {displayValue}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════════ */

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2v5h5M14 14V9H9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.49 6.01A6 6 0 0 0 3.04 4.53L2 7M2.51 9.99a6 6 0 0 0 10.45 1.48L14 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 12l2-2 6 6L20 6l2 2-12 12z" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function GenerateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 16 24" fill="currentColor" className="shrink-0 text-[rgb(145,145,145)]">
      <path d="M8.67352 4.08105C9.60755 3.00116 10.3727 3.29255 10.3727 4.73242V10.9033H12.9733C14.1511 10.9034 14.4794 11.6402 13.697 12.54L7.32684 19.9199C6.39312 20.9992 5.6269 20.7076 5.62665 19.2686V13.0977H3.02704C1.84902 13.0977 1.52094 12.3598 2.30341 11.46L8.67352 4.08105Z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" className="text-[rgb(30,30,30)]">
      <path d="M8.29289 0.292893C8.68342 -0.0976311 9.31658 -0.0976311 9.70711 0.292893L17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711C17.3166 10.0976 16.6834 10.0976 16.2929 9.70711L10 3.41421V17C10 17.5523 9.55229 18 9 18C8.44772 18 8 17.5523 8 17V3.41421L1.70711 9.70711C1.31658 10.0976 0.683418 10.0976 0.292893 9.70711C-0.0976311 9.31658 -0.0976311 8.68342 0.292893 8.29289L8.29289 0.292893Z" />
    </svg>
  );
}
