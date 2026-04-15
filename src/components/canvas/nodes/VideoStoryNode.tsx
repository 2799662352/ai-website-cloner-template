"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { ShotColumn, StoryboardRow, VideoStoryNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";

function FilmIcon({ className = "h-16 w-16" }: { className?: string }) {
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

function formatCellValue(row: StoryboardRow, field: string): string {
  const v = row[field as keyof StoryboardRow];
  if (v === undefined || v === null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function CellContent({
  row,
  col,
}: {
  row: StoryboardRow;
  col: ShotColumn;
}) {
  if (col.field === "frameUrl") {
    if (!row.frameUrl) {
      return <span className="text-fg-muted">—</span>;
    }
    return (
      <img
        src={row.frameUrl}
        alt=""
        className="h-10 w-[72px] shrink-0 rounded border border-[var(--canvas-node-border)] object-cover"
        draggable={false}
      />
    );
  }

  const text = formatCellValue(row, col.field);
  return (
    <span className="text-fg-default" title={text}>
      {text}
    </span>
  );
}

function VideoStoryNodeInner({ id, data, selected }: NodeProps & { data: VideoStoryNodeData }) {
  const w = data.nodeWidth ?? 800;
  const h = data.nodeHeight ?? 400;
  const rows = data.rows ?? [];
  const shotColumns = data.shotColumns ?? [];
  const showThumbColumn = !shotColumns.some((c) => c.field === "frameUrl");

  const resolution = `${w} × ${h}`;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      resolution={resolution}
      icon={<FilmIcon className="h-3.5 w-3.5" />}
      selected={selected}
      width={w}
      height={h}
    >
      {rows.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="mb-4">
            <FilmIcon className="h-16 w-16 text-fg-muted opacity-30" />
          </div>
          <p className="text-center text-sm text-fg-muted">连接视频节点以生成分镜</p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 w-full flex-col bg-[var(--canvas-node-bg)]">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-max min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--canvas-node-border)] bg-[var(--canvas-node-bg)]">
                  {showThumbColumn && (
                    <th
                      className="sticky left-0 z-[1] whitespace-nowrap bg-[var(--canvas-node-bg)] px-2 py-2 text-fg-muted"
                      scope="col"
                    >
                      预览
                    </th>
                  )}
                  {shotColumns.map((col) => (
                    <th
                      key={col.field}
                      className="whitespace-nowrap px-2 py-2 text-fg-muted"
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
                    className="border-b border-[var(--canvas-node-border)]/60 hover:bg-[var(--Surface-Panel-background)]/80"
                  >
                    {showThumbColumn && (
                      <td className="sticky left-0 z-[1] bg-[var(--Surface-Panel-background)] px-2 py-1.5 align-middle">
                        {row.frameUrl ? (
                          <img
                            src={row.frameUrl}
                            alt=""
                            className="h-10 w-[72px] rounded border border-[var(--canvas-node-border)] object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="h-10 w-[72px] rounded border border-dashed border-[var(--canvas-node-border)] bg-[var(--canvas-node-bg)]/50" />
                        )}
                      </td>
                    )}
                    {shotColumns.map((col) => (
                      <td
                        key={col.field}
                        className="max-w-[min(280px,40vw)] px-2 py-1.5 align-middle text-fg-default"
                      >
                        <div className={col.field === "frameUrl" ? "" : "truncate"}>
                          <CellContent row={row} col={col} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </NodeShell>
  );
}

export const VideoStoryNodeComponent = memo(VideoStoryNodeInner);
