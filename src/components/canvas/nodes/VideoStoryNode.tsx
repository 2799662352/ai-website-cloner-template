"use client";

import { memo, useState, useRef, useCallback, useEffect, type RefObject } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { ShotColumn, StoryboardRow, VideoStoryNodeData } from "@/types/canvas";

function FilmIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
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

function formatCellValue(row: StoryboardRow, field: string): string {
  const v = row[field as keyof StoryboardRow];
  if (v === undefined || v === null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  return String(v);
}

function CellContent({ row, col }: { row: StoryboardRow; col: ShotColumn }) {
  if (col.field === "frameUrl") {
    if (!row.frameUrl) {
      return (
        <span className="text-[11px] text-blue-400 cursor-default">frameUrl</span>
      );
    }
    return (
      <img
        src={row.frameUrl}
        alt=""
        className="h-12 w-20 shrink-0 rounded border border-white/10 object-cover"
        draggable={false}
      />
    );
  }

  return <>{formatCellValue(row, col.field)}</>;
}

const NUMERIC_FIELDS = new Set([
  "shot_number", "start_time", "end_time", "duration",
]);

const SHORT_FIELDS = new Set([
  "shot_size", "camera_angle", "camera_movement",
  "focal_depth", "audio_music", "audio_voice",
]);

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
  // See NodeShell.tsx for the coordinate rationale.
  const baseTranslate = side === "left" ? 25 : -25;

  useEffect(() => {
    const el = iconWrapRef.current;
    if (!el) return;
    el.style.transform = `translate(${baseTranslate}px, 0px) scale(1)`;
    el.style.transition = "transform 0.18s cubic-bezier(0.33, 1, 0.68, 1)";
  }, [iconWrapRef, baseTranslate]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const hit = hitRef.current;
      const icon = iconWrapRef.current;
      if (!hit || !icon) return;
      const r = hit.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) return;
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
    icon.style.transition = "transform 0.12s cubic-bezier(0.33, 1, 0.68, 1)";
  }, [iconWrapRef]);

  const onLeave = useCallback(() => {
    const icon = iconWrapRef.current;
    if (!icon) return;
    icon.style.transition = "transform 0.18s cubic-bezier(0.33, 1, 0.68, 1)";
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

function VideoStoryNodeInner({ id, data, selected }: NodeProps & { data: VideoStoryNodeData }) {
  const w = data.nodeWidth ?? 1000;
  const h = data.nodeHeight ?? 450;
  const rows = data.rows ?? [];
  const shotColumns = data.shotColumns ?? [];
  const [expanded, setExpanded] = useState(false);
  const leftIconRef = useRef<HTMLDivElement>(null);
  const rightIconRef = useRef<HTMLDivElement>(null);

  const actualH = expanded ? h + 250 : h;

  return (
    <div
      className="node-shell relative"
      style={{ overflow: "visible", width: "fit-content" }}
    >
      <PlusHandle side="left" type="target" id="target" iconWrapRef={leftIconRef} />

      <div
        className="overflow-hidden rounded-xl"
        style={{
          width: w,
          height: actualH,
          border: "1px solid var(--canvas-node-border)",
          outline: selected ? "2px solid var(--canvas-node-border-selected)" : "none",
          outlineOffset: -1,
          background: "var(--Surface-Panel-background, #1a1a1a)",
        }}
      >
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <FilmIcon className="mb-3 h-14 w-14 text-fg-muted opacity-20" />
            <p className="text-center text-sm text-fg-muted">连接视频节点以生成分镜</p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-4 py-2.5">
              <FilmIcon className="h-4 w-4 text-fg-muted" />
              <span className="text-[13px] font-medium text-fg-default">视频故事</span>
              <div className="flex-1" />
              <button
                className="nodrag flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-white/10 hover:text-fg-default"
                onClick={() => setExpanded(!expanded)}
                title={expanded ? "收起" : "展开"}
              >
                <ExpandIcon />
              </button>
            </div>

            {/* Scrollable table */}
            <div className="nodrag nowheel min-h-0 flex-1 overflow-auto">
              <table className="w-max min-w-full border-collapse">
                <thead className="sticky top-0 z-[2]">
                  <tr style={{ background: "var(--Surface-Panel-background, #1a1a1a)" }}>
                    {shotColumns.map((col) => (
                      <th
                        key={col.field}
                        className="whitespace-nowrap border-b border-white/[0.08] px-3 py-2 text-left text-[11px] font-medium text-fg-muted/80"
                        scope="col"
                        title={col.description}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.shot_number}-${idx}`}
                      className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                    >
                      {shotColumns.map((col) => {
                        const isNum = NUMERIC_FIELDS.has(col.field);
                        const isShort = SHORT_FIELDS.has(col.field);
                        const isFrame = col.field === "frameUrl";

                        let minW = 80;
                        let maxW = 200;
                        if (isNum) { minW = 40; maxW = 70; }
                        else if (col.field === "shot_number") { minW = 36; maxW = 50; }
                        else if (isShort) { minW = 60; maxW = 120; }
                        else if (isFrame) { minW = 80; maxW = 100; }
                        else if (col.field === "visual_description" || col.field === "content") { minW = 140; maxW = 260; }
                        else if (col.field === "image_generation_prompt" || col.field === "video_motion_prompt") { minW = 160; maxW = 280; }
                        else if (col.field === "lighting") { minW = 80; maxW = 180; }

                        return (
                          <td
                            key={col.field}
                            className={`px-3 py-2.5 align-top text-[11px] leading-relaxed ${
                              isNum ? "tabular-nums text-fg-default" : "text-fg-default"
                            }`}
                            style={{ minWidth: minW, maxWidth: maxW }}
                          >
                            <div className={isFrame ? "" : "whitespace-pre-wrap break-words"}>
                              <CellContent row={row} col={col} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <PlusHandle side="right" type="source" id="source" iconWrapRef={rightIconRef} />
    </div>
  );
}

export const VideoStoryNodeComponent = memo(VideoStoryNodeInner);
