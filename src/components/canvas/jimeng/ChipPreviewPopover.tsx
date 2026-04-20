import React, { useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MediaReference } from './mediaTypes';

interface ChipPreviewPopoverProps {
  visible: boolean;
  mediaRef: MediaReference | null;
  anchorRect: DOMRect | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ImagePreview({ mediaRef }: { mediaRef: MediaReference }) {
  const src = mediaRef.url || mediaRef.thumbnail;
  if (!src) return null;
  return (
    <div className="chip-preview-content">
      <img src={src} alt={mediaRef.label || `图片${mediaRef.index}`} className="chip-preview-image" />
      <div className="chip-preview-label">🖼 {mediaRef.label || `图片${mediaRef.index}`}</div>
    </div>
  );
}

function VideoPreview({ mediaRef }: { mediaRef: MediaReference }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [remaining, setRemaining] = useState(mediaRef.duration ?? 0);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    setRemaining(Math.max(0, v.duration - v.currentTime));
  }, []);

  const src = mediaRef.url;
  if (!src) {
    const thumbSrc = mediaRef.thumbnail;
    if (!thumbSrc) return null;
    return (
      <div className="chip-preview-content">
        <img src={thumbSrc} alt="" className="chip-preview-image" />
        <div className="chip-preview-label">🎬 {mediaRef.label || `视频${mediaRef.index}`}</div>
      </div>
    );
  }

  return (
    <div className="chip-preview-content">
      <video
        ref={videoRef} src={src} poster={mediaRef.thumbnail}
        autoPlay loop muted playsInline className="chip-preview-video"
        onTimeUpdate={handleTimeUpdate}
      />
      {remaining > 0 && <div className="chip-preview-duration">{formatTime(remaining)}</div>}
      <div className="chip-preview-label">🎬 {mediaRef.label || `视频${mediaRef.index}`}</div>
    </div>
  );
}

function AudioPreview({ mediaRef }: { mediaRef: MediaReference }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDur, setResolvedDur] = useState(mediaRef.duration ?? 0);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play().catch(() => {});
    setPlaying(!playing);
  }, [playing]);

  return (
    <div className="chip-preview-content chip-preview-audio-content">
      {mediaRef.url && (
        <audio
          ref={audioRef} src={mediaRef.url} preload="metadata"
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }}
          onLoadedMetadata={() => { const a = audioRef.current; if (a && Number.isFinite(a.duration)) setResolvedDur(prev => prev || a.duration); }}
        />
      )}
      <button className="chip-preview-play-btn" onClick={togglePlay} type="button">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="chip-preview-progress-track">
        <div className="chip-preview-progress-fill" style={{ width: `${resolvedDur > 0 ? (currentTime / resolvedDur) * 100 : 0}%` }} />
      </div>
      <span className="chip-preview-time">{formatTime(currentTime)} / {formatTime(resolvedDur)}</span>
      <div className="chip-preview-label">🎵 {mediaRef.label || mediaRef.fileName || `音频${mediaRef.index}`}</div>
    </div>
  );
}

const GAP = 8;

export const ChipPreviewPopover: React.FC<ChipPreviewPopoverProps> = ({
  visible, mediaRef, anchorRect, onMouseEnter, onMouseLeave,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, above: false });
  const [mounted, setMounted] = useState(false);
  // Keep the last non-null inputs so closing animation can still render the previous content.
  const [lastMedia, setLastMedia] = useState<MediaReference | null>(mediaRef);
  const [lastAnchor, setLastAnchor] = useState<DOMRect | null>(anchorRect);

  useEffect(() => {
    // Cache the last non-null value so the fade-out can still render the previous content.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mediaRef) setLastMedia(mediaRef);
  }, [mediaRef]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (anchorRect) setLastAnchor(anchorRect);
  }, [anchorRect]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 160);
    return () => clearTimeout(t);
  }, [visible]);

  useLayoutEffect(() => {
    if (!mounted || !lastAnchor || !popoverRef.current) return;
    const { width: pw, height: ph } = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const sx = window.scrollX, sy = window.scrollY;

    let x = lastAnchor.left + sx + lastAnchor.width / 2 - pw / 2;
    let y = lastAnchor.bottom + sy + GAP;
    let above = false;
    if (lastAnchor.bottom + GAP + ph > vh) { y = lastAnchor.top + sy - ph - GAP; above = true; }
    if (x < sx + 4) x = sx + 4;
    if (x + pw > sx + vw - 4) x = sx + vw - 4 - pw;
    // Measure-then-position is the canonical useLayoutEffect pattern; the lint
    // rule is overly strict here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos({ x, y, above });
  }, [mounted, visible, lastAnchor]);

  if (!mounted || !lastMedia || !lastAnchor) return null;

  const content = lastMedia.type === 'image' ? <ImagePreview mediaRef={lastMedia} />
    : lastMedia.type === 'video' ? <VideoPreview mediaRef={lastMedia} />
    : lastMedia.type === 'audio' ? <AudioPreview mediaRef={lastMedia} />
    : null;

  return createPortal(
    <div
      ref={popoverRef}
      className={`chip-preview-popover ${visible ? 'chip-preview-visible' : ''} ${pos.above ? 'chip-preview-above' : ''}`}
      style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    >
      {content}
    </div>,
    document.body
  );
};

ChipPreviewPopover.displayName = 'ChipPreviewPopover';
