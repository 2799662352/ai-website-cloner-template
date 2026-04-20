"use client";

import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import {
  IconLayout,
  IconMinimap,
  IconGrid,
  IconMinus,
  IconPlus,
} from "./icons";

export function BottomBar() {
  const zoom = useCanvasStore((s) => Math.round(s.viewport.zoom * 100));
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const toggleMinimap = useCanvasStore((s) => s.toggleMinimap);
  const toggleSnapToGrid = useCanvasStore((s) => s.toggleSnapToGrid);

  const reactFlow = useReactFlow();

  return (
    <div className="absolute bottom-4 left-3 z-30 flex items-center gap-0.5 rounded-xl bg-[var(--surface-panel-bg)] p-1 shadow-lg shadow-black/30">
      <BottomButton
        title="整理画布 Alt+Shift+F"
        onClick={() => reactFlow.fitView({ padding: 0.2, duration: 400, maxZoom: 1.2 })}
      >
        <IconLayout />
      </BottomButton>
      <BottomButton
        title="切换小地图"
        active={showMinimap}
        onClick={() => toggleMinimap()}
      >
        <IconMinimap />
      </BottomButton>
      <BottomButton
        title="网格吸附"
        active={snapToGrid}
        onClick={() => toggleSnapToGrid()}
      >
        <IconGrid />
      </BottomButton>

      <div className="mx-1 h-4 w-px bg-white/10" />

      <BottomButton title="缩小" onClick={() => reactFlow.zoomOut()}>
        <IconMinus />
      </BottomButton>

      <button
        type="button"
        title="适应画布"
        onClick={() => reactFlow.fitView({ padding: 0.2, maxZoom: 1.2 })}
        className="flex min-w-[48px] items-center justify-center rounded-lg px-1.5 text-[13px] leading-8 tabular-nums text-fg-muted transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-fg-default"
      >
        {zoom}%
      </button>

      <BottomButton title="放大" onClick={() => reactFlow.zoomIn()}>
        <IconPlus />
      </BottomButton>
    </div>
  );
}

function BottomButton({
  children,
  title,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-[var(--canvas-controls-active)] text-fg-default"
          : "text-fg-muted hover:bg-[var(--canvas-controls-hover)] hover:text-fg-default"
      }`}
    >
      {children}
    </button>
  );
}
