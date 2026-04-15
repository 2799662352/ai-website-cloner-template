"use client";

import { memo, useCallback, useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { AudioNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconSend, IconTranslate, IconChevronDown } from "../icons";
import { cn } from "@/lib/utils";

const WAVEFORM_BARS = [40, 65, 35, 80, 55, 90, 45, 70, 50, 85, 38, 72, 48, 88, 42, 68, 52, 78, 44, 75, 58, 82, 46, 66];

type AudioPanelTab = "upload" | "tts";

function AudioNodeInner({ id, data, selected }: NodeProps & { data: AudioNodeData }) {
  const hasAudio = Array.isArray(data.url) && data.url.length > 0 && data.url[0] !== "";
  const audioSrc = hasAudio ? data.url[0] : "";
  const [panelTab, setPanelTab] = useState<AudioPanelTab>("tts");
  const [ttsText, setTtsText] = useState(data.params?.prompt ?? "");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      void a.play().catch(() => {});
    }
  }, [playing]);

  const floatingPanel = selected ? (
    <div className="flex min-h-0 w-full flex-col gap-2 p-2">
      <div className="nodrag flex gap-1 border-b border-[var(--canvas-node-border)] pb-2">
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12px] transition-colors",
            panelTab === "upload" ? "bg-white/10 text-fg-default" : "text-fg-muted hover:bg-white/5 hover:text-fg-default",
          )}
          onClick={() => setPanelTab("upload")}
        >
          上传
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12px] transition-colors",
            panelTab === "tts" ? "bg-white/10 text-fg-default" : "text-fg-muted hover:bg-white/5 hover:text-fg-default",
          )}
          onClick={() => setPanelTab("tts")}
        >
          文字转语音
        </button>
      </div>

      {panelTab === "upload" ? (
        <label className="nodrag flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--canvas-node-border)] px-4 py-8 text-center transition-colors hover:border-[var(--canvas-node-border-selected)] hover:bg-white/[0.03]">
          <span className="text-[12px] text-fg-muted">点击或拖拽上传音频</span>
          <span className="text-[11px] text-fg-muted/70">支持常见音频格式</span>
          <input type="file" accept="audio/*" className="sr-only" />
        </label>
      ) : (
        <>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="输入要转换为语音的文字…"
            className="nodrag h-20 w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
            rows={3}
          />
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              className="nodrag flex min-w-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[12px] text-fg-default transition-colors hover:bg-white/5"
            >
              <span className="flex h-3 w-3 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
              </span>
              <span className="truncate">Eleven V3</span>
              <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="nodrag flex h-7 w-7 items-center justify-center text-fg-muted transition-colors hover:text-fg-default"
                title="翻译"
              >
                <IconTranslate className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="nodrag flex h-7 w-7 items-center justify-center rounded-full bg-fg-default text-canvas-bg transition-colors hover:opacity-90"
                title="发送"
              >
                <IconSend className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  ) : undefined;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      icon={<AudioIcon />}
      selected={selected}
      width={350}
      height={350}
      floatingPanel={floatingPanel}
    >
      <div className="relative flex h-full flex-col">
        {hasAudio ? (
          <>
            <audio
              ref={audioRef}
              src={audioSrc}
              className="hidden"
              onEnded={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <div className="flex h-full w-full flex-col justify-end px-4 pb-10 pt-6">
              <div className="flex h-24 w-full items-end justify-center gap-0.5 px-2">
                {WAVEFORM_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-sm bg-fg-muted/35"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={togglePlay}
                className="nodrag pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/70"
                title={playing ? "暂停" : "播放"}
              >
                {playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="mb-4">
              <MusicNoteIcon className="h-16 w-16 text-fg-muted opacity-40" />
            </div>
            <div className="w-full">
              <div className="mb-2 text-sm text-fg-muted">尝试：</div>
              <button
                type="button"
                className="nodrag flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-default hover:bg-[var(--canvas-controls-hover)]"
              >
                <span>→</span>
                <span>音频生视频</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export const AudioNodeComponent = memo(AudioNodeInner);

function AudioIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}
