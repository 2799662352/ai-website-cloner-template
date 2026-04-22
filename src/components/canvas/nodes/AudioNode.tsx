"use client";

import { memo, useCallback, useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { AudioNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconSend, IconTranslate, IconChevronDown } from "../icons";
import { cn } from "@/lib/utils";

const WAVEFORM_BARS = [40, 65, 35, 80, 55, 90, 45, 70, 50, 85, 38, 72, 48, 88, 42, 68, 52, 78, 44, 75, 58, 82, 46, 66];

type AudioPanelTab = "upload" | "tts";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function AudioNodeInner({ id, data, selected }: NodeProps & { data: AudioNodeData }) {
  const hasAudio = Array.isArray(data.url) && data.url.length > 0 && data.url[0] !== "";
  const audioSrc = hasAudio ? data.url[0] : "";
  const [panelTab, setPanelTab] = useState<AudioPanelTab>("tts");
  const [ttsText, setTtsText] = useState(data.params?.prompt ?? "");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const contextToolbar = selected && hasAudio ? (
    <div
      className="nodrag node-floating-ui absolute left-1/2 z-30 -translate-x-1/2"
      style={{ top: -62 }}
    >
      <div className="flex items-center gap-0 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-1.5 py-0.5 shadow-lg">
        <button
          type="button"
          onClick={cycleSpeed}
          className="flex h-7 items-center justify-center rounded-lg px-2.5 text-[12px] font-medium tabular-nums text-[rgb(200,200,200)] transition-colors hover:bg-white/10 hover:text-white"
        >
          {speed}x
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[rgb(200,200,200)] transition-colors hover:bg-white/10 hover:text-white"
          title="下载"
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  ) : undefined;

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

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      icon={<AudioIcon />}
      selected={selected}
      width={350}
      height={140}
      floatingPanel={floatingPanel}
      contextToolbar={contextToolbar}
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
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            />
            <div className="flex h-full w-full flex-col justify-center px-4 py-3">
              {/* Waveform with playhead */}
              <div className="relative flex h-16 w-full items-center gap-[1.5px] px-1">
                {WAVEFORM_BARS.map((barH, i) => {
                  const barPct = (i / WAVEFORM_BARS.length) * 100;
                  const played = barPct < progressPct;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-colors"
                      style={{
                        height: `${barH}%`,
                        backgroundColor: played ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                      }}
                    />
                  );
                })}
                {/* Playhead line */}
                <div
                  className="pointer-events-none absolute top-0 h-full w-[2px] bg-red-500"
                  style={{ left: `${progressPct}%` }}
                />
              </div>
              {/* Time + play */}
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="nodrag flex h-6 w-6 items-center justify-center text-white/70 transition-colors hover:text-white"
                >
                  {playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <span className="text-[11px] tabular-nums text-white/50">
                  {fmt(currentTime)} / {fmt(duration || 3)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col px-6 py-3">
            <div className="flex flex-1 items-center justify-center">
              <MusicNoteIcon className="h-12 w-12 text-fg-muted opacity-40" />
            </div>
            <div className="w-full shrink-0">
              <div className="mb-1 text-sm text-fg-muted">尝试：</div>
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

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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
