"use client";

import { memo, useState, useCallback, lazy, Suspense, type ReactNode } from "react";

const ThreeLightScene = lazy(() => import("./ThreeLightScene").then((m) => ({ default: m.ThreeLightScene })));

type LightDirection = "left" | "top" | "right" | "front" | "bottom" | "back";

const DIRECTIONS: { key: LightDirection; label: string; Icon: () => ReactNode }[] = [
  { key: "left", label: "左侧", Icon: DirLeftIcon },
  { key: "top", label: "顶部", Icon: DirTopIcon },
  { key: "right", label: "右侧", Icon: DirRightIcon },
  { key: "front", label: "前方", Icon: DirFrontIcon },
  { key: "bottom", label: "底部", Icon: DirBottomIcon },
  { key: "back", label: "后方", Icon: DirBackIcon },
];

const BRIGHTNESS_LABELS: Record<number, string> = {
  0: "0",
  1: "25",
  2: "50",
  3: "75",
  4: "100",
};

const BRIGHTNESS_TICKS = ["0", "柔和", "自然", "明亮", "强光"];

const COLOR_PRESETS: { hex: string; label: string }[] = [
  { hex: "#ffe4c4", label: "暖黄" },
  { hex: "#fff8e7", label: "自然" },
  { hex: "#ffffff", label: "中性白" },
  { hex: "#d4e4ff", label: "冷白" },
  { hex: "#b4c7ff", label: "科技蓝" },
  { hex: "#ffd6e8", label: "粉调" },
];

interface LightEditorProps {
  onClose: () => void;
  onApply?: (data: {
    brightness: number;
    color: string;
    direction: LightDirection;
    smartMode: boolean;
    rimLight: boolean;
  }) => void;
  imageUrl?: string;
}

