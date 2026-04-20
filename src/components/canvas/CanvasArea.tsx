"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "@/store/canvas-store";
import { ImageNodeComponent } from "./nodes/ImageNode";
import { VideoNodeComponent } from "./nodes/VideoNode";
import { TextNodeComponent } from "./nodes/TextNode";
import { AudioNodeComponent } from "./nodes/AudioNode";
import { ScriptNodeComponent } from "./nodes/ScriptNode";
import { VideoClipNodeComponent } from "./nodes/VideoClipNode";
import { VideoStoryNodeComponent } from "./nodes/VideoStoryNode";
import { TempNodeComponent } from "./nodes/TempNode";
import { CustomEdge } from "./edges/CustomEdge";
import { CanvasContextMenu, NodeContextMenu } from "./ContextMenu";

const nodeTypes: NodeTypes = {
  image: ImageNodeComponent,
  video: VideoNodeComponent,
  text: TextNodeComponent,
  audio: AudioNodeComponent,
  script: ScriptNodeComponent,
  "video-clip": VideoClipNodeComponent,
  "video-story": VideoStoryNodeComponent,
  temp: TempNodeComponent,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

function ScreenToFlowBridge({
  register,
}: {
  register: (
    fn: ((p: { x: number; y: number }) => { x: number; y: number }) | null
  ) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    register(screenToFlowPosition);
    return () => register(null);
  }, [register, screenToFlowPosition]);
  return null;
}

export function CanvasArea() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    setSelectedNodeIds,
    showMinimap,
    snapToGrid,
  } = useCanvasStore();

  const [contextMenu, setContextMenu] = useState<
    | {
        kind: "node";
        x: number;
        y: number;
        flowX: number;
        flowY: number;
        nodeId: string;
      }
    | {
        kind: "canvas";
        x: number;
        y: number;
        flowX: number;
        flowY: number;
      }
    | null
  >(null);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: { id: string }[] }) => {
      setSelectedNodeIds(selected.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const screenToFlowRef = useRef<
    ((p: { x: number; y: number }) => { x: number; y: number }) | null
  >(null);

  const registerScreenToFlow = useCallback(
    (
      fn: ((p: { x: number; y: number }) => { x: number; y: number }) | null
    ) => {
      screenToFlowRef.current = fn;
    },
    []
  );

  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = () => closeContextMenu();
    const id = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onPointerDown);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [contextMenu, closeContextMenu]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "custom" as const,
      deletable: true,
      selectable: true,
    }),
    []
  );

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onMove={(_e, vp) => setViewport(vp)}
        onMoveEnd={(_e, vp) => setViewport(vp)}
        onPaneClick={closeContextMenu}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          const project = screenToFlowRef.current;
          const flow = project
            ? project({ x: e.clientX, y: e.clientY })
            : { x: 0, y: 0 };
          setContextMenu({
            kind: "node",
            x: e.clientX,
            y: e.clientY,
            flowX: flow.x,
            flowY: flow.y,
            nodeId: node.id,
          });
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          const project = screenToFlowRef.current;
          const flow = project
            ? project({ x: e.clientX, y: e.clientY })
            : { x: 0, y: 0 };
          setContextMenu({
            kind: "canvas",
            x: e.clientX,
            y: e.clientY,
            flowX: flow.x,
            flowY: flow.y,
          });
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{
          stroke: "rgba(54, 181, 240, 0.58)",
          strokeWidth: 2.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.05}
        maxZoom={3}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[0, 1]}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        elevateNodesOnSelect
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        proOptions={{ hideAttribution: true }}
        className="react-flow light dark-theme"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
        {showMinimap ? (
          <MiniMap
            className="!m-4 !rounded-lg !border !border-[var(--canvas-node-border)] !bg-[var(--Surface-Panel-background)]"
            maskColor="rgba(0,0,0,0.45)"
            nodeStrokeColor="var(--fg-muted)"
            nodeColor="var(--canvas-node-border)"
            nodeBorderRadius={2}
            pannable
            zoomable
          />
        ) : null}
        <ScreenToFlowBridge register={registerScreenToFlow} />
      </ReactFlow>
      {contextMenu?.kind === "node" ? (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={closeContextMenu}
        />
      ) : null}
      {contextMenu?.kind === "canvas" ? (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowX={contextMenu.flowX}
          flowY={contextMenu.flowY}
          onClose={closeContextMenu}
        />
      ) : null}
    </div>
  );
}
