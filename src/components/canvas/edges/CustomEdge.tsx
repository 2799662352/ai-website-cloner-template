"use client";

import { memo, useCallback, useId, useMemo, useState } from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";

const ACCENT = "rgb(54, 181, 240)";

function safeSvgFragment(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function CustomEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
}: EdgeProps) {
  const reactId = useId();
  const uid = useMemo(() => safeSvgFragment(`${id}_${reactId}`), [id, reactId]);
  const [hovered, setHovered] = useState(false);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEdge(id);
    },
    [id, deleteEdge]
  );

  const active = selected || hovered;
  const glowStrokeWidth = selected ? 9 : hovered ? 7 : 5;
  const glowOpacity = selected ? 0.38 : hovered ? 0.24 : 0.14;
  const topStroke = selected
    ? "rgba(54, 181, 240, 0.95)"
    : hovered
      ? "rgba(200, 230, 255, 0.52)"
      : "rgba(255, 255, 255, 0.16)";
  const topWidth = selected ? 2.75 : hovered ? 2.35 : 1.85;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs>
        <filter
          id={`edge-glow-${uid}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wide hit area for hover / selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={26}
        className="react-flow__edge-interaction"
      />

      {/* Soft accent underlay + glow when active */}
      <path
        d={edgePath}
        fill="none"
        stroke={ACCENT}
        strokeOpacity={glowOpacity}
        strokeWidth={glowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={active ? `url(#edge-glow-${uid})` : undefined}
        style={{ pointerEvents: "none" }}
      />

      {/* Crisp foreground line */}
      <path
        d={edgePath}
        fill="none"
        stroke={topStroke}
        strokeWidth={topWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`react-flow__edge-path duration-150 ease-out ${
          hovered && !selected
            ? "canvas-edge-flow-dash"
            : "transition-[stroke,stroke-width]"
        }`}
        style={style}
      />

      {hovered && (
        <foreignObject
          x={labelX - 14}
          y={labelY - 14}
          width={28}
          height={28}
          className="pointer-events-auto overflow-visible"
        >
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/95 text-[15px] leading-none text-white shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform hover:scale-105 hover:border-red-400/50 hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            title="删除连线"
            aria-label="删除连线"
          >
            ×
          </button>
        </foreignObject>
      )}
    </g>
  );
}

export const CustomEdge = memo(CustomEdgeInner);
