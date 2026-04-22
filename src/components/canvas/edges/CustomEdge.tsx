"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";
import { useCanvasStore } from "@/store/canvas-store";

const ACCENT = "rgb(54, 181, 240)";

function safeSvgFragment(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * LibTV-style flowing-beam overlay.
 * Matches liblib.tv's exact DOM/attribute values:
 *  - 3 beams (13 samples, length 110, speed 0.28)
 *  - stroke-width 4, gradient rgba(100,180,255) 0 -> 0.9
 *  - Shared filter with stdDev 4 + rgba(100,180,255,0.45) outer
 *    and stdDev 1.5 + rgba(150,210,255,0.7) inner glow
 *  - filterUnits="userSpaceOnUse" with absolute bbox so the glow
 *    isn't clipped by the SVG viewport.
 */
function EdgeFlowOverlay({
  uid,
  edgePath,
  beamCount = 3,
  beamLength = 110,
  samplesPerBeam = 13,
  speed = 0.28,
}: {
  uid: string;
  edgePath: string;
  beamCount?: number;
  beamLength?: number;
  samplesPerBeam?: number;
  speed?: number;
}) {
  const measureRef = useRef<SVGPathElement>(null);
  const beamRefs = useRef<(SVGPathElement | null)[]>([]);
  const gradRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
  const filterRef = useRef<SVGFilterElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;
    const total = measure.getTotalLength();
    if (total <= 0) return;

    // Compute the path bbox in user space and set the filter region to
    // cover it with some padding. Matches LibTV's filter layout.
    const bbox = measure.getBBox();
    const pad = 20;
    const filter = filterRef.current;
    if (filter) {
      filter.setAttribute("x", `${bbox.x - pad}`);
      filter.setAttribute("y", `${bbox.y - pad}`);
      filter.setAttribute("width", `${bbox.width + pad * 2}`);
      filter.setAttribute("height", `${bbox.height + pad * 2}`);
    }

    // Sample a beam so that it cleanly enters at the path start and exits at
    // the path end — NEVER wrap around (which would draw a straight line from
    // the end back to the start). Any sample that falls outside [0, total] is
    // omitted; if too few points remain, the beam is hidden for that frame.
    const sampleBeam = (tailLen: number) => {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < samplesPerBeam; i++) {
        const t = i / (samplesPerBeam - 1);
        const at = tailLen + t * beamLength;
        if (at < 0 || at > total) continue;
        const p = measure.getPointAtLength(at);
        pts.push({ x: p.x, y: p.y });
      }
      return pts;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      progressRef.current = (progressRef.current + speed * dt) % 1;

      for (let i = 0; i < beamCount; i++) {
        // Head travels from 0 -> total + beamLength across one cycle so the
        // beam fully enters at the start and fully exits at the end.
        const phase = (progressRef.current + i / beamCount) % 1;
        const headLen = phase * (total + beamLength);
        const tailLen = headLen - beamLength;
        const pts = sampleBeam(tailLen);

        const beam = beamRefs.current[i];
        const grad = gradRefs.current[i];

        if (pts.length < 2) {
          if (beam) beam.setAttribute("d", "");
          continue;
        }

        if (beam) {
          const d =
            `M ${pts[0].x},${pts[0].y}` +
            pts
              .slice(1)
              .map((p) => ` L ${p.x},${p.y}`)
              .join("");
          beam.setAttribute("d", d);
        }
        if (grad) {
          const head = pts[pts.length - 1];
          const tail = pts[0];
          grad.setAttribute("x1", `${tail.x}`);
          grad.setAttribute("y1", `${tail.y}`);
          grad.setAttribute("x2", `${head.x}`);
          grad.setAttribute("y2", `${head.y}`);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame((t) => {
      lastRef.current = t;
      frame(t);
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [edgePath, beamCount, beamLength, samplesPerBeam, speed]);

  const filterId = `edge-flow-filter-${uid}`;

  return (
    <g className="edge-flow-segments" style={{ pointerEvents: "none" }}>
      <defs>
        <filter
          id={filterId}
          ref={filterRef}
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1"
          height="1"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="4"
            result="blurOuter"
          />
          <feFlood
            floodColor="rgba(100, 180, 255, 0.45)"
            result="floodOuter"
          />
          <feComposite
            in="blurOuter"
            in2="floodOuter"
            operator="in"
            result="glowOuter"
          />
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="1.5"
            result="blurInner"
          />
          <feFlood
            floodColor="rgba(150, 210, 255, 0.7)"
            result="floodInner"
          />
          <feComposite
            in="blurInner"
            in2="floodInner"
            operator="in"
            result="glowInner"
          />
          <feMerge>
            <feMergeNode in="glowOuter" />
            <feMergeNode in="glowInner" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hidden reference path used to sample points + compute bbox */}
      <path
        ref={measureRef}
        d={edgePath}
        fill="none"
        stroke="none"
        style={{ visibility: "hidden" }}
      />

      {Array.from({ length: beamCount }).map((_, i) => {
        const gradId = `edge-flow-grad-${uid}-${i}`;
        return (
          <g key={i}>
            <defs>
              <linearGradient
                id={gradId}
                ref={(el) => {
                  gradRefs.current[i] = el;
                }}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="rgba(100, 180, 255, 0)" />
                <stop offset="100%" stopColor="rgba(100, 180, 255, 0.9)" />
              </linearGradient>
            </defs>
            <path
              ref={(el) => {
                beamRefs.current[i] = el;
              }}
              d=""
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${filterId})`}
            />
          </g>
        );
      })}
    </g>
  );
}

function CustomEdgeInner({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
}: EdgeProps) {
  const reactId = useId();
  const uid = useMemo(() => safeSvgFragment(`${id}_${reactId}`), [id, reactId]);
  const [hovered, setHovered] = useState(false);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);

  const endpointSelected = useMemo(
    () => selectedNodeIds.includes(source) || selectedNodeIds.includes(target),
    [selectedNodeIds, source, target],
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEdge(id);
    },
    [id, deleteEdge],
  );

  // When an endpoint node is selected, render the exact LibTV layout:
  // hit-area + single thin base line + flowing beams. Nothing else.
  if (endpointSelected) {
    return (
      <g
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Wide hit area (matches LibTV: stroke-width 20) */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="react-flow__edge-interaction"
          style={{ cursor: "pointer" }}
        />

        {/* Single thin grey base line — matches LibTV */}
        <path
          d={edgePath}
          fill="none"
          stroke="var(--canvas-edge-hover, rgba(255,255,255,0.22))"
          strokeWidth={2}
          style={{
            transition: "stroke 200ms, stroke-width 200ms",
            pointerEvents: "none",
          }}
        />

        {/* Flowing beams */}
        <EdgeFlowOverlay uid={uid} edgePath={edgePath} />

        {hovered && (
          <foreignObject
            x={labelX - 14}
            y={labelY - 14}
            width={28}
            height={28}
            className="pointer-events-auto overflow-visible"
          >
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/95 text-[15px] leading-none text-white shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform hover:scale-105 hover:border-red-400/50 hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              title="删除连线"
              aria-label="删除连线"
            >
              ×
            </button>
          </foreignObject>
        )}
      </g>
    );
  }

  // Default (non-selected-endpoint) styling — keep existing hover/selected polish.
  const active = selected || hovered;
  const glowStrokeWidth = selected ? 9 : hovered ? 7 : 5;
  const glowOpacity = selected ? 0.38 : hovered ? 0.24 : 0.14;
  const topStroke = selected
    ? "rgba(54, 181, 240, 0.95)"
    : hovered
      ? "rgba(200, 230, 255, 0.52)"
      : "rgba(255, 255, 255, 0.16)";
  const topWidth = selected ? 2.75 : hovered ? 2.35 : 1.85;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs>
        <filter
          id={`edge-glow-${uid}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wide hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={26}
        className="react-flow__edge-interaction"
      />

      {/* Soft accent underlay + glow when active */}
      <path
        d={edgePath}
        fill="none"
        stroke={ACCENT}
        strokeOpacity={glowOpacity}
        strokeWidth={glowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={active ? `url(#edge-glow-${uid})` : undefined}
        style={{ pointerEvents: "none" }}
      />

      {/* Crisp foreground line */}
      <path
        d={edgePath}
        fill="none"
        stroke={topStroke}
        strokeWidth={topWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`react-flow__edge-path duration-150 ease-out ${
          hovered && !selected
            ? "canvas-edge-flow-dash"
            : "transition-[stroke,stroke-width]"
        }`}
        style={style}
      />

      {hovered && (
        <foreignObject
          x={labelX - 14}
          y={labelY - 14}
          width={28}
          height={28}
          className="pointer-events-auto overflow-visible"
        >
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/95 text-[15px] leading-none text-white shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform hover:scale-105 hover:border-red-400/50 hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            title="删除连线"
            aria-label="删除连线"
          >
            ×
          </button>
        </foreignObject>
      )}
    </g>
  );
}

export const CustomEdge = memo(CustomEdgeInner);