function LightEditorInner({ onClose, onApply, imageUrl }: LightEditorProps) {
  const [smartMode, setSmartMode] = useState(false);
  const [brightness, setBrightness] = useState(2);
  const [color, setColor] = useState("#ffe4c4");
  const [direction, setDirection] = useState<LightDirection>("front");
  const [rimLight, setRimLight] = useState(false);
  const [viewMode, setViewMode] = useState<"perspective" | "front">("perspective");

  const resetParams = useCallback(() => {
    setSmartMode(false);
    setBrightness(2);
    setColor("#ffe4c4");
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
      className="nodrag nopan flex w-full flex-col"
      style={{
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
          打光效果
        </h1>
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
      </header>

      {/* Divider between header and body */}
      <div className="mx-1 h-px bg-white/[0.06]" />

      {/* ── Body ── */}
      <div className="flex items-start" style={{ gap: 8 }}>
        {/* 3D Scene column — tabs + preview in ONE unified card */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: 200,
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgb(28, 28, 28)",
            boxShadow: "inset 0 0 40px rgba(54, 181, 240, 0.05)",
          }}
        >
          {/* Mode tabs */}
          <div className="flex items-center gap-1.5 px-2 py-2">
            <ModeTab label="透视" active={viewMode === "perspective"} onClick={() => setViewMode("perspective")} />
            <ModeTab label="正面" active={viewMode === "front"} onClick={() => setViewMode("front")} />
          </div>

          {/* Divider between tabs and preview */}
          <div className="h-px w-full bg-white/[0.06]" />

          {/* 3D Light Preview (Three.js) */}
          <div className="flex items-center justify-center overflow-hidden" style={{ width: 198, height: 240, backgroundColor: "rgb(28, 28, 28)" }}>
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><span className="text-xs text-white/50">加载 3D 预览...</span></div>}>
              <ThreeLightScene
                direction={direction}
                brightness={brightness}
                color={color}
                viewMode={viewMode}
                width={198}
                height={240}
                imageUrl={imageUrl}
              />
            </Suspense>
          </div>
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 12, minHeight: 288 }}>
          {/* Group: 光源 */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                光源
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Brightness */}
            <div className="flex flex-col gap-1 py-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[rgb(145,145,145)]">亮度</span>
                <InfoIcon title="控制光源的整体强度。0% 几乎无光，100% 为最亮。" />
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="angle-slider min-w-0 flex-1 cursor-pointer appearance-none"
                  style={{
                    background: `linear-gradient(to right, #36b5f0 0%, #2b9cd9 ${sliderPct}%, rgba(255,255,255,0.08) ${sliderPct}%, rgba(255,255,255,0.08) 100%)`,
                    height: 6,
                    borderRadius: 3,
                  }}
                />
                <div className="flex items-center gap-0.5">
                  <span className="inline-flex h-6 min-w-[36px] items-center justify-center rounded border border-[rgb(54,54,54)] bg-transparent px-1 text-center text-[12px] tabular-nums text-[rgb(247,247,247)]">
                    {brightnessPct}
                  </span>
                  <span className="text-[11px] text-[rgb(145,145,145)]">%</span>
                </div>
              </div>
              {/* Tick labels (click to snap) */}
              <div className="flex items-center" style={{ paddingLeft: 44, paddingRight: 56 }}>
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  {BRIGHTNESS_TICKS.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBrightness(i)}
                      className="text-[10px] leading-none transition-colors"
                      style={{
                        color: i === brightness ? "#7bc6f0" : "rgb(110,110,110)",
                        fontWeight: i === brightness ? 500 : 400,
                      }}
                      title={`亮度：${t}（${i * 25}%）`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="flex items-center gap-2 py-1">
              <span className="text-[12px] text-[rgb(145,145,145)]">颜色</span>
              <InfoIcon title="光源色温。暖色（橙黄）适合温馨场景，冷色（蓝白）适合科技/清爽场景。" />
              <button
                type="button"
                className="relative flex h-7 w-10 items-center justify-center overflow-hidden rounded-md border border-[rgb(54,54,54)] transition-colors hover:border-[rgba(54,181,240,0.55)]"
                title="自定义颜色"
                aria-label="自定义颜色"
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
              {/* Preset color chips */}
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((p) => {
                  const active = color.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className="relative h-5 w-5 rounded-full transition-all hover:scale-110"
                      style={{
                        backgroundColor: p.hex,
                        border: active
                          ? "2px solid rgba(54, 181, 240, 0.65)"
                          : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: active ? "0 0 0 2px rgba(54, 181, 240, 0.25)" : "none",
                      }}
                      title={`${p.label}（${p.hex}）`}
                      aria-label={p.label}
                      aria-pressed={active}
                    />
                  );
                })}
              </div>
            </div>

            {/* Main Light Source */}
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-[12px] text-[rgb(145,145,145)]">主光源方向</span>
              <div className="grid grid-cols-3 gap-1.5">
                {DIRECTIONS.map((d) => {
                  const active = direction === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDirection(d.key)}
                      className="flex select-none items-center justify-center gap-1 whitespace-nowrap text-center text-[12px] transition-colors"
                      style={{
                        padding: "6px 0",
                        borderRadius: 8,
                        border: active
                          ? "1px solid rgba(54, 181, 240, 0.55)"
                          : "1px solid rgb(54, 54, 54)",
                        backgroundColor: active
                          ? "rgba(54, 181, 240, 0.10)"
                          : "transparent",
                        color: active ? "#7bc6f0" : "rgb(145, 145, 145)",
                        boxShadow: active
                          ? "inset 0 0 12px rgba(54, 181, 240, 0.08)"
                          : "none",
                      }}
                      aria-pressed={active}
                    >
                      <span
                        className="flex h-3 w-3 shrink-0 items-center justify-center"
                        style={{ opacity: active ? 1 : 0.7 }}
                        aria-hidden
                      >
                        <d.Icon />
                      </span>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Group: 辅助 */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                辅助
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Smart mode */}
            <div className="flex items-center gap-2 px-1 py-0.5">
              <span className="text-[12px] text-[rgb(145,145,145)]">智能模式</span>
              <InfoIcon title="开启后系统根据图像内容自动优化光照参数。" />
              <div className="flex-1" />
              <ToggleSwitch checked={smartMode} onChange={setSmartMode} />
            </div>

            {/* Rim Light */}
            <div className="flex items-center gap-2 px-1 py-0.5">
              <span className="text-[12px] text-[rgb(145,145,145)]">轮廓光</span>
              <InfoIcon title="在主体边缘添加一层补光，让人物或物体与背景更好地分离，常用于人像摄影。" />
              <div className="flex-1" />
              <ToggleSwitch checked={rimLight} onChange={setRimLight} />
            </div>
          </section>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-1 h-px bg-white/[0.06]" />

      {/* ── Footer ── */}
      <div className="flex items-center" style={{ padding: "0 4px", gap: 4, minHeight: 40 }}>
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
          <span
            className="flex items-center gap-1 text-[11px] tabular-nums text-[rgb(145,145,145)]"
            title="每次应用打光将消耗 14 点能量"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" /></svg>
            14
            <InfoIcon title="每次应用打光将消耗 14 点能量" />
          </span>
          <button
            type="button"
            onClick={handleApply}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[0_2px_10px_rgba(54,181,240,0.35)] transition-all duration-150 hover:shadow-[0_3px_14px_rgba(54,181,240,0.5)] active:scale-95"
            style={{ background: "linear-gradient(135deg, #36b5f0 0%, #2b9cd9 100%)" }}
            title="应用"
            aria-label="应用打光效果"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
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
      aria-pressed={active}
      className="select-none whitespace-nowrap transition-colors"
      style={{
        padding: "4px 12px",
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
          ? "inset 0 0 12px rgba(54, 181, 240, 0.08)"
          : "none",
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
        backgroundColor: checked ? "rgb(54, 181, 240)" : "rgb(82, 82, 82)",
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

function InfoIcon({ title }: { title?: string }) {
  return (
    <span
      className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[rgb(82,82,82)] text-[9px] text-[rgb(145,145,145)] transition-colors hover:border-[rgb(134,144,156)] hover:text-[rgb(220,220,220)]"
      title={title}
      aria-label={title}
      role="img"
    >
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

/* ─── Direction icons (10×10 glyphs, consumed by DIRECTIONS array) ─── */

function DirLeftIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function DirRightIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function DirTopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="19 12 12 5 5 12" />
    </svg>
  );
}

function DirBottomIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="5 12 12 19 19 12" />
    </svg>
  );
}

function DirFrontIcon() {
  // Pointing toward viewer: filled dot inside ring
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DirBackIcon() {
  // Pointing away: empty ring with diagonal (crosshair tail)
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="8" y1="8" x2="16" y2="16" />
      <line x1="16" y1="8" x2="8" y2="16" />
    </svg>
  );
}
