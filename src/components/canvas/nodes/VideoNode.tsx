"use client";

import { memo, useState, useRef, useCallback, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VideoNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconChevronDown, IconTranslate, IconSend } from "../icons";
import { useCanvasStore } from "@/store/canvas-store";

/* ═══════════════════════════════════════════════════════
   Reusable tiny sub-components (tool buttons, thumbnails)
   ═══════════════════════════════════════════════════════ */

function ToolBtnSmall({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nodrag flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
        active
          ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
          : "border-[var(--canvas-node-border)] text-fg-muted hover:bg-white/5 hover:text-fg-default"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RefThumb({ label, hasOverlay }: { label: string; hasOverlay?: boolean }) {
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--canvas-node-border)] bg-white/5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-center text-[8px] leading-[14px] font-medium text-white">
        {label}
      </span>
      {hasOverlay && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[7px] font-bold text-white">
          1
        </span>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CameraMotionIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 10l6-3v10l-6-3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const VIDEO_TABS = [
  "文生视频", "全能参考", "图生视频", "首尾帧", "视频编辑",
];

const VIDEO_MODELS = [
  { id: "star-video2", name: "Seedance 2.0 VIP", icon: "💛" },
  { id: "seedance-1.5-pro", name: "Seedance 1.5 Pro", icon: "💛" },
  { id: "sora-2", name: "Sora 2", icon: "🟣" },
  { id: "sora-2-pro", name: "Sora 2 Pro", icon: "🟣" },
  { id: "kling-v3-omni", name: "Kling O3", icon: "🔵" },
  { id: "kling-v1-pro", name: "Kling V1 Pro", icon: "🔵" },
  { id: "veo-2", name: "Veo 2", icon: "🟢" },
  { id: "wanx2.7-video", name: "Wan 2.7", icon: "🟠" },
] as const;

const MODEL_MAP: Record<string, string> = Object.fromEntries(
  VIDEO_MODELS.map((m) => [m.id, m.name])
);

const MODEL_ICON_MAP: Record<string, string> = Object.fromEntries(
  VIDEO_MODELS.map((m) => [m.id, m.icon])
);

const RATIO_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const;
const DURATION_OPTIONS = [3, 5, 8, 10, 15, 25] as const;
const QUALITY_OPTIONS = ["480p", "720p", "1080p"] as const;

const QUALITY_LABEL: Record<string, string> = {
  low: "标准",
  "480p": "标准",
  "720p": "高品质",
  high: "高品质",
  "1080p": "超清",
};

function DropdownMenu<T extends string | number>({
  items,
  value,
  onSelect,
  renderItem,
}: {
  items: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  renderItem?: (v: T) => React.ReactNode;
}) {
  return (
    <div
      className="absolute top-full left-0 z-50 mt-2 flex max-h-[260px] flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-white/15 bg-[#1e1e1e] py-1.5 shadow-2xl"
      style={{ minWidth: 180 }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={String(item)}
          type="button"
          onClick={() => onSelect(item)}
          className={`nodrag flex items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/10 ${
            item === value ? "bg-blue-500/10 text-blue-400" : "text-white/80"
          }`}
        >
          {renderItem ? renderItem(item) : String(item)}
          {item === value && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-auto shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          )}
        </button>
      ))}
    </div>
  );
}

const COUNT_OPTIONS = ["1个", "2个", "3个", "4个"] as const;

