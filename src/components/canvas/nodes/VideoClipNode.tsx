"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VideoClipNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";

function ScissorsIcon({ className = "h-16 w-16" }: { className?: string }) {
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
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function VideoClipNodeInner({ id, data, selected }: NodeProps & { data: VideoClipNodeData }) {
  const hasVideo = data.url.length > 0 && data.url[0] !== "";
  const src = hasVideo ? data.url[0] : "";

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      icon={<ScissorsIcon className="h-3.5 w-3.5" />}
      selected={selected}
      width={350}
      height={350}
    >
      {hasVideo ? (
        <div className="h-full w-full bg-[var(--canvas-node-bg)]">
          <video
            src={src}
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="mb-4">
            <ScissorsIcon className="h-16 w-16 text-fg-muted opacity-30" />
          </div>
          <p className="text-center text-sm text-fg-muted">空空如也，请连接多个视频节点后操作</p>
        </div>
      )}
    </NodeShell>
  );
}

export const VideoClipNodeComponent = memo(VideoClipNodeInner);
