"use client";

import { memo, useState, useCallback, lazy, Suspense } from "react";

const ThreeLightScene = lazy(() => import("./ThreeLightScene").then((m) => ({ default: m.ThreeLightScene })));

type LightDirection = "left" | "top" | "right" | "front" | "bottom" | "back";

const DIRECTIONS: { key: LightDirection; label: string }[] = [
  { key: "left", label: "左侧" },
  { key: "top", label: "顶部" },
  { key: "right", label: "右侧" },
  { key: "front", label: "前方" },
  { key: "bottom", label: "底部" },
  { key: "back", label: "后方" },
];

const BRIGHTNESS_LABELS: Record<number, string> = {
  0: "0",
  1: "25",
  2: "50",
  3: "75",
  4: "100",
};

interface LightEditorProps {
  onClose: () => void;
  onApply?: (data: {
    brightness: number;
    color: string;
    direction: LightDirection;
    smartMode: boolean;
    rimLight: boolean;
  }) => void;
}

function LightEditorInner({ onClose, onApply }: LightEditorProps) {
  const [smartMode, setSmartMode] = useState(false);
  const [brightness, setBrightness] = useState(2);
  const [color, setColor] = useState("#e84040");
  const [direction, setDirection] = useState<LightDirection>("front");
  const [rimLight, setRimLight] = useState(false);
  const [viewMode, setViewMode] = useState<"perspective" | "front">("perspective");

  const resetParams = useCallback(() => {
    setSmartMode(false);
    setBrightness(2);
    setColor("#e84040");
    setDirection("front");
    setRimLight(false);
  }, []);

  const handleApply = useCallback(() => {
    onApply?.({ brightness, color, direction, smartMode, rimLight });
  }, [onApply, brightness, color, direction, smartMode, rimLight]);

  const brightnessPct = BRIGHTNESS_LABELS[brightness] ?? `${brightness * 25}`;
  const sliderPct = (brightness / 4) * 100;

  return (
    <div
      className="nodrag nopan flex flex-col"
      style={{
        width: 458,
        backgroundColor: "rgb(38, 38, 38)",
        borderRadius: 12,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Title Bar ── */}
      <div
        className="flex items-center justify-between"
        style={{ height: 49, padding: "12px 16px" }}
      >
        <span className="text-[15px] font-medium text-[rgb(247,247,247)]">
          打光效果
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[rgb(145,145,145)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex" style={{ padding: "0 16px 16px", gap: 0, minHeight: 294 }}>
        {/* 3D Scene */}
        <div className="flex shrink-0 flex-col" style={{ width: 200 }}>
          {/* Mode tabs */}
          <div className="mb-2 flex gap-1.5">
            <ModeTab label="透视" active={viewMode === "perspective"} onClick={() => setViewMode("perspective")} />
            <ModeTab label="正面" active={viewMode === "front"} onClick={() => setViewMode("front")} />
          </div>
          {/* 3D Light Preview (Three.js) */}
          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: "rgb(32, 32, 32)" }}>
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><span className="text-xs text-white/30">Loading 3D...</span></div>}>
              <ThreeLightScene
                direction={direction}
                brightness={brightness}
                color={color}
                viewMode={viewMode}
                width={200}
                height={220}
              />
            </Suspense>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-1 flex-col justify-start pl-4" style={{ gap: 0 }}>
          {/* Header: 全局 + 智能模式 toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] font-medium text-[rgb(247,247,247)]">全局</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[rgb(145,145,145)]">智能模式</span>
              <ToggleSwitch checked={smartMode} onChange={setSmartMode} />
            </div>
          </div>

          {/* Brightness */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-[12px] text-[rgb(145,145,145)]">亮度</span>
            <InfoIcon />
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="angle-slider flex-1 cursor-pointer appearance-none"
              style={{
                background: `linear-gradient(to right, rgb(145,145,145) 0%, rgb(145,145,145) ${sliderPct}%, rgb(82,82,82) ${sliderPct}%, rgb(82,82,82) 100%)`,
                height: 4,
                borderRadius: 2,
              }}
            />
            <div className="flex items-center gap-0.5">
              <span className="inline-flex h-6 min-w-[36px] items-center justify-center rounded border border-[rgb(54,54,54)] bg-transparent px-1 text-center text-[12px] tabular-nums text-[rgb(247,247,247)]">
                {brightnessPct}
              </span>
              <span className="text-[11px] text-[rgb(145,145,145)]">%</span>
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-[12px] text-[rgb(145,145,145)]">颜色</span>
            <InfoIcon />
            <button
              type="button"
              className="relative flex h-7 w-10 items-center justify-center overflow-hidden rounded-md border border-[rgb(54,54,54)] transition-colors hover:border-[rgb(134,144,156)]"
            >
              <div
                className="h-full w-full"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </button>
          </div>

          {/* Main Light Source */}
          <div className="mt-1 flex flex-col gap-2">
            <span className="text-[12px] text-[rgb(145,145,145)]">主光源</span>
            <div className="grid grid-cols-3 gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDirection(d.key)}
                  className="select-none whitespace-nowrap text-center text-[12px] transition-colors"
                  style={{
                    padding: "6px 0",
                    borderRadius: 8,
                    border:
                      direction === d.key
                        ? "1px solid rgb(134, 144, 156)"
                        : "1px solid rgb(54, 54, 54)",
                    backgroundColor:
                      direction === d.key
                        ? "rgba(255, 255, 255, 0.15)"
                        : "transparent",
                    color:
                      direction === d.key
                        ? "rgb(247, 247, 247)"
                        : "rgb(145, 145, 145)",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rim Light */}
          <div className="mt-3 flex items-center gap-2 py-1">
            <span className="text-[12px] text-[rgb(145,145,145)]">轮廓光</span>
            <InfoIcon />
            <div className="flex-1" />
            <ToggleSwitch checked={rimLight} onChange={setRimLight} />
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px w-full bg-[rgb(54,54,54)]" />

      {/* ── Footer ── */}
      <div className="flex items-center" style={{ padding: 8, gap: 4, minHeight: 48 }}>
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
          <span className="flex items-center gap-0.5 text-[11px] tabular-nums text-[rgb(145,145,145)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" /></svg>
            14
          </span>
          <button
            type="button"
            onClick={handleApply}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="应用"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export const LightEditor = memo(LightEditorInner);

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="select-none whitespace-nowrap text-[12px] transition-colors"
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        border: "1px solid rgb(54, 54, 54)",
        backgroundColor: active ? "rgba(255, 255, 255, 0.15)" : "transparent",
        color: active ? "rgb(247, 247, 247)" : "rgb(145, 145, 145)",
      }}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors"
      style={{
        backgroundColor: checked ? "rgb(59, 130, 246)" : "rgb(82, 82, 82)",
      }}
    >
      <div
        className="h-[16px] w-[16px] rounded-full bg-white shadow transition-transform"
        style={{
          transform: checked ? "translateX(18px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

function InfoIcon() {
  return (
    <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[rgb(82,82,82)] text-[9px] text-[rgb(145,145,145)]">
      ?
    </span>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
