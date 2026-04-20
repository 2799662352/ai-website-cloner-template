import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Viewport,
} from "@xyflow/react";
import type { CanvasNode, CanvasEdge } from "@/types/canvas";
import { seedNodes, seedEdges } from "@/data/seed-nodes";

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
  toggleMinimap: () => void;
  toggleSnapToGrid: () => void;
  duplicateNode: (id: string) => void;
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
}));
