"use client";

import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

type Snapshot = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

const MAX_HISTORY = 50;

const _undoStack: Snapshot[] = [];
const _redoStack: Snapshot[] = [];
const _listeners = new Set<() => void>();
let _suspended = false;

function emit() {
  for (const fn of _listeners) fn();
}

function deepClone(snap: Snapshot): Snapshot {
  return {
    nodes: snap.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: structuredClone(n.data) as CanvasNode["data"],
    })),
    edges: snap.edges.map((e) => ({ ...e })),
  };
}

function snapshot(): Snapshot {
  const { nodes, edges } = useCanvasStore.getState();
  return deepClone({ nodes, edges });
}

export function pushHistorySnapshot() {
  if (_suspended) return;
  _undoStack.push(snapshot());
  if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
  _redoStack.length = 0;
  emit();
}

export function undo() {
  if (_undoStack.length === 0) return;
  const previous = _undoStack.pop()!;
  _redoStack.push(snapshot());
  _suspended = true;
  useCanvasStore.setState({ nodes: previous.nodes, edges: previous.edges });
  _suspended = false;
  emit();
}

export function redo() {
  if (_redoStack.length === 0) return;
  const next = _redoStack.pop()!;
  _undoStack.push(snapshot());
  _suspended = true;
  useCanvasStore.setState({ nodes: next.nodes, edges: next.edges });
  _suspended = false;
  emit();
}

export function canUndo() {
  return _undoStack.length > 0;
}
export function canRedo() {
  return _redoStack.length > 0;
}

export function subscribeHistory(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

let _moveDebounce: number | null = null;
export function pushSnapshotDebouncedForMove() {
  if (_suspended) return;
  if (_moveDebounce !== null) {
    window.clearTimeout(_moveDebounce);
  }
  _moveDebounce = window.setTimeout(() => {
    pushHistorySnapshot();
    _moveDebounce = null;
  }, 220);
}
