"use client";

import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";
import type { GroupNodeData } from "@/types/canvas";

// Minimum group dimensions — small enough to collapse around one node but not
// vanish into a dot. Matches LibTV's lower bound.
const MIN_GROUP_WIDTH = 120;
const MIN_GROUP_HEIGHT = 80;

function GroupNodeInner({ id, data, selected }: NodeProps & { data: GroupNodeData }) {
  const childCount = useCanvasStore(
    (s) => s.nodes.filter((n) => n.parentId === id).length
  );

  return (
    <>
      {/* LibTV-style resizer: 4 edge lines + 4 corner handles, only when selected.
          Child node positions are NOT scaled — the container just grows/shrinks. */}
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
    </>
  );
}

export const GroupNodeComponent = memo(GroupNodeInner);
