"use client";

import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode, ImageNodeData } from "@/types/canvas";

/**
 * Build an image node populated with a single URL and add it to the canvas.
 * Used by the upload + asset-picker flows. Resolution is read from the loaded
 * image when available; falls back to a 16:9 default.
 */
export async function spawnImageNodeFromUrl(
  url: string,
  options?: {
    name?: string;
    position?: { x: number; y: number };
  },
) {
  const dims = await readImageSize(url).catch(() => ({ w: 1024, h: 576 }));
  const aspect = dims.w / dims.h;
  const targetW = Math.min(640, dims.w);
  const targetH = Math.round(targetW / aspect);

  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const data: ImageNodeData = {
    type: "image",
    action: "image_resource",
    name: options?.name ?? "图片",
    url: [url],
    contentWidth: targetW,
    contentHeight: targetH,
  };

  const position = options?.position ?? {
    x: 240 + Math.random() * 280,
    y: 200 + Math.random() * 280,
  };

  const node: CanvasNode = {
    id,
    type: "image",
    position,
    width: targetW,
    height: targetH,
    data,
    selected: true,
  };

  const store = useCanvasStore.getState();
  const cleared = store.nodes.map((n) =>
    n.selected ? { ...n, selected: false } : n,
  );
  useCanvasStore.setState({
    nodes: [...cleared, node],
    selectedNodeIds: [id],
  });
}

function readImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Open a hidden <input type=file> and resolve with the chosen object URL(s).
 * Returns null if the user cancels.
 */
export function pickImageFiles(
  multiple = false,
): Promise<{ url: string; name: string }[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const cleanup = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    input.onchange = () => {
      settled = true;
      const files = Array.from(input.files ?? []);
      cleanup();
      if (files.length === 0) {
        resolve(null);
        return;
      }
      resolve(
        files.map((f) => ({
          url: URL.createObjectURL(f),
          name: f.name.replace(/\.[^.]+$/, ""),
        })),
      );
    };
    // 'cancel' is supported in modern Chrome, but we also fall back to a
    // window-focus heuristic.
    input.addEventListener("cancel", () => {
      if (settled) return;
      cleanup();
      resolve(null);
    });
    setTimeout(() => input.click(), 0);
  });
}
