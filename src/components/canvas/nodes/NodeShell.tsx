"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { IconImage } from "../icons";

/**
 * LibTV-style "+" handle — a 20x20 SVG plus-button floating 25px outside the
 * node edge. The underlying React Flow <Handle> is kept 0x0 and transparent so
 * it only carries the connection logic; the SVG is rendered as its child so
 * pointer-downs on the "+" start a connection just like on a native handle.
 *
 * Visibility is controlled entirely from globals.css:
 *   opacity: 0 by default,
 *   opacity: 1 when the parent node is hovered / selected / connecting.
 */
function PlusHandle({
  side,
  type,
  id,
}: {
  side: "left" | "right";
  type: "source" | "target";
  id: string;
}) {
  const position = side === "left" ? Position.Left : Position.Right;
  const offset = side === "left" ? -25 : 25;
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className="canvas-plus-handle"
      style={{
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: 0,
        overflow: "visible",
        pointerEvents: "auto",
        zIndex: 20,
      }}
    >
      <div
        className="canvas-plus-handle__btn"
        style={{
          width: 20,
          height: 20,
          pointerEvents: "auto",
          transform: `translate(${offset}px, 0) translate(-50%, -50%) scale(1)`,
          transformOrigin: "center center",
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9.35" className="canvas-plus-handle__bg" />
          <circle
            cx="10"
            cy="10"
            r="9.35"
            className="canvas-plus-handle__ring"
            fill="none"
            strokeWidth={1.2}
          />
          <path
            d="M10 6.5v7M6.5 10h7"
            className="canvas-plus-handle__icon"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </Handle>
  );
}

interface NodeShellProps {
  nodeId: string;
  name: string;
  resolution?: string;
  icon?: ReactNode;
  selected?: boolean;
  width: number;
  height: number;
  children: ReactNode;
  /** Rendered as a separate floating card below the image, only when provided */
  floatingPanel?: ReactNode;
  /** Rendered above the card body (not clipped by overflow-hidden) */
  contextToolbar?: ReactNode;
}

function NodeShellInner({
  name,
  resolution,
  icon,
  selected,
  width,
  height,
  children,
  floatingPanel,
  contextToolbar,
}: NodeShellProps) {
  return (
    <div className="node-shell relative" style={{ overflow: "visible", width: "fit-content" }}>
      {/* Context toolbar — floats above the title row */}
      {contextToolbar}

      {/* Node title + dimensions — always fixed just above the image */}
      <div
        className="nodrag node-floating-ui absolute left-0 flex w-full min-w-0 items-center gap-1 text-fg-muted transition-[transform,opacity] duration-150 ease-out"
        style={{ top: -28, zIndex: 10, width: Math.max(width, 200) }}
      >
        <div className="flex min-w-0 flex-1 cursor-default items-center gap-1">
          <span className="flex shrink-0 items-center">
            {icon ?? <IconImage className="h-3.5 w-3.5" />}
          </span>
          <span
            className="cursor-text truncate text-[13px]"
            title={name}
            style={{ maxWidth: Math.max(80, width - 80) }}
          >
            {name}
          </span>
        </div>
        {resolution && (
          <span className="shrink-0 whitespace-nowrap text-[12px] text-fg-muted/70">
            {resolution}
          </span>
        )}
      </div>

      {/* Image / content card — the main visual body */}
      <div
        className="group overflow-visible"
        style={{ width, height, position: "relative" }}
      >
        <PlusHandle side="left" type="target" id="target" />

        {/* Inner card with border + selection outline */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl"
          style={{
            border: "1px solid var(--canvas-node-border)",
            outline: selected ? "2px solid var(--canvas-node-border-selected)" : "none",
            outlineOffset: -1,
            cursor: "default",
            background: "var(--Surface-Panel-background, #171717)",
          }}
        >
          {children}
        </div>

        <PlusHandle side="right" type="source" id="source" />
      </div>

      {/* Floating panel — separate card below with gap */}
      {floatingPanel && (
        <div style={{ width, height: 0 }}>
          <div
            className="nodrag node-floating-ui nowheel nopan absolute left-1/2 z-20 -translate-x-1/2 origin-top transition-[transform,opacity] duration-150 ease-out"
            style={{ bottom: "auto", top: height + 16 }}
          >
            <div
              className="relative flex w-full flex-col gap-0 overflow-hidden rounded-xl"
              style={{
                background: "var(--Surface-Panel-background, #262626)",
                border: "1px solid var(--canvas-node-border)",
                width: Math.max(width, 400),
              }}
            >
              {floatingPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const NodeShell = memo(NodeShellInner);
