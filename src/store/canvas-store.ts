import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge as rfReconnectEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
  type Viewport,
} from "@xyflow/react";
import type { CanvasNode, CanvasEdge, CanvasNodeType } from "@/types/canvas";
import { seedNodes, seedEdges } from "@/data/seed-nodes";

let _nodeCounter = 100;
function nextNodeId() { return `drop-${++_nodeCounter}`; }

function createDefaultNodeData(type: CanvasNodeType): { data: CanvasNode["data"]; width: number; height: number } {
  switch (type) {
    case "text":
      return {
        width: 300, height: 200,
        data: { type: "text", action: "text_generate", name: "文本", content: [], params: { prompt: "", model: "aurora-3-prime" } },
      };
    case "image":
      return {
        width: 625, height: 350,
        data: {
          type: "image", action: "image_generate", name: "图片", url: [],
          contentWidth: 625, contentHeight: 350, generatorType: "default",
          params: { prompt: "", model: "nebula-ultra", count: 1, settings: { quality: "2K", ratio: "16:9" } },
        },
      };
    case "video":
      return {
        width: 500, height: 350,
        data: {
          type: "video", action: "video_generate", name: "视频节点", url: [],
          contentWidth: 629, contentHeight: 350,
          params: { prompt: "", model: "star-video2", modeType: "text2video", count: 1, settings: { ratio: "16:9", duration: 5, quality: "720p" } },
        },
      };
    case "video-clip":
      return {
        width: 500, height: 300,
        data: { type: "video-clip", action: "video_clip_resource", name: "视频合成", url: [] },
      };
    case "audio":
      return {
        width: 300, height: 80,
        data: { type: "audio", action: "audio_resource", name: "音频节点", url: [], params: { prompt: "", model: "eleven-v3" } },
      };
    case "script":
      return {
        width: 400, height: 300,
        data: { type: "script", action: "script_generate", name: "脚本", rows: [], viewMode: "table" as const, params: { prompt: "", model: "gvlm-3-1" } },
      };
    default:
      return {
        width: 300, height: 200,
        data: { type: "text", action: "text_generate", name: "文本", content: [] },
      };
  }
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  selectedNodeIds: string[];
  showMinimap: boolean;
  snapToGrid: boolean;

  onNodesChange: OnNodesChange<CanvasNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setViewport: (vp: Viewport) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  addNode: (node: CanvasNode) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  addEdgeDirectly: (edge: CanvasEdge) => void;
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  reconnectEdge: OnReconnect;
  toggleMinimap: () => void;
  toggleSnapToGrid: () => void;
  duplicateNode: (id: string) => void;
  groupNodes: (nodeIds: string[]) => void;
  ungroupNodes: (groupId: string) => void;
  arrangeNodes: (nodeIds: string[], mode: "grid" | "horizontal" | "vertical") => void;
  addNodeAndConnect: (type: CanvasNodeType, position: { x: number; y: number }, source: { nodeId: string; handleId: string }) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: seedNodes,
  edges: seedEdges,
  viewport: { x: 0, y: 0, zoom: 0.92 },
  selectedNodeIds: [],
  showMinimap: false,
  snapToGrid: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const newEdge: CanvasEdge = {
      ...connection,
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: "custom",
      deletable: true,
      selectable: true,
    };
    set({ edges: addEdge(newEdge, get().edges) });
  },

  setViewport: (viewport) => set({ viewport }),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  setNodes: (nodes) => set({ nodes }),

  addEdgeDirectly: (edge) => set({ edges: [...get().edges, edge] }),

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as typeof n.data } : n
      ),
    }),

  deleteNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    }),

  deleteEdge: (id) => set({ edges: get().edges.filter((e) => e.id !== id) }),

  reconnectEdge: (oldEdge, newConnection) => {
    set({ edges: rfReconnectEdge(oldEdge, newConnection, get().edges) });
  },

  toggleMinimap: () => set({ showMinimap: !get().showMinimap }),

  toggleSnapToGrid: () => set({ snapToGrid: !get().snapToGrid }),

  duplicateNode: (id) => {
    const original = get().nodes.find((n) => n.id === id);
    if (!original) return;
    const newId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const copy: CanvasNode = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 50,
        y: original.position.y + 50,
      },
      selected: false,
      data: structuredClone(original.data),
    };
    set({ nodes: [...get().nodes, copy] });
  },

  groupNodes: (nodeIds) => {
    const { nodes } = get();
    const targets = nodes.filter(
      (n) => nodeIds.includes(n.id) && n.type !== "group"
    );
    if (targets.length < 2) return;

    const PADDING = 40;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of targets) {
      const w = (n.measured?.width ?? n.width ?? 350);
      const h = (n.measured?.height ?? n.height ?? 250);
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }

    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupX = minX - PADDING;
    const groupY = minY - PADDING;

    const groupNode: CanvasNode = {
      id: groupId,
      type: "group",
      position: { x: groupX, y: groupY },
      data: {
        type: "group",
        label: `分组 ${targets.length} 个节点`,
      } as CanvasNode["data"],
      // Use width/height (not style.width/height) so that NodeResizer's
      // dimension changes flow through applyNodeChanges and actually resize
      // the group container.
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
    };

    const updated = nodes.map((n) => {
      if (!nodeIds.includes(n.id) || n.type === "group") return n;
      return {
        ...n,
        position: {
          x: n.position.x - groupX,
          y: n.position.y - groupY,
        },
        parentId: groupId,
        extent: "parent" as const,
        selected: false,
      };
    });

    set({
      nodes: [{ ...groupNode, selected: true }, ...updated],
      selectedNodeIds: [groupId],
    });
  },

  ungroupNodes: (groupId) => {
    const { nodes } = get();
    const group = nodes.find((n) => n.id === groupId);
    if (!group || group.type !== "group") return;

    const childIds: string[] = [];
    const updated = nodes
      .filter((n) => n.id !== groupId)
      .map((n) => {
        if (n.parentId !== groupId) return n;
        childIds.push(n.id);
        return {
          ...n,
          position: {
            x: n.position.x + group.position.x,
            y: n.position.y + group.position.y,
          },
          parentId: undefined,
          extent: undefined,
          selected: true,
        };
      });

    set({ nodes: updated, selectedNodeIds: childIds });
  },

  arrangeNodes: (nodeIds, mode) => {
    const { nodes } = get();
    const targets = nodes.filter((n) => nodeIds.includes(n.id));
    if (targets.length < 2) return;

    const GAP = 40;
    const anchor = { x: targets[0].position.x, y: targets[0].position.y };

    if (mode === "horizontal") {
      let cx = anchor.x;
      const updated = nodes.map((n) => {
        const idx = nodeIds.indexOf(n.id);
        if (idx === -1) return n;
        const w = n.measured?.width ?? n.width ?? 350;
        const pos = { x: cx, y: anchor.y };
        cx += w + GAP;
        return { ...n, position: pos };
      });
      set({ nodes: updated });
    } else if (mode === "vertical") {
      let cy = anchor.y;
      const updated = nodes.map((n) => {
        const idx = nodeIds.indexOf(n.id);
        if (idx === -1) return n;
        const h = n.measured?.height ?? n.height ?? 250;
        const pos = { x: anchor.x, y: cy };
        cy += h + GAP;
        return { ...n, position: pos };
      });
      set({ nodes: updated });
    } else {
      const cols = Math.ceil(Math.sqrt(targets.length));
      let col = 0, row = 0;
      let maxRowH = 0;
      let cx = anchor.x, cy = anchor.y;
      const positions = new Map<string, { x: number; y: number }>();
      for (const t of targets) {
        const w = t.measured?.width ?? t.width ?? 350;
        const h = t.measured?.height ?? t.height ?? 250;
        positions.set(t.id, { x: cx, y: cy });
        maxRowH = Math.max(maxRowH, h);
        col++;
        cx += w + GAP;
        if (col >= cols) {
          col = 0;
          row++;
          cx = anchor.x;
          cy += maxRowH + GAP;
          maxRowH = 0;
        }
      }
      const updated = nodes.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
      set({ nodes: updated });
    }
  },

  addNodeAndConnect: (type, position, source) => {
    const { data, width, height } = createDefaultNodeData(type);
    const id = nextNodeId();
    const newNode: CanvasNode = {
      id,
      type,
      position,
      data,
      width,
      height,
      selected: true,
    };
    const newEdge: CanvasEdge = {
      id: `e-${source.nodeId}-${id}`,
      source: source.nodeId,
      sourceHandle: source.handleId,
      target: id,
      targetHandle: "target",
      type: "custom",
    };
    // Deselect every other node so the new one is the sole selection —
    // this makes its control panel / toolbar appear immediately.
    const nodes = get().nodes.map((n) =>
      n.selected ? { ...n, selected: false } : n,
    );
    set({
      nodes: [...nodes, newNode],
      edges: [...get().edges, newEdge],
      selectedNodeIds: [id],
    });
  },
}));
