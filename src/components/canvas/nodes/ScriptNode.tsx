"use client";

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { ScriptNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import { IconChevronDown, IconTranslate, IconSend } from "../icons";

const SCRIPT_TABS = [
  "剧本生成分镜脚本",
  "视频参考生成分镜脚本",
  "角色生成分镜脚本",
];

function ScriptNodeInner({ id, data, selected }: NodeProps & { data: ScriptNodeData }) {
  const [activeTab, setActiveTab] = useState(0);
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");

  const controlPanel = selected ? (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-col gap-2 p-2">
        <div className="text-xs font-medium text-fg-default px-1">脚本生成器</div>

        <div className="nodrag flex flex-col gap-1">
          {SCRIPT_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                i === activeTab
                  ? "bg-white/10 text-fg-default"
                  : "text-fg-muted hover:text-fg-default"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="nodrag">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述剧情或添加角色参考、视频参考等，为你生成分镜脚本"
            className="w-full resize-none rounded-xl border border-[var(--canvas-node-border)] bg-transparent px-3 py-2 text-xs text-fg-default placeholder:text-fg-muted/50 focus:border-[var(--canvas-node-border-selected)] focus:outline-none"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-1">
          <button className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] text-fg-default hover:bg-white/5">
            <span>GVLM 3.1</span>
            <IconChevronDown className="h-2.5 w-2.5 text-fg-muted" />
          </button>
          <div className="flex-1" />
          <button className="flex h-7 w-7 items-center justify-center text-fg-muted hover:text-fg-default"><IconTranslate /></button>
          <button className="flex h-6 w-6 items-center justify-center rounded-full bg-fg-default text-canvas-bg hover:opacity-90">
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
      icon={<ScriptIcon />}
      selected={selected}
      width={350}
      height={350}
      floatingPanel={controlPanel}
    >
      {/* Icon placeholder — always visible */}
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <ScriptIcon className="h-16 w-16 text-fg-muted opacity-20" />
        <span className="text-xs text-fg-muted">脚本生成器</span>
      </div>
    </NodeShell>
  );
}

export const ScriptNodeComponent = memo(ScriptNodeInner);

function ScriptIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
