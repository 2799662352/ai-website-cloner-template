"use client";

import { memo, useEffect, useRef } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { GroupNodeData } from "@/types/canvas";

const MIN_GROUP_WIDTH = 120;
const MIN_GROUP_HEIGHT = 80;

function GroupNodeInner({ id, data, selected }: NodeProps & { data: GroupNodeData }) {
  const childCount = useCanvasStore(
    (s) => s.nodes.filter((n) => n.parentId === id).length,
  );

  // Apply per-group color (B2: tinted border + translucent fill) by mutating
  // the React-Flow-rendered .react-flow__node-group element. This survives
  // re-renders because we re-apply on every commit driven by data.groupColor.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current?.closest<HTMLElement>(
      ".react-flow__node-group",
    );
    if (!el) return;
    const color = data.groupColor;
    if (color) {
      el.style.borderColor = color;
      el.style.background = `${color}1F`;
    } else {
      el.style.borderColor = "";
      el.style.background = "";
    }
  }, [data.groupColor]);

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_GROUP_WIDTH}
        minHeight={MIN_GROUP_HEIGHT}
        lineClassName="canvas-group-resize-line"
        handleClassName="canvas-group-resize-handle"
      />
      <div
        className="canvas-group-label nodrag absolute left-0 origin-bottom-left transition-[transform,opacity] duration-150 ease-out"
        style={{ bottom: "calc(100% + 8px)", pointerEvents: "none" }}
      >
        <span className="text-[13px] text-fg-muted/70">
          {data.label || `分组 ${childCount} 个节点`}
        </span>
      </div>
    </div>
  );
}

export const GroupNodeComponent = memo(GroupNodeInner);
