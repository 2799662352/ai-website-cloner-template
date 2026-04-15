"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

/** Minimal invisible connector node (1×1px). */
function TempNodeInner(_props: NodeProps) {
  return (
    <div
      className="relative"
      style={{
        width: 1,
        height: 1,
        background: "transparent",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          width: 0,
          height: 0,
          minWidth: 0,
          minHeight: 0,
          padding: 0,
          background: "transparent",
          borderWidth: 0,
          left: 0,
          top: "50%",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          width: 0,
          height: 0,
          minWidth: 0,
          minHeight: 0,
          padding: 0,
          background: "transparent",
          borderWidth: 0,
          right: 0,
          top: "50%",
        }}
      />
    </div>
  );
}

export const TempNodeComponent = memo(TempNodeInner);
