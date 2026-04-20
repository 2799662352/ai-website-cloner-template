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
  { label: "自定义", horizontal: 0, vertical: 0, zoom: 1.0 },
  { label: "鱼眼视角", horizontal: 0, vertical: 60, zoom: 0.6 },
  { label: "倾斜视角", horizontal: 45, vertical: 30, zoom: 1.0 },
  { label: "正面俯拍", horizontal: 0, vertical: 60, zoom: 1.0 },
  { label: "正面仰拍", horizontal: 0, vertical: -30, zoom: 1.0 },
  { label: "全景俯拍", horizontal: 0, vertical: 60, zoom: 1.4 },
  { label: "背面视角", horizontal: 180, vertical: 0, zoom: 1.0 },
];

const ZOOM_LABELS: Record<number, string> = {
  0.6: "特写",
  1: "中景",
  1.4: "远景",
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
  const [zoom, setZoom] = useState(1.0);
  const [promptEnabled, setPromptEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setZoom(1.0);
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

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cameraPromptText);
      setPromptCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setPromptCopied(false), 1200);
    } catch {
      /* silently ignore — e.g. insecure context */
    }
  }, [cameraPromptText]);

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
      <header className="flex items-center px-2" style={{ height: 32, gap: 16 }}>
        <h1 className="flex-1 text-[15px] font-medium tracking-[-0.01em] text-[rgb(247,247,247)]">
          多角度编辑器
        </h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[rgb(145,145,145)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon />
        </button>
      </header>

      {/* ── Presets row (wraps to a second line if the panel narrows) ── */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 px-1">
        {PRESETS.map((p, i) => {
          const active = activePreset === i;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(i)}
              aria-pressed={active}
              className="select-none whitespace-nowrap transition-colors"
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                border: active
                  ? "1px solid rgba(54, 181, 240, 0.55)"
                  : "1px solid rgb(54, 54, 54)",
                backgroundColor: active
                  ? "rgba(54, 181, 240, 0.10)"
                  : "transparent",
                color: active ? "#7bc6f0" : "rgb(145, 145, 145)",
                fontSize: 12,
                lineHeight: "20px",
                boxShadow: active
                  ? "0 0 0 1px rgba(54, 181, 240, 0.15), inset 0 0 12px rgba(54, 181, 240, 0.08)"
                  : "none",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Divider between presets and body */}
      <div className="mx-1 h-px bg-white/[0.06]" />

      {/* ── Body: Scene + Controls ── */}
      <div className="flex items-start" style={{ gap: 8 }}>
        {/* 3D Scene column — preview + direction row in ONE unified card */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: 240,
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgb(28, 28, 28)",
            boxShadow: "inset 0 0 40px rgba(54, 181, 240, 0.05)",
          }}
        >
          <div className="relative" style={{ width: 238, height: 240 }}>
            {imageUrl ? (
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-[rgb(54,54,54)]">
                    <span className="text-xs text-white/50">加载 3D 预览...</span>
                  </div>
                }
              >
                <ThreeGlobe
                  horizontal={horizontalDeg}
                  vertical={verticalDeg}
                  width={238}
                  height={240}
                  imageUrl={imageUrl}
                  onRotate={(h, v) => {
                    setHorizontal(h);
                    setVertical(v);
                    setCustom();
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[rgb(28,28,28)]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="text-white/25"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-[12px] text-white/45">先选择一张图片</span>
              </div>
            )}
          </div>

          {/* Divider between scene and direction row */}
          <div className="h-px w-full bg-white/[0.06]" />

          {/* Direction buttons — integrated footer of the 3D card */}
          <div
            className="flex items-center justify-center gap-1.5 py-1.5"
            role="group"
            aria-label="快捷旋转"
          >
            <DirBtn
              ariaLabel="向左环绕 45°"
              onClick={() => {
                setHorizontal((h) => (((h - 45) % 360) + 360) % 360);
                setCustom();
              }}
            >
              <ChevronLeftIcon />
            </DirBtn>
            <DirBtn
              ariaLabel="向上俯仰 30°"
              onClick={() => {
                setVertical((v) => Math.min(60, v + 30));
                setCustom();
              }}
            >
              <ChevronUpIcon />
            </DirBtn>
            <DirBtn
              ariaLabel="向下俯仰 30°"
              onClick={() => {
                setVertical((v) => Math.max(-30, v - 30));
                setCustom();
              }}
            >
              <ChevronDownIcon />
            </DirBtn>
            <DirBtn
              ariaLabel="向右环绕 45°"
              onClick={() => {
                setHorizontal((h) => (h + 45) % 360);
                setCustom();
              }}
            >
              <ChevronRightIcon />
            </DirBtn>
          </div>
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 12, minHeight: 240 }}>
          {/* Group: 镜头角度 */}
          <section className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                镜头角度
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="flex flex-col" style={{ gap: 2 }}>
              <SliderRow
                label="水平环绕"
                min={0}
                max={359}
                step={1}
                value={horizontal}
                displayValue={`${horizontal}°`}
                onChange={(v) => { setHorizontal(v); setCustom(); }}
              />
              <SliderRow
                label="垂直俯仰"
                min={-30}
                max={60}
                step={1}
                value={vertical}
                displayValue={`${vertical}°`}
                onChange={(v) => { setVertical(v); setCustom(); }}
              />
              <SliderRow
                label="景别缩放"
                min={0.6}
                max={1.4}
                step={0.4}
                value={zoom}
                displayValue={zoomLabel}
                onChange={(v) => { setZoom(v); setCustom(); }}
              />
            </div>
          </section>

          {/* Group: 提示词 */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                提示词
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Prompt preview — blue-tinted card, clickable to copy */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              title="点击复制相机提示词"
              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all"
              style={{
                background: "rgba(54, 181, 240, 0.05)",
                border: "1px solid rgba(54, 181, 240, 0.12)",
              }}
            >
              <span
                className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium tracking-[0.04em]"
                style={{
                  background: "rgba(54, 181, 240, 0.15)",
                  color: "#7bc6f0",
                }}
              >
                PROMPT
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/75" title={cameraPromptText}>
                {cameraPromptText}
              </span>
              <span
                className={`flex shrink-0 items-center gap-1 text-[10px] transition-colors ${
                  promptCopied ? "text-emerald-400" : "text-white/45"
                }`}
                aria-live="polite"
              >
                {promptCopied ? (
                  "已复制"
                ) : (
                  <>
                    <CopyIcon />
                    复制
                  </>
                )}
              </span>
            </button>

            {/* Prompt toggle */}
            <div className="flex items-center gap-2 px-1">
              <label className="text-[12px] text-[rgb(145,145,145)]">追加自定义提示词</label>
              <div className="flex-1" />
              <button
                type="button"
                role="switch"
                aria-checked={promptEnabled}
                onClick={() => setPromptEnabled(!promptEnabled)}
                className="relative flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: promptEnabled
                    ? "rgb(54, 181, 240)"
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
          </section>
        </div>
      </div>

      {/* ── Result preview ── */}
      {(resultImage || generating || genError) && (
        <div
          className="mx-1 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
          role="status"
          aria-live="polite"
        >
          {generating && (
            <>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[12px] text-white/80">生成中…</span>
                <span className="text-[11px] text-white/40">相机角度正在合成，稍候</span>
              </div>
            </>
          )}
          {genError && !generating && (
            <>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[12px] font-medium text-red-400">生成失败</span>
                <span className="truncate text-[11px] text-white/50" title={genError}>{genError}</span>
              </div>
            </>
          )}
          {resultImage && !generating && !genError && (
            <>
              <img
                src={resultImage}
                alt="生成结果"
                className="h-12 w-12 shrink-0 rounded-md border border-white/10 object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1 text-[12px] font-medium text-emerald-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  生成成功
                </span>
                <span className="text-[11px] text-white/50">点击下方发送将生成新节点</span>
              </div>
            </>
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
          {/* Cost indicator with tooltip */}
          <span
            className="flex items-center gap-1 text-[13px] text-[rgb(145,145,145)]"
            title="每次生成将消耗 1 点能量"
          >
            <LightningIcon />
            <span className="tabular-nums">1</span>
            <MiniInfoIcon title="每次生成将消耗 1 点能量" />
          </span>
          {/* Submit button → spawn output node via onApply */}
          <button
            type="button"
            onClick={handleApply}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-[0_2px_10px_rgba(54,181,240,0.35)] transition-all duration-150 hover:shadow-[0_3px_14px_rgba(54,181,240,0.5)] active:scale-95"
            style={{ background: "linear-gradient(135deg, #36b5f0 0%, #2b9cd9 100%)" }}
            title="生成多角度"
            aria-label="生成多角度"
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
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
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
      <div className="relative min-w-0 flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="angle-slider w-full cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, #36b5f0 0%, #2b9cd9 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
            height: 6,
            borderRadius: 3,
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
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
    <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor">
      <path d="M8.29289 0.292893C8.68342 -0.0976311 9.31658 -0.0976311 9.70711 0.292893L17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711C17.3166 10.0976 16.6834 10.0976 16.2929 9.70711L10 3.41421V17C10 17.5523 9.55229 18 9 18C8.44772 18 8 17.5523 8 17V3.41421L1.70711 9.70711C1.31658 10.0976 0.683418 10.0976 0.292893 9.70711C-0.0976311 9.31658 -0.0976311 8.68342 0.292893 8.29289L8.29289 0.292893Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function MiniInfoIcon({ title }: { title?: string }) {
  return (
    <span
      className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[rgb(82,82,82)] text-[9px] text-[rgb(145,145,145)] transition-colors hover:border-[rgb(134,144,156)] hover:text-[rgb(220,220,220)]"
      title={title}
      aria-label={title}
      role="img"
    >
      ?
    </span>
  );
}