function VideoNodeInner({ id, data, selected }: NodeProps & { data: VideoNodeData }) {
  const hasVideo = data.url.length > 0 && data.url[0] !== "";
  const [activeTab, setActiveTab] = useState(0);
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");
  const [showTimeline, setShowTimeline] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const currentModel = data.params?.model ?? "star-video2";
  const modelName = MODEL_MAP[currentModel] ?? currentModel;
  const modelIcon = MODEL_ICON_MAP[currentModel] ?? "💛";
  const dur = data.params?.settings.duration ?? 5;
  const ratio = data.params?.settings.ratio ?? "16:9";
  const quality = data.params?.settings.quality ?? "720p";
  const qualityLabel = QUALITY_LABEL[quality] ?? quality;

  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeTools, setActiveTools] = useState<Record<string, boolean>>({});
  const [genCount, setGenCount] = useState("1个");
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!selected) {
      setShowModelMenu(false);
      setShowSettingsMenu(false);
      setShowCountMenu(false);
    }
  }, [selected]);

  const setModel = useCallback((m: string) => {
    updateNodeData(id, { params: { ...data.params!, model: m } });
    setShowModelMenu(false);
  }, [id, data.params, updateNodeData]);

  const setSetting = useCallback((key: string, val: string | number) => {
    updateNodeData(id, {
      params: { ...data.params!, settings: { ...data.params!.settings, [key]: val } },
    });
  }, [id, data.params, updateNodeData]);

  const toggleTool = useCallback((tool: string) => {
    setActiveTools((prev) => ({ ...prev, [tool]: !prev[tool] }));
  }, []);

  const handleSend = useCallback(() => {
    if (sending) return;
    setSending(true);
    setTimeout(() => setSending(false), 1500);
  }, [sending]);

  const handleTranslate = useCallback(() => {
    if (translating) return;
    setTranslating(true);
    setTimeout(() => setTranslating(false), 1200);
  }, [translating]);

  const w = hasVideo ? Math.min(data.contentWidth, 629) : 500;
  const h = hasVideo ? 280 : 350;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.pause();
    else void v.play().catch(() => {});
  }, [playing]);

  const handleDownload = useCallback(() => {
    if (!hasVideo) return;
    const url = data.url[0];
    const filename = `${data.name || "video"}-${data.contentWidth}x${data.contentHeight}.mp4`;
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    fetch(url, { mode: "cors" })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(url, "_blank");
      });
  }, [hasVideo, data.url, data.name, data.contentWidth, data.contentHeight]);

  const handleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void v.requestFullscreen().catch(() => {});
    }
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ── Toolbar (above node) ── */
  const contextToolbar = selected && hasVideo ? (
    <div
      className="nodrag node-floating-ui absolute left-1/2 z-30 -translate-x-1/2"
      style={{ top: -62 }}
    >
      <div className="flex items-center gap-0 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-1 py-0.5 shadow-lg">
        <TBBtn label="剪辑" icon={<ScissorsIcon />} active={showTimeline} onClick={() => { setShowTimeline(!showTimeline); if (!showTimeline) setShowAnalyze(false); }} />
        <TBBtn label="高清" icon={<HDIcon />} disabled title="高清修复 · 即将推出" />
        <TBBtn label="解析" icon={<GridAnalyzeIcon />} active={showAnalyze} onClick={() => { setShowAnalyze(!showAnalyze); if (!showAnalyze) setShowTimeline(false); }} />
        <ToolbarSep />
        <TBIconBtn title="下载" onClick={handleDownload}><DownloadIcon /></TBIconBtn>
        <TBIconBtn title="全屏" onClick={handleFullscreen}><ExpandIcon /></TBIconBtn>
      </div>
    </div>
  ) : undefined;

  /* ── Frame extraction bar (shown when video exists and selected) ── */
  const frameExtractionBar = hasVideo && selected ? (
    <div className="flex items-center gap-2 border-b border-[var(--canvas-node-border)] px-3 py-2">
      <button className="nodrag flex h-6 w-6 items-center justify-center text-fg-muted hover:text-fg-default" title="播放/暂停">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <span className="text-[10px] tabular-nums text-fg-muted">{fmt(currentTime)}</span>
      <div className="nodrag relative flex-1 cursor-pointer" style={{ height: 3 }}>
        <div className="absolute inset-0 rounded-full bg-white/20" />
        <div className="absolute left-0 top-0 h-full rounded-full bg-white/60" style={{ width: `${progressPct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-fg-muted">{fmt(duration || 8)}</span>
      <div className="flex items-center gap-1.5">
        <button className="nodrag whitespace-nowrap rounded-md border border-[var(--canvas-node-border)] px-2 py-0.5 text-[10px] text-fg-muted transition-colors hover:bg-white/5 hover:text-fg-default">
          截取首帧
        </button>
        <button className="nodrag whitespace-nowrap rounded-md border border-[var(--canvas-node-border)] px-2 py-0.5 text-[10px] text-fg-muted transition-colors hover:bg-white/5 hover:text-fg-default">
          截取尾帧
        </button>
      </div>
      <span className="text-[10px] text-fg-muted/60">点击截取当前帧</span>
      <button className="nodrag flex h-5 w-5 items-center justify-center text-fg-muted hover:text-fg-default" title="全屏">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
        </svg>
      </button>
    </div>
  ) : null;

  /* ── Generation panel (below node, when no video or always for controls) ── */
  const controlPanel = selected ? (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-col gap-2 p-3">
        {/* Row 1: Tabs + expand */}
        <div className="flex items-center gap-1">
          <div className="flex flex-1 flex-wrap gap-1">
            {VIDEO_TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`nodrag rounded-lg px-2.5 py-1 text-[12px] transition-colors ${
                  i === activeTab
                    ? "bg-white/10 font-medium text-fg-default"
                    : "text-fg-muted hover:text-fg-default"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            className={`nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
              isExpanded ? "bg-white/10 text-fg-default" : "text-fg-muted hover:bg-white/5 hover:text-fg-default"
            }`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "收起" : "展开"}
          >
            <ExpandIcon />
          </button>
        </div>

        {/* Row 2: Tool buttons + reference thumbnails */}
        <div className="flex items-center gap-1.5">
          <ToolBtnSmall icon={<SearchIcon />} label="标记" active={activeTools.mark} onClick={() => toggleTool("mark")} />
          <ToolBtnSmall icon={<CameraMotionIcon />} label="运镜" active={activeTools.motion} onClick={() => toggleTool("motion")} />
          <ToolBtnSmall icon={<PlusIcon />} label="主体" active={activeTools.subject} onClick={() => toggleTool("subject")} />
          {/* Reference image thumbnails */}
          <div className="flex items-center gap-1 pl-1">
            <RefThumb label="主体1" />
            <RefThumb label="1" hasOverlay />
          </div>
        </div>

        {/* Prompt area */}
        <div className="relative min-h-14 rounded-xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的画面内容，@引用素材"
            className="nodrag h-full w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
            rows={isExpanded ? 8 : 3}
          />
        </div>

        {/* Bottom bar: model + settings + actions */}
        <div className="flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {/* Model selector */}
            <div className="relative">
              <button
                className="nodrag flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[12px] text-white/90 hover:bg-white/8"
                onClick={() => { setShowModelMenu(!showModelMenu); setShowSettingsMenu(false); }}
              >
                <span className="text-[12px]">{modelIcon}</span>
                <span>{modelName}</span>
                <IconChevronDown className="h-3 w-3 shrink-0 text-white/50" />
              </button>
              {showModelMenu && (
                <DropdownMenu
                  items={VIDEO_MODELS.map((m) => m.id)}
                  value={currentModel}
                  onSelect={setModel}
                  renderItem={(mid) => {
                    const m = VIDEO_MODELS.find((v) => v.id === mid);
                    return m ? <><span>{m.icon}</span><span>{m.name}</span></> : mid;
                  }}
                />
              )}
            </div>

            {/* Settings selector (ratio · quality · duration) */}
            <div className="relative">
              <button
                className="nodrag flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[12px] text-white/90 hover:bg-white/8"
                onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowModelMenu(false); }}
              >
                <span>{ratio} · {qualityLabel} · {dur}s</span>
                <IconChevronDown className="h-3 w-3 shrink-0 text-white/50" />
              </button>
              {showSettingsMenu && (
                <div
                  className="absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-xl border border-white/15 bg-[#1e1e1e] p-3.5 shadow-2xl"
                  style={{ minWidth: 260 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Ratio */}
                  <div className="mb-3">
                    <div className="mb-1.5 text-[11px] font-medium text-white/60">比例</div>
                    <div className="flex flex-wrap gap-1.5">
                      {RATIO_OPTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSetting("ratio", r)}
                          className={`nodrag rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            ratio === r
                              ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                              : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                  {/* Quality */}
                  <div className="mb-3">
                    <div className="mb-1.5 text-[11px] font-medium text-white/60">清晰度</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUALITY_OPTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => setSetting("quality", q)}
                          className={`nodrag rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            quality === q || (quality === "low" && q === "480p") || (quality === "high" && q === "720p")
                              ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                              : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >{q} {QUALITY_LABEL[q]}</button>
                      ))}
                    </div>
                  </div>
                  {/* Duration */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-medium text-white/60">时长</div>
                    <div className="flex flex-wrap gap-1.5">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setSetting("duration", d)}
                          className={`nodrag rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            dur === d
                              ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                              : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >{d}s</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              className={`nodrag flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] transition-colors ${
                activeTools.storyboard
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-fg-muted hover:bg-white/5 hover:text-fg-default"
              }`}
              onClick={() => toggleTool("storyboard")}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              <span>智能分镜</span>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className={`nodrag flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${
                translating ? "animate-pulse text-blue-400" : "text-fg-muted hover:text-fg-default"
              }`}
              title="翻译提示词"
              onClick={handleTranslate}
            >
              <IconTranslate />
            </button>
            <div className="relative">
              <button
                className="nodrag flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md px-1 text-[10px] text-fg-default hover:bg-white/5"
                onClick={() => { setShowCountMenu(!showCountMenu); setShowModelMenu(false); setShowSettingsMenu(false); }}
              >
                <span>{genCount}</span>
                <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
              </button>
              {showCountMenu && (
                <DropdownMenu
                  items={COUNT_OPTIONS}
                  value={genCount}
                  onSelect={(v) => { setGenCount(v); setShowCountMenu(false); }}
                />
              )}
            </div>
            <span className="flex items-center gap-0.5 px-1 text-[10px] tabular-nums text-fg-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" /></svg>
              88
            </span>
            <button
              className={`nodrag flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                sending
                  ? "scale-95 bg-blue-500 text-white"
                  : "bg-fg-default text-canvas-bg hover:opacity-90"
              }`}
              onClick={handleSend}
              title="生成视频"
            >
              {sending ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <IconSend className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  /* ── Timeline editor panel ── */
  const timelinePanel = showTimeline ? (
    <TimelineEditor onClose={() => setShowTimeline(false)} duration={duration || 8} />
  ) : null;

  const floatingPanel = (timelinePanel || controlPanel || frameExtractionBar) ? (
    <>
      {frameExtractionBar}
      {!showTimeline && controlPanel}
      {timelinePanel}
    </>
  ) : undefined;

  return (
    <>
    <NodeShell
      nodeId={id}
      name={data.name}
      resolution={data.contentWidth && data.contentHeight ? `${data.contentWidth} × ${data.contentHeight}` : undefined}
      icon={<VideoIcon />}
      selected={selected}
      width={w}
      height={h}
      floatingPanel={floatingPanel}
      contextToolbar={contextToolbar}
    >
      {hasVideo ? (
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            src={data.url[0]}
            poster={data.poster || undefined}
            className="h-full w-full object-cover"
            controls={false}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          />
          {/* Transport bar overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
            <button
              type="button"
              onClick={togglePlay}
              className="nodrag flex h-6 w-6 items-center justify-center text-white/80 hover:text-white"
            >
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-[10px] tabular-nums text-white/60">{fmt(currentTime)}</span>
            {/* Progress bar */}
            <div className="nodrag relative flex-1 cursor-pointer" style={{ height: 3 }}>
              <div className="absolute inset-0 rounded-full bg-white/20" />
              <div className="absolute left-0 top-0 h-full rounded-full bg-white/80" style={{ width: `${progressPct}%` }} />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `${progressPct}%`, marginLeft: -5 }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-white/60">{fmt(duration || 8)}</span>
            <button className="nodrag flex h-5 w-5 items-center justify-center text-white/50 hover:text-white" title="全屏">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <VideoIcon className="h-16 w-16 text-fg-muted opacity-20" />
        </div>
      )}
    </NodeShell>
    {showAnalyze && (
      <div
        className="nodrag nopan absolute left-full top-0 z-30 ml-3"
        style={{ width: 420 }}
      >
        <AnalyzePanel onClose={() => setShowAnalyze(false)} />
      </div>
    )}
    </>
  );
}

export const VideoNodeComponent = memo(VideoNodeInner);

/* ═══════════════════════════════════════════════════════
   Timeline Editor (shown when 剪辑 is clicked)
   ═══════════════════════════════════════════════════════ */

function TimelineEditor({ onClose, duration }: { onClose: () => void; duration: number }) {
  const [clipStart] = useState(0);
  const [clipEnd] = useState(duration);
  const clipDuration = (clipEnd - clipStart).toFixed(2);

  const thumbCount = 10;

  return (
    <div className="nodrag nopan flex w-full flex-col" style={{ backgroundColor: "rgb(38,38,38)" }}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <button className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        {/* Thumbnail strip */}
        <div className="flex flex-1 items-center gap-0 overflow-hidden rounded-md" style={{ height: 32 }}>
          <div className="flex h-full items-center rounded-md border border-blue-400/50 bg-blue-500/10" style={{ minWidth: 80 }}>
            <span className="px-2 text-[11px] font-medium tabular-nums text-white/80">{clipDuration} s</span>
          </div>
          {Array.from({ length: thumbCount - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{ backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)" }}
            />
          ))}
        </div>
        {/* Right controls */}
        <button className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
        <button className="flex h-6 w-6 items-center justify-center rounded text-white/50 hover:bg-white/10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90"
          title="确认"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Analyze Panel (shown when 解析 is clicked)
   ═══════════════════════════════════════════════════════ */

const ANALYZE_COLS = ["镜头编号", "镜头时间", "镜头描述时间", "时长", "画面描述"];
const ANALYZE_ROWS = [
  { id: 1, time: "0", desc: "2.9", dur: "2.9", text: "暗夜深处的一条冷峻街头，一名穿着未来东方风格的女子站在雾气弥漫的街道上，稍微带一点雾面和颗粒感的画面感，真实镜头感" },
  { id: 2, time: "3", desc: "5.9", dur: "2.9", text: "顺序角色的漫步特写视角，以未来东方场景为主题的一个有故事感的mv，人物神态保持酷感和冷感" },
  { id: 3, time: "6", desc: "7.5", dur: "1.5", text: "大面积花瓣飘零，稍微带一点雾面和颗粒感的画面感，在不同的镜头和机位之间切换" },
];

function AnalyzePanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--canvas-node-border)] shadow-2xl"
      style={{
        maxHeight: 320,
        backgroundColor: "var(--Surface-Panel-background, rgb(30,30,30))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-[12px] font-medium text-fg-default">视效拆解</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-fg-muted hover:bg-white/10 hover:text-fg-default"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {/* Table */}
      <div className="flex-1 overflow-auto text-[11px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              {ANALYZE_COLS.map((col) => (
                <th key={col} className="px-2 py-1.5 text-left font-medium text-fg-muted">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ANALYZE_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                <td className="px-2 py-1.5 tabular-nums text-fg-muted">{row.id}</td>
                <td className="px-2 py-1.5 tabular-nums text-red-400">{row.time}</td>
                <td className="px-2 py-1.5 tabular-nums text-fg-default">{row.desc}</td>
                <td className="px-2 py-1.5 tabular-nums text-fg-default">{row.dur}</td>
                <td className="max-w-[180px] truncate px-2 py-1.5 text-fg-default">{row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Toolbar sub-components
   ═══════════════════════════════════════════════════════ */

function TBBtn({ label, icon, active, onClick, disabled, title }: { label: string; icon?: React.ReactNode; active?: boolean; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? (disabled ? "功能即将推出" : undefined)}
      aria-label={label}
      aria-disabled={disabled}
      className={`nodrag flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-[rgb(200,200,200)] enabled:hover:bg-white/10 enabled:hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {icon}
      {label}
    </button>
  );
}

function TBIconBtn({ title, children, onClick, disabled, ariaLabel }: { title: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="nodrag flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(200,200,200)] transition-colors enabled:hover:bg-white/10 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      title={title}
      aria-label={ariaLabel ?? title}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="mx-0.5 h-4 w-px bg-white/10" />;
}

function Sel({ value, small, icon }: { value: string; small?: boolean; icon?: string }) {
  return (
    <button className={`nodrag flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md text-fg-default hover:bg-white/5 ${small ? "px-1 text-[10px]" : "px-1.5 py-0.5 text-[11px]"}`}>
      {icon && <span className="text-[11px]">{icon}</span>}
      <span>{value}</span>
      <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════ */

function VideoIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function HDIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="4" width="18" height="12" rx="2" />
      <path d="M6 8v4M6 10h3M9 8v4M13 8v2a2 2 0 0 1-2 2h0" />
    </svg>
  );
}

function GridAnalyzeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
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
