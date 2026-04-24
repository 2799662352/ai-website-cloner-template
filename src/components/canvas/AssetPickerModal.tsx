"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { spawnImageNodeFromUrl } from "@/lib/spawn-image-from-url";
import { toast } from "@/components/ui/Toast";

const MOCK_ASSETS: { url: string; name: string }[] = [
  { url: "https://picsum.photos/seed/libtv-1/640/360", name: "山脉清晨" },
  { url: "https://picsum.photos/seed/libtv-2/640/360", name: "城市夜景" },
  { url: "https://picsum.photos/seed/libtv-3/640/640", name: "森林光影" },
  { url: "https://picsum.photos/seed/libtv-4/640/360", name: "海岸日落" },
  { url: "https://picsum.photos/seed/libtv-5/640/360", name: "极地风光" },
  { url: "https://picsum.photos/seed/libtv-6/640/640", name: "沙漠星空" },
  { url: "https://picsum.photos/seed/libtv-7/640/480", name: "古典建筑" },
  { url: "https://picsum.photos/seed/libtv-8/640/480", name: "潮湿街道" },
];

export function AssetPickerModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handlePick = async (asset: (typeof MOCK_ASSETS)[number]) => {
    try {
      await spawnImageNodeFromUrl(asset.url, { name: asset.name });
      toast(`已添加：${asset.name}`, "success");
    } catch {
      toast("添加失败", "error");
    } finally {
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background,#171717)] shadow-2xl"
        style={{ width: "min(72vw, 920px)", height: "min(72vh, 640px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-fg-default">从图库选择</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/8 hover:text-fg-default"
            title="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {MOCK_ASSETS.map((a) => (
              <button
                key={a.url}
                type="button"
                onClick={() => handlePick(a)}
                className="group relative overflow-hidden rounded-xl border border-white/10 transition-all hover:scale-[1.02] hover:border-white/30 hover:shadow-lg"
              >
                <div className="aspect-video w-full bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    draggable={false}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left text-xs text-white">
                  {a.name}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-fg-muted/60">
            示例素材，接入后端后将替换为真实素材库。
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
