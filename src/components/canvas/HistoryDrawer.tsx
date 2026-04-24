"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";

const MOCK_HISTORY = [
  { id: 1, kind: "图片", name: "东方未来主义角色 #04", thumb: "https://picsum.photos/seed/h1/240/160", time: "刚刚" },
  { id: 2, kind: "视频", name: "海岸日落 4 秒镜头", thumb: "https://picsum.photos/seed/h2/240/160", time: "5 分钟前" },
  { id: 3, kind: "图片", name: "霓虹街区分镜", thumb: "https://picsum.photos/seed/h3/240/160", time: "23 分钟前" },
  { id: 4, kind: "音频", name: "氛围背景配乐", thumb: "https://picsum.photos/seed/h4/240/160", time: "1 小时前" },
  { id: 5, kind: "图片", name: "古典中式服饰参考", thumb: "https://picsum.photos/seed/h5/240/160", time: "3 小时前" },
  { id: 6, kind: "视频故事", name: "广告分镜表 v2", thumb: "https://picsum.photos/seed/h6/240/160", time: "昨天" },
];

const FILTERS = ["全部", "图片", "视频", "音频", "视频故事"] as const;

export function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items =
    filter === "全部"
      ? MOCK_HISTORY
      : MOCK_HISTORY.filter((it) => it.kind === filter);

  return (
    <div
      className="absolute left-16 top-1/2 z-30 flex -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-[var(--surface-panel-bg,#171717)] shadow-xl shadow-black/40"
      style={{ width: 320, maxHeight: "min(80vh, 720px)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <span className="text-sm font-medium text-fg-default">历史记录</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-white/8 hover:text-fg-default"
          title="关闭"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </header>

      <div className="flex gap-1 border-b border-white/8 px-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-md px-2.5 py-1 text-xs transition-colors " +
              (filter === f
                ? "bg-white/12 text-fg-default"
                : "text-fg-muted hover:bg-white/6 hover:text-fg-default")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-fg-muted/60">
            暂无历史记录
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="group flex items-center gap-3 rounded-lg border border-transparent p-1.5 transition-colors hover:border-white/10 hover:bg-white/5"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.thumb}
                    alt={it.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-fg-default">
                    {it.name}
                  </div>
                  <div className="text-[11px] text-fg-muted/60">
                    {it.kind} · {it.time}
                  </div>
                </div>
                <button
                  type="button"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="加入画布"
                  onClick={() => toast("功能开发中：加入画布", "info")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-fg-muted hover:text-fg-default">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-center text-[11px] text-fg-muted/40">
          示例数据，接入后端后将显示真实生成历史。
        </p>
      </div>
    </div>
  );
}
