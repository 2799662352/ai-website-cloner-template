import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode, CanvasEdge, ImageNodeData } from "@/types/canvas";

type OutputKind = "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split";

const KIND_META: Record<OutputKind, { name: string; defaultW: number; defaultH: number }> = {
  "multi-angle": { name: "多角度", defaultW: 350, defaultH: 625 },
  "lighting":    { name: "打光",   defaultW: 350, defaultH: 625 },
  "expand":      { name: "扩图",   defaultW: 350, defaultH: 625 },
  "nine-grid":   { name: "多机位九宫格", defaultW: 625, defaultH: 350 },
  "grid-split":  { name: "宫格切分", defaultW: 625, defaultH: 350 },
};

let spawnCounter = 0;

function uid() {
  return `out-${Date.now()}-${++spawnCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function spawnOutputNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  kind: OutputKind,
) {
  const store = useCanvasStore.getState();
  const meta = KIND_META[kind];
  const existingOutputs = store.edges.filter((e) => e.source === sourceNodeId).length;

  const offsetX = sourceWidth + 200;
  const offsetY = existingOutputs * 250;

  const newNodeId = uid();

  const nodeData: ImageNodeData = {
    type: "image",
    action: "image_generate",
    name: meta.name,
    url: [],
    contentWidth: meta.defaultW,
    contentHeight: meta.defaultH,
    generatorType: "default",
    taskInfo: {
      taskId: newNodeId,
      loading: true,
      status: 1,
      progressPercent: 0,
    },
    params: {
      prompt: "",
      model: "output",
      count: 1,
      settings: { quality: "2K", ratio: "1:1" },
      imageList: [{ nodeId: sourceNodeId, url: "" }],
    },
  };

  const newNode: CanvasNode = {
    id: newNodeId,
    type: "image",
    position: {
      x: sourcePosition.x + offsetX,
      y: sourcePosition.y + offsetY,
    },
    data: nodeData,
  };

  const newEdge: CanvasEdge = {
    id: `edge-${newNodeId}`,
    source: sourceNodeId,
    target: newNodeId,
    type: "custom",
    deletable: true,
    selectable: true,
  };

  store.addNode(newNode);
  store.addEdgeDirectly(newEdge);

  simulateGeneration(newNodeId);

  return newNodeId;
}

function simulateGeneration(nodeId: string) {
  const store = useCanvasStore.getState;
  let progress = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      const node = store().nodes.find((n) => n.id === nodeId);
      const sourceUrl = findSourceImageUrl(nodeId);

      useCanvasStore.getState().updateNodeData(nodeId, {
        url: sourceUrl ? [sourceUrl] : [],
        taskInfo: {
          taskId: nodeId,
          loading: false,
          status: 2,
          progressPercent: 100,
        },
        contentWidth: (node?.data as ImageNodeData)?.contentWidth ?? 350,
        contentHeight: (node?.data as ImageNodeData)?.contentHeight ?? 625,
      });
      return;
    }

    useCanvasStore.getState().updateNodeData(nodeId, {
      taskInfo: {
        taskId: nodeId,
        loading: true,
        status: 1,
        progressPercent: Math.round(progress),
      },
    });
  }, 600);

  (globalThis as Record<string, unknown>)[`__gen_${nodeId}`] = interval;
}

function findSourceImageUrl(nodeId: string): string | undefined {
  const { nodes, edges } = useCanvasStore.getState();
  const inEdge = edges.find((e) => e.target === nodeId);
  if (!inEdge) return undefined;
  const sourceNode = nodes.find((n) => n.id === inEdge.source);
  if (!sourceNode || sourceNode.data.type !== "image") return undefined;
  return (sourceNode.data as ImageNodeData).url?.[0];
}

export function cancelGeneration(nodeId: string) {
  const key = `__gen_${nodeId}`;
  const interval = (globalThis as Record<string, unknown>)[key];
  if (interval) {
    clearInterval(interval as number);
    delete (globalThis as Record<string, unknown>)[key];
  }

  useCanvasStore.getState().updateNodeData(nodeId, {
    taskInfo: {
      taskId: nodeId,
      loading: false,
      status: 3,
      progressPercent: 0,
    },
  });
}
