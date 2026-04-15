"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { TextNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconSend, IconTranslate, IconChevronDown } from "../icons";

function formatTextContent(content: unknown[]): string {
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if (typeof o.text === "string") return o.text;
        if (typeof o.content === "string") return o.content;
        if (typeof o.body === "string") return o.body;
      }
      return typeof item === "number" || typeof item === "boolean" ? String(item) : "";
    })
    .filter((s) => s.length > 0)
    .join("\n\n");
}

function TextNodeInner({ id, data, selected }: NodeProps & { data: TextNodeData }) {
  const hasContent = Array.isArray(data.content) && data.content.length > 0;
  const textBody = hasContent ? formatTextContent(data.content) : "";
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");
  const contentRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(350);

  useLayoutEffect(() => {
    if (!hasContent) {
      setBodyHeight(350);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      setBodyHeight(Math.max(350, el.scrollHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasContent, textBody, data.content]);

  const floatingPanel = selected ? (
    <div className="flex min-h-0 w-full flex-col gap-2 p-2">
      <div className="relative min-h-0 flex-1">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的文本内容…"
          className="nodrag h-20 w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
          rows={3}
        />
      </div>
      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          className="nodrag flex min-w-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[12px] text-fg-default transition-colors hover:bg-white/5"
        >
          <span className="flex h-3 w-3 items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate">Aurora 3 Prime</span>
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
    </div>
  ) : undefined;

  return (
    <NodeShell
      nodeId={id}
      name={data.name}
      icon={<TextIcon />}
      selected={selected}
      width={350}
      height={bodyHeight}
      floatingPanel={floatingPanel}
    >
      <div className="flex h-full min-h-0 flex-col">
        {hasContent ? (
          <div
            ref={contentRef}
            className="box-border min-h-[350px] w-full px-4 py-4 text-left text-[13px] leading-relaxed text-fg-default"
          >
            <div className="whitespace-pre-wrap break-words">{textBody}</div>
          </div>
        ) : (
          <div className="flex h-full min-h-[350px] items-center justify-center">
            <TextLinesEmptyIcon className="text-fg-muted/35" />
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export const TextNodeComponent = memo(TextNodeInner);

function TextIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}

/** Text lines illustration — 90×90 for empty state */
function TextLinesEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={90} height={90} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16M4 9h16M4 13h12M4 17h16" />
      <path d="M4 21h10" opacity="0.5" />
    </svg>
  );
}
