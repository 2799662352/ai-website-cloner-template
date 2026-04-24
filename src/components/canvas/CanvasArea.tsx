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
import type { CanvasNode } from "@/types/canvas";
import { ImageNodeComponent } from "./nodes/ImageNode";
import { VideoNodeComponent } from "./nodes/VideoNode";
import { TextNodeComponent } from "./nodes/TextNode";
import { AudioNodeComponent } from "./nodes/AudioNode";
import { ScriptNodeComponent } from "./nodes/ScriptNode";
import { VideoClipNodeComponent } from "./nodes/VideoClipNode";
import { VideoStoryNodeComponent } from "./nodes/VideoStoryNode";
import { TempNodeComponent } from "./nodes/TempNode";
import { GroupNodeComponent } from "./nodes/GroupNode";
import { CustomEdge } from "./edges/CustomEdge";
import { CanvasContextMenu, NodeContextMenu, MultiSelectContextMenu } from "./ContextMenu";
import { MultiSelectToolbar } from "./MultiSelectToolbar";
import { ConnectionDropMenu } from "./ConnectionDropMenu";
import { ToastHost } from "@/components/ui/Toast";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";

const nodeTypes: NodeTypes = {
  image: ImageNodeComponent,
  video: VideoNodeComponent,
  text: TextNodeComponent,
  audio: AudioNodeComponent,
  script: ScriptNodeComponent,
  "video-clip": VideoClipNodeComponent,
  "video-story": VideoStoryNodeComponent,
  temp: TempNodeComponent,
  group: GroupNodeComponent,
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
    reconnectEdge,
    setViewport,
    setSelectedNodeIds,
    selectedNodeIds,
    showMinimap,
    snapToGrid,
  } = useCanvasStore();

  const isMultiSelect = selectedNodeIds.length >= 2;

  useCanvasShortcuts();

  const reconnectSuccessful = useRef(false);
  const connectingFrom = useRef<{ nodeId: string; handleId: string } | null>(null);

  const [connectionDrop, setConnectionDrop] = useState<{
    screenX: number;
    screenY: number;
    flowX: number;
    flowY: number;
    sourceNodeId: string;
    sourceHandleId: string;
    tempNodeId: string;
  } | null>(null);

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
        kind: "multi";
        x: number;
        y: number;
        nodeIds: string[];
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        const { selectedNodeIds, groupNodes, ungroupNodes, nodes: allNodes } =
          useCanvasStore.getState();
        if (selectedNodeIds.length === 1) {
          const n = allNodes.find((nd) => nd.id === selectedNodeIds[0]);
          if (n?.type === "group") {
            ungroupNodes(n.id);
            return;
          }
        }
        if (selectedNodeIds.length >= 2) {
          groupNodes(selectedNodeIds);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "custom" as const,
      deletable: true,
      selectable: true,
    }),
    []
  );

  return (
    <div className="absolute inset-0" data-multi-select={isMultiSelect ? "" : undefined}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={(_event, params) => {
          connectingFrom.current = {
            nodeId: params.nodeId ?? "",
            handleId: params.handleId ?? "source",
          };
        }}
        onConnectEnd={(event) => {
          const target = (event as MouseEvent).target as HTMLElement;
          if (
            target?.closest(".react-flow__handle") ||
            target?.closest(".react-flow__node")
          ) {
            connectingFrom.current = null;
            return;
          }
          const from = connectingFrom.current;
          if (!from || !from.nodeId) {
            connectingFrom.current = null;
            return;
          }
          const me = event as MouseEvent;
          const project = screenToFlowRef.current;
          const flow = project
            ? project({ x: me.clientX, y: me.clientY })
            : { x: me.clientX, y: me.clientY };

          const tempId = `__drop_temp_${Date.now()}`;
          const store = useCanvasStore.getState();
          store.addNode({
            id: tempId,
            type: "temp",
            position: { x: flow.x, y: flow.y },
            data: { type: "group", label: "" } as CanvasNode["data"],
            width: 1,
            height: 1,
            style: { opacity: 0 },
          } as CanvasNode);
          store.addEdgeDirectly({
            id: `__drop_edge_${tempId}`,
            source: from.nodeId,
            sourceHandle: from.handleId,
            target: tempId,
            targetHandle: "target",
            type: "custom",
          });

          setConnectionDrop({
            screenX: me.clientX,
            screenY: me.clientY,
            flowX: flow.x,
            flowY: flow.y,
            sourceNodeId: from.nodeId,
            sourceHandleId: from.handleId,
            tempNodeId: tempId,
          });
          connectingFrom.current = null;
        }}
        edgesReconnectable
        onReconnectStart={() => {
          reconnectSuccessful.current = false;
        }}
        onReconnect={(oldEdge, newConnection) => {
          reconnectSuccessful.current = true;
          reconnectEdge(oldEdge, newConnection);
        }}
        onReconnectEnd={(_event, edge) => {
          if (!reconnectSuccessful.current) {
            useCanvasStore.getState().deleteEdge(edge.id);
          }
        }}
        onSelectionChange={onSelectionChange}
        onMove={(_e, vp) => setViewport(vp)}
        onMoveEnd={(_e, vp) => setViewport(vp)}
        onPaneClick={closeContextMenu}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          const selectedIds = useCanvasStore.getState().selectedNodeIds;
          if (selectedIds.length >= 2 && selectedIds.includes(node.id)) {
            setContextMenu({
              kind: "multi",
              x: e.clientX,
              y: e.clientY,
              nodeIds: selectedIds,
            });
          } else {
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
          }
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
          filter: "drop-shadow(0 0 6px rgba(54,181,240,0.45))",
        }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.05}
        maxZoom={3}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        elevateNodesOnSelect
        connectionRadius={30}
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
      {contextMenu?.kind === "multi" ? (
        <MultiSelectContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeIds={contextMenu.nodeIds}
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
      <MultiSelectToolbar />
      <ToastHost />
      {connectionDrop && (
        <ConnectionDropMenu
          screenX={connectionDrop.screenX}
          screenY={connectionDrop.screenY}
          flowX={connectionDrop.flowX}
          flowY={connectionDrop.flowY}
          sourceNodeId={connectionDrop.sourceNodeId}
          sourceHandleId={connectionDrop.sourceHandleId}
          tempNodeId={connectionDrop.tempNodeId}
          onClose={() => setConnectionDrop(null)}
        />
      )}
    </div>
  );
}
