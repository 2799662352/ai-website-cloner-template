"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════
   Generic Dropdown wrapper
   ═══════════════════════════════════════════════════════ */

function Dropdown({
  trigger,
  children,
  open,
  onToggle,
  align = "left",
}: {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
  align?: "left" | "center";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div
          className="absolute top-full z-50 mt-1"
          style={align === "center" ? { left: "50%", transform: "translateX(-50%)" } : { left: 0 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Dropdown menu styling
   ═══════════════════════════════════════════════════════ */

function MenuDivider() {
  return <div className="mx-2 my-1 h-px bg-white/10" />;
}

function DropdownMenu({ children, minWidth = 140 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div
      className="flex flex-col rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] py-1.5 shadow-xl"
      style={{ minWidth }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  active,
  onClick,
  hasSubmenu,
  onHover,
}: {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  hasSubmenu?: boolean;
  onHover?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors ${
        active
          ? "bg-white/10 text-[rgb(247,247,247)]"
          : "text-[rgb(200,200,200)] hover:bg-white/5"
      }`}
    >
      {icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-70">{icon}</span>}
      <span className="flex-1">{label}</span>
      {hasSubmenu && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   高清 (HD) Dropdown
   ═══════════════════════════════════════════════════════ */

export function HDDropdown({
  trigger,
  open,
  onToggle,
}: {
  trigger: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Dropdown trigger={trigger} open={open} onToggle={onToggle} align="center">
      <DropdownMenu minWidth={150}>
        <MenuItem icon={<HDMenuIcon />} label="高清" active />
        <MenuItem icon={<ExpandIcon />} label="扩图" />
        <MenuItem icon={<RedrawIcon />} label="重绘" />
        <MenuItem icon={<EraserIcon />} label="擦除" />
        <MenuItem icon={<CutoutIcon />} label="抠图" />
        <MenuItem icon={<CropIcon />} label="裁剪" />
      </DropdownMenu>
    </Dropdown>
  );
}

/* ═══════════════════════════════════════════════════════
   九宫格 Dropdown
   ═══════════════════════════════════════════════════════ */

export function NineGridDropdown({
  trigger,
  open,
  onToggle,
  onSelect,
}: {
  trigger: ReactNode;
  open: boolean;
  onToggle: () => void;
  onSelect?: (item: string) => void;
}) {
  const pick = (label: string) => { onSelect?.(label); onToggle(); };
  return (
    <Dropdown trigger={trigger} open={open} onToggle={onToggle} align="center">
      <DropdownMenu minWidth={210}>
        <MenuItem icon={<MultiCamIcon />} label="多机位九宫格" onClick={() => pick("multi-cam-nine")} />
        <MenuItem icon={<PlotPushIcon />} label="剧情推演四宫格" onClick={() => pick("plot-push-four")} />
        <MenuItem icon={<Grid25Icon />} label="25宫格连贯分镜" onClick={() => pick("grid-25")} />
        <MenuItem icon={<FilmLightIcon />} label="电影级光影校正" onClick={() => pick("film-light")} />
        <MenuItem icon={<CharTriIcon />} label="角色三视图生成" onClick={() => pick("char-tri-view")} />
        <MenuDivider />
        <MenuItem icon={<PushAfterIcon />} label="画面推演 - 3秒后" onClick={() => pick("push-after-3s")} />
        <MenuItem icon={<PushBeforeIcon />} label="画面推演 - 5秒前" onClick={() => pick("push-before-5s")} />
      </DropdownMenu>
    </Dropdown>
  );
}

/* ═══════════════════════════════════════════════════════
   宫格切分 Dropdown (with submenu)
   ═══════════════════════════════════════════════════════ */

export function GridSplitDropdown({
  trigger,
  open,
  onToggle,
  onSelect,
}: {
  trigger: ReactNode;
  open: boolean;
  onToggle: () => void;
  onSelect?: (item: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const pick = (label: string) => { onSelect?.(label); onToggle(); };

  return (
    <Dropdown trigger={trigger} open={open} onToggle={onToggle} align="center">
      <div className="flex">
        <DropdownMenu minWidth={160}>
          <MenuItem label="4宫格 (2×2)" onClick={() => pick("split-2x2")} />
          <MenuItem label="9宫格 (3×3)" onClick={() => pick("split-3x3")} />
          <MenuItem label="16宫格 (4×4)" onClick={() => pick("split-4x4")} />
          <MenuItem label="25宫格 (5×5)" onClick={() => pick("split-5x5")} />
          <MenuItem label="自定义" hasSubmenu onHover={() => setShowCustom(true)} />
        </DropdownMenu>

        {/* Custom grid submenu */}
        {showCustom && (
          <div
            className="ml-1 rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] p-3 shadow-xl"
            onMouseLeave={() => setShowCustom(false)}
          >
            <div className="mb-2 text-[12px] text-[rgb(200,200,200)]">自定义宫格</div>
            <CustomGridSelector />
          </div>
        )}
      </div>
    </Dropdown>
  );
}

function CustomGridSelector() {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const maxR = 5, maxC = 5;

  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: maxR }).map((_, r) => (
        <div key={r} className="flex gap-0.5">
          {Array.from({ length: maxC }).map((_, c) => {
            const active = hover ? r <= hover.r && c <= hover.c : false;
            return (
              <div
                key={c}
                className="cursor-pointer transition-colors"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 3,
                  backgroundColor: active
                    ? "rgba(59, 130, 246, 0.5)"
                    : "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={() => setHover({ r, c })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </div>
      ))}
      {hover && (
        <div className="mt-1 text-center text-[11px] text-[rgb(145,145,145)]">
          {hover.r + 1} × {hover.c + 1}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Icons for HD dropdown
   ═══════════════════════════════════════════════════════ */

function HDMenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="4" width="18" height="12" rx="2" />
      <path d="M6 8v4M6 10h3M9 8v4M13 8v2a2 2 0 0 1-2 2h0" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function RedrawIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16a1.5 1.5 0 0 1 0-2.12L14.88 2a1.5 1.5 0 0 1 2.12 0L21 6.12a1.5 1.5 0 0 1 0 2.12L10 19.24" />
      <path d="M6 11l7 7" />
    </svg>
  );
}

function CutoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  );
}

function CropIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v4M6 6h12a2 2 0 0 1 2 2v12" />
      <path d="M18 22v-4M18 18H6a2 2 0 0 1-2-2V4" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   Icons for Nine Grid dropdown
   ═══════════════════════════════════════════════════════ */

function MultiCamIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="8" height="6" rx="1" />
      <rect x="14" y="4" width="8" height="6" rx="1" />
      <rect x="8" y="14" width="8" height="6" rx="1" />
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="18" cy="7" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
    </svg>
  );
}

function PlotPushIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="8" height="8" rx="1" />
      <rect x="14" y="3" width="8" height="8" rx="1" />
      <rect x="2" y="13" width="8" height="8" rx="1" />
      <rect x="14" y="13" width="8" height="8" rx="1" />
      <path d="M10 7h4M7 11v4" />
    </svg>
  );
}

function Grid25Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <rect x="1" y="1" width="3.5" height="3.5" rx="0.3" />
      <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.3" />
      <rect x="10" y="1" width="3.5" height="3.5" rx="0.3" />
      <rect x="14.5" y="1" width="3.5" height="3.5" rx="0.3" />
      <rect x="19" y="1" width="3.5" height="3.5" rx="0.3" />
      <rect x="1" y="5.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="10" y="5.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="14.5" y="5.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="19" y="5.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="1" y="10" width="3.5" height="3.5" rx="0.3" />
      <rect x="5.5" y="10" width="3.5" height="3.5" rx="0.3" />
      <rect x="10" y="10" width="3.5" height="3.5" rx="0.3" />
      <rect x="14.5" y="10" width="3.5" height="3.5" rx="0.3" />
      <rect x="19" y="10" width="3.5" height="3.5" rx="0.3" />
      <rect x="1" y="14.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="5.5" y="14.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="10" y="14.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="14.5" y="14.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="19" y="14.5" width="3.5" height="3.5" rx="0.3" />
      <rect x="1" y="19" width="3.5" height="3.5" rx="0.3" />
      <rect x="5.5" y="19" width="3.5" height="3.5" rx="0.3" />
      <rect x="10" y="19" width="3.5" height="3.5" rx="0.3" />
      <rect x="14.5" y="19" width="3.5" height="3.5" rx="0.3" />
      <rect x="19" y="19" width="3.5" height="3.5" rx="0.3" />
    </svg>
  );
}

function FilmLightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <circle cx="12" cy="11" r="4" />
      <path d="M12 7v-3M8.5 8.5L6 6M15.5 8.5L18 6" />
    </svg>
  );
}

function CharTriIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v2" />
      <rect x="8" y="11" width="8" height="10" rx="1" />
      <path d="M4 14h3M17 14h3" />
    </svg>
  );
}

function PushAfterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="12" height="14" rx="1.5" />
      <path d="M18 9l3 3-3 3" />
      <path d="M15 12h6" />
    </svg>
  );
}

function PushBeforeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="5" width="12" height="14" rx="1.5" />
      <path d="M6 9l-3 3 3 3" />
      <path d="M3 12h6" />
    </svg>
  );
}
