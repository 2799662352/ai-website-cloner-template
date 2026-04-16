import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode, CanvasEdge, ImageNodeData } from "@/types/canvas";
import { generateCameraAngleEdit, generateLightingEdit } from "./camera-angle-api";
import { GRID_CONFIGS, isGridType, generateGridPlaceholder } from "./grid-generation";

type OutputKind = "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split";

export interface GenerateParams {
  horizontal: number;
  vertical: number;
  distance: number;
  imageUrl?: string;
}

export interface LightingGenerateParams {
  direction: string;
  brightness: number;
  color: string;
  rimLight: boolean;
  imageUrl?: string;
}

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

function getGridDisplayName(gridType: string): string {
  const names: Record<string, string> = {
    "multi-cam-nine": "多机位九宫格",
    "plot-push-four": "剧情推演四宫格",
    "grid-25": "25宫格连贯分镜",
    "char-tri-view": "角色三视图",
    "film-light": "电影级光影校正",
    "push-after-3s": "画面推演 · 3秒后",
    "push-before-5s": "画面推演 · 5秒前",
  };
  return names[gridType] ?? "九宫格";
}

export function spawnOutputNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  kind: OutputKind,
  generateParams?: GenerateParams,
  lightingParams?: LightingGenerateParams,
  gridType?: string,
) {
  const store = useCanvasStore.getState();
  const meta = KIND_META[kind];
  const gridConfig = gridType ? GRID_CONFIGS[gridType] : undefined;
  const effectiveW = gridConfig?.nodeWidth ?? meta.defaultW;
  const effectiveH = gridConfig?.nodeHeight ?? meta.defaultH;
  const existingOutputs = store.edges.filter((e) => e.source === sourceNodeId).length;

  const offsetX = sourceWidth + 200;
  const offsetY = existingOutputs * 250;

  const newNodeId = uid();

  const nodeData: ImageNodeData = {
    type: "image",
    action: "image_generate",
    name: gridConfig ? getGridDisplayName(gridType!) : meta.name,
    url: [],
    contentWidth: effectiveW,
    contentHeight: effectiveH,
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

  if (kind === "multi-angle" && generateParams?.imageUrl) {
    runRealGeneration(newNodeId, generateParams);
  } else if (kind === "lighting" && lightingParams?.imageUrl) {
    runLightingGeneration(newNodeId, lightingParams);
  } else if (kind === "nine-grid" && gridType && isGridType(gridType)) {
    const sourceUrl = findSourceImageUrl(newNodeId) ?? "";
    runGridGeneration(newNodeId, gridType, sourceUrl);
  } else {
    simulateGeneration(newNodeId);
  }

  return newNodeId;
}

export function spawnAnnotationNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
  dataUrl: string,
) {
  const store = useCanvasStore.getState();
  const existingOutputs = store.edges.filter((e) => e.source === sourceNodeId).length;
  const offsetX = sourceWidth + 200;
  const offsetY = existingOutputs * 250;
  const newNodeId = uid();

  const nodeData: ImageNodeData = {
    type: "image",
    action: "image_generate",
    name: "标注",
    url: [dataUrl],
    contentWidth: sourceWidth,
    contentHeight: sourceHeight,
    generatorType: "default",
    params: {
      prompt: "",
      model: "annotation",
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
  return newNodeId;
}

export function spawnRotationNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
  imageUrl: string,
) {
  const store = useCanvasStore.getState();
  const existingOutputs = store.edges.filter((e) => e.source === sourceNodeId).length;
  const offsetX = sourceWidth + 200;
  const offsetY = existingOutputs * 250;
  const newNodeId = uid();

  const nodeData: ImageNodeData = {
    type: "image",
    action: "image_resource",
    name: "旋转与镜像",
    url: [imageUrl],
    contentWidth: sourceWidth,
    contentHeight: sourceHeight,
    generatorType: "default",
    rotationMode: true,
    params: {
      prompt: "",
      model: "rotation",
      count: 1,
      settings: { quality: "2K", ratio: "1:1" },
      imageList: [{ nodeId: sourceNodeId, url: imageUrl }],
    },
  };

  const deselectedNodes = store.nodes.map((n) => ({ ...n, selected: false }));

  const newNode: CanvasNode = {
    id: newNodeId,
    type: "image",
    position: {
      x: sourcePosition.x + offsetX,
      y: sourcePosition.y + offsetY,
    },
    data: nodeData,
    selected: true,
  };

  const newEdge: CanvasEdge = {
    id: `edge-${newNodeId}`,
    source: sourceNodeId,
    target: newNodeId,
    type: "custom",
    deletable: true,
    selectable: true,
  };

  store.setNodes([...deselectedNodes, newNode]);
  store.addEdgeDirectly(newEdge);
  return newNodeId;
}

async function runRealGeneration(nodeId: string, params: GenerateParams) {
  const ac = new AbortController();
  (globalThis as Record<string, unknown>)[`__gen_abort_${nodeId}`] = ac;

  const progressInterval = setInterval(() => {
    const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
    if (!node) { clearInterval(progressInterval); return; }
    const current = (node.data as ImageNodeData).taskInfo?.progressPercent ?? 0;
    if (current < 90) {
      useCanvasStore.getState().updateNodeData(nodeId, {
        taskInfo: { taskId: nodeId, loading: true, status: 1, progressPercent: Math.min(90, current + 8) },
      });
    }
  }, 800);

  try {
    const result = await generateCameraAngleEdit(
      params.imageUrl!,
      params.horizontal,
      params.vertical,
      params.distance,
      ac.signal,
    );

    clearInterval(progressInterval);

    if (result.success && result.imageDataUrl) {
      useCanvasStore.getState().updateNodeData(nodeId, {
        url: [result.imageDataUrl],
        taskInfo: { taskId: nodeId, loading: false, status: 2, progressPercent: 100 },
      });
    } else {
      const fallbackUrl = findSourceImageUrl(nodeId);
      useCanvasStore.getState().updateNodeData(nodeId, {
        url: fallbackUrl ? [fallbackUrl] : [],
        name: `多角度 (${result.error || "失败"})`,
        taskInfo: { taskId: nodeId, loading: false, status: 3, progressPercent: 0 },
      });
    }
  } catch {
    clearInterval(progressInterval);
    useCanvasStore.getState().updateNodeData(nodeId, {
      taskInfo: { taskId: nodeId, loading: false, status: 3, progressPercent: 0 },
    });
  } finally {
    delete (globalThis as Record<string, unknown>)[`__gen_abort_${nodeId}`];
  }
}

async function runLightingGeneration(nodeId: string, params: LightingGenerateParams) {
  const ac = new AbortController();
  (globalThis as Record<string, unknown>)[`__gen_abort_${nodeId}`] = ac;

  const progressInterval = setInterval(() => {
    const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
    if (!node) { clearInterval(progressInterval); return; }
    const current = (node.data as ImageNodeData).taskInfo?.progressPercent ?? 0;
    if (current < 90) {
      useCanvasStore.getState().updateNodeData(nodeId, {
        taskInfo: { taskId: nodeId, loading: true, status: 1, progressPercent: Math.min(90, current + 8) },
      });
    }
  }, 800);

  try {
    const result = await generateLightingEdit(
      params.imageUrl!,
      params.direction,
      params.brightness,
      params.color,
      params.rimLight,
      ac.signal,
    );

    clearInterval(progressInterval);

    if (result.success && result.imageDataUrl) {
      useCanvasStore.getState().updateNodeData(nodeId, {
        url: [result.imageDataUrl],
        taskInfo: { taskId: nodeId, loading: false, status: 2, progressPercent: 100 },
      });
    } else {
      const fallbackUrl = findSourceImageUrl(nodeId);
      useCanvasStore.getState().updateNodeData(nodeId, {
        url: fallbackUrl ? [fallbackUrl] : [],
        name: `打光 (${result.error || "失败"})`,
        taskInfo: { taskId: nodeId, loading: false, status: 3, progressPercent: 0 },
      });
    }
  } catch {
    clearInterval(progressInterval);
    useCanvasStore.getState().updateNodeData(nodeId, {
      taskInfo: { taskId: nodeId, loading: false, status: 3, progressPercent: 0 },
    });
  } finally {
    delete (globalThis as Record<string, unknown>)[`__gen_abort_${nodeId}`];
  }
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

async function runGridGeneration(nodeId: string, gridType: string, sourceImageUrl: string) {
  const config = GRID_CONFIGS[gridType];
  if (!config || !sourceImageUrl) {
    simulateGeneration(nodeId);
    return;
  }

  useCanvasStore.getState().updateNodeData(nodeId, {
    taskInfo: { taskId: nodeId, loading: true, status: 1, progressPercent: 30 },
  });

  try {
    const dataUrl = await generateGridPlaceholder(sourceImageUrl, config);

    useCanvasStore.getState().updateNodeData(nodeId, {
      url: [dataUrl],
      contentWidth: config.nodeWidth,
      contentHeight: config.nodeHeight,
      taskInfo: { taskId: nodeId, loading: false, status: 2, progressPercent: 100 },
    });
  } catch {
    const fallbackUrl = findSourceImageUrl(nodeId);
    useCanvasStore.getState().updateNodeData(nodeId, {
      url: fallbackUrl ? [fallbackUrl] : [],
      taskInfo: { taskId: nodeId, loading: false, status: 3, progressPercent: 0 },
    });
  }
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
  const simKey = `__gen_${nodeId}`;
  const simInterval = (globalThis as Record<string, unknown>)[simKey];
  if (simInterval) {
    clearInterval(simInterval as number);
    delete (globalThis as Record<string, unknown>)[simKey];
  }

  const abortKey = `__gen_abort_${nodeId}`;
  const ac = (globalThis as Record<string, unknown>)[abortKey] as AbortController | undefined;
  if (ac) {
    ac.abort();
    delete (globalThis as Record<string, unknown>)[abortKey];
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
