"use client";

import { useRef, useCallback, memo } from "react";

interface CSS3DGlobeProps {
  horizontal: number;
  vertical: number;
  onRotate?: (h: number, v: number) => void;
  width?: number;
  height?: number;
  imageUrl?: string;
}

const CUBE = 80;
const HALF = CUBE / 2;
const SPHERE = 190;
const SPHERE_HALF = SPHERE / 2;

const MERIDIANS = Array.from({ length: 12 }, (_, i) => i * 15);

function CSS3DGlobeInner({
  horizontal,
  vertical,
  onRotate,
  width = 240,
  height = 240,
  imageUrl,
}: CSS3DGlobeProps) {
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const valuesRef = useRef({ h: horizontal, v: vertical });
  valuesRef.current = { h: horizontal, v: vertical };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.dragging || !onRotate) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      const { h, v } = valuesRef.current;
      const newH = Math.max(0, Math.min(315, h + dx * 0.8));
      const newV = Math.max(-30, Math.min(60, v - dy * 0.5));
      onRotate(Math.round(newH), Math.round(newV));
    },
    [onRotate],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const sceneRotation = `rotateX(${vertical}deg) rotateY(${horizontal}deg)`;

  return (
    <div
      className="unified-scene mode-camera"
      style={{
        width,
        height,
        perspective: 1200,
        cursor: "grab",
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        backgroundColor: "#1a1a1a",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Sphere grid - behind cube */}
      <div
        className="angle-editor-sphere-grid"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="angle-editor-sphere-grid-inner"
          style={{
            transformStyle: "preserve-3d",
            transform: sceneRotation,
            transition: "transform 0.1s ease-out",
          }}
        >
          {/* Equator (horizontal great circle) */}
          <div
            style={{
              position: "absolute",
              width: SPHERE,
              height: SPHERE,
              left: -SPHERE_HALF,
              top: -SPHERE_HALF,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)",
              transformStyle: "preserve-3d",
              transform: "rotateX(90deg)",
            }}
          />
          {/* Latitude lines */}
          {[-60, -30, 30, 60].map((lat) => {
            const r = SPHERE_HALF * Math.cos((lat * Math.PI) / 180);
            const yOff = SPHERE_HALF * Math.sin((lat * Math.PI) / 180);
            return (
              <div
                key={`lat-${lat}`}
                style={{
                  position: "absolute",
                  width: r * 2,
                  height: r * 2,
                  left: -r,
                  top: -r,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.08)",
                  transformStyle: "preserve-3d",
                  transform: `translateY(${-yOff}px) rotateX(90deg)`,
                }}
              />
            );
          })}
          {/* Meridian lines (longitude) - every 15° */}
          {MERIDIANS.map((angle) => (
            <div
              key={`m-${angle}`}
              className="angle-editor-sphere-grid-meridian"
              style={{
                position: "absolute",
                width: SPHERE,
                height: SPHERE,
                left: -SPHERE_HALF,
                top: -SPHERE_HALF,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.12)",
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 3D Cube */}
      <div
        className="angle-editor-cube-wrapper"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `scale(1.25) ${sceneRotation}`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <div
          className="angle-editor-cube"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <CubeFace face="front" imageUrl={imageUrl} />
          <CubeFace face="back" label="B" />
          <CubeFace face="right" label="R" />
          <CubeFace face="left" label="L" />
          <CubeFace face="top" label="T" />
          <CubeFace face="bottom" label="B" />
        </div>
      </div>
    </div>
  );
}

const FACE_TRANSFORM: Record<string, string> = {
  front: `translateZ(${HALF}px)`,
  back: `rotateY(180deg) translateZ(${HALF}px)`,
  right: `rotateY(90deg) translateZ(${HALF}px)`,
  left: `rotateY(-90deg) translateZ(${HALF}px)`,
  top: `rotateX(90deg) translateZ(${HALF}px)`,
  bottom: `rotateX(-90deg) translateZ(${HALF}px)`,
};

function CubeFace({ face, label, imageUrl }: { face: string; label?: string; imageUrl?: string }) {
  const isFront = face === "front";

  return (
    <div
      className={`angle-editor-cube-face angle-editor-face-${face}`}
      style={{
        position: "absolute",
        width: CUBE,
        height: CUBE,
        left: -HALF,
        top: -HALF,
        transform: FACE_TRANSFORM[face],
        backfaceVisibility: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isFront
          ? "rgba(51, 51, 51, 0.95)"
          : "rgba(38, 38, 38, 0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.35)",
        fontSize: 16,
        fontWeight: 500,
        overflow: "hidden",
      }}
    >
      {isFront ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
        ) : (
          <ImageIcon />
        )
      ) : (
        label
      )}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export const ThreeGlobe = memo(CSS3DGlobeInner);
