"use client";

import {
  memo,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { Handle, Position } from "@xyflow/react";
import { IconImage } from "../icons";

/**
 * LibTV-style "+" handle.
 *
 * Layout (matches liblib.tv DOM 1:1):
 *
 *   <Handle>                            ← React Flow connection anchor, 0x0
 *     <hitarea 80x80>                   ← fixed, extends OUTSIDE the node edge
 *       <iconWrap 20x20>                ← animated, translate+scale
 *         <svg plus 20x20 viewBox/>     ← the visual plus
 *
 * Resting state:  translate(±25, 0)                   → plus sits 15px outside node edge
 * Hover state:    scale(1.1) translate(~0, mouseYoff) → plus pops to 40px outside,
 *                                                      scales up, Y-tracks mouse 1:1
 *                                                      clamped to hitarea bounds
 */
function PlusHandle({
  side,
  type,
  id,
  iconWrapRef,
}: {
  side: "left" | "right";
  type: "source" | "target";
  id: string;
  iconWrapRef: RefObject<HTMLDivElement | null>;
}) {
  const position = side === "left" ? Position.Left : Position.Right;
  const hitRef = useRef<HTMLDivElement>(null);
  // Positive X pulls the icon inward (toward the node center) from the hitarea
  // center. Since the hitarea center sits 40px OUTSIDE the node edge, a +25
  // translate leaves the icon 15px outside the edge — matches LibTV exactly.
  const baseTranslate = side === "left" ? 25 : -25;

  // Apply default transform (resting position) once.
  useEffect(() => {
    const el = iconWrapRef.current;
    if (!el) return;
    el.style.transform = `translate(${baseTranslate}px, 0px) scale(1)`;
    el.style.transition =
      "transform 0.18s cubic-bezier(0.33, 1, 0.68, 1)";
  }, [iconWrapRef, baseTranslate]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const hit = hitRef.current;
      const icon = iconWrapRef.current;
      if (!hit || !icon) return;
      const r = hit.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) return;
      // LibTV tracks the mouse in both axes — the icon can be at any point
      // inside the hitarea, pivoting around its center. Screen-pixel offsets
      // are written directly into the CSS translate so the icon parallaxes
      // with the viewport's zoom, matching LibTV exactly.
      const localX = e.clientX - (r.left + r.width / 2);
      const localY = e.clientY - (r.top + r.height / 2);
      const clampedX = Math.max(-r.width / 2, Math.min(r.width / 2, localX));
      const clampedY = Math.max(-r.height / 2, Math.min(r.height / 2, localY));
      icon.style.transition = "none";
      icon.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(1.1)`;
    },
    [iconWrapRef],
  );

  const onEnter = useCallback(() => {
    const icon = iconWrapRef.current;
    if (!icon) return;
    icon.style.transition =
      "transform 0.12s cubic-bezier(0.33, 1, 0.68, 1)";
  }, [iconWrapRef]);

  const onLeave = useCallback(() => {
    const icon = iconWrapRef.current;
    if (!icon) return;
    icon.style.transition =
      "transform 0.18s cubic-bezier(0.33, 1, 0.68, 1)";
    icon.style.transform = `translate(${baseTranslate}px, 0px) scale(1)`;
  }, [iconWrapRef, baseTranslate]);

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
        background: "transparent",
        border: "none",
        zIndex: 20,
        top: "50%",
        transform: "translateY(-50%)",
        ...(side === "left" ? { left: 0 } : { right: 0 }),
      }}
    >
      <div
        ref={hitRef}
        className="canvas-plus-handle__hitarea"
        style={{
          position: "absolute",
          width: 80,
          height: 80,
          top: 0,
          transform: "translateY(-40px)",
          pointerEvents: "auto",
          ...(side === "left"
            ? { left: -80, right: 0 }
            : { left: 0, right: -80 }),
        }}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div
          ref={iconWrapRef}
          className="canvas-plus-handle__btn"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 20,
            height: 20,
            marginTop: -10,
            marginLeft: -10,
            willChange: "transform",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ display: "block", overflow: "visible" }}
          >
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
  const leftIconRef = useRef<HTMLDivElement>(null);
  const rightIconRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="node-shell relative"
      style={{ overflow: "visible", width: "fit-content" }}
    >
      {contextToolbar}

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

      <div
        className="group overflow-visible"
        style={{ width, height, position: "relative" }}
      >
        <PlusHandle
          side="left"
          type="target"
          id="target"
          iconWrapRef={leftIconRef}
        />

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

        <PlusHandle
          side="right"
          type="source"
          id="source"
          iconWrapRef={rightIconRef}
        />
      </div>

      {/* Floating panel — separate card below with gap */}
      {floatingPanel && (
        <div style={{ width, height: 0 }}>
          <div
            className="nodrag node-floating-ui nowheel nopan absolute left-1/2 z-20 -translate-x-1/2 origin-top transition-[transform,opacity] duration-150 ease-out"
            style={{ bottom: "auto", top: height + 16 }}
          >
            <div
              className="relative flex w-full flex-col gap-0 rounded-xl"
              style={{
                background: "var(--Surface-Panel-background, #262626)",
                border: "1px solid var(--canvas-node-border)",
                width: Math.max(width, 420),
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
