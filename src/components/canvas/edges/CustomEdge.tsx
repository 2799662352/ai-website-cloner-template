"use client";

import { memo, useState, useCallback } from "react";
import {
  getBezierPath,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";

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

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider path for easier interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {/* Visible path */}
      <path
        d={edgePath}
        fill="none"
        stroke={
          selected
            ? "rgba(255,255,255,0.5)"
            : hovered
              ? "rgba(255,255,255,0.35)"
              : "rgba(255,255,255,0.15)"
        }
        strokeWidth={selected ? 2.5 : 2}
        className="react-flow__edge-path transition-colors"
        style={style}
      />

      {/* Delete button on hover */}
      {hovered && (
        <foreignObject
          x={labelX - 10}
          y={labelY - 10}
          width={20}
          height={20}
          className="overflow-visible"
        >
          <button
            onClick={handleDelete}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white shadow-md transition-transform hover:scale-110"
            title="删除连线"
          >
            ×
          </button>
        </foreignObject>
      )}
    </g>
  );
}

export const CustomEdge = memo(CustomEdgeInner);
