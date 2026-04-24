"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { undo, redo } from "@/lib/canvas-history";

const CLIPBOARD_KEY = "__canvas_node_clipboard__";

function isInEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Wires up the global keyboard shortcuts that LibTV exposes:
 *
 * - Ctrl/Cmd + Z          → undo
 * - Ctrl/Cmd + Shift + Z  → redo
 * - Ctrl/Cmd + Y          → redo (alternative)
 * - Ctrl/Cmd + C          → copy selected node into sessionStorage
 * - Ctrl/Cmd + V          → paste sessionStorage clipboard
 * - Esc                   → clear current selection
 * - Delete / Backspace    → delete selected nodes (skipped while typing)
 *
 * Delete/Backspace is also handled by React Flow's `deleteKeyCode`, but we
 * still need a guard layer here so we ignore the keystroke while the user is
 * typing inside an input/textarea.
 */
export function useCanvasShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inEditable = isInEditableTarget(e.target);
      const mod = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (inEditable) return;
        e.preventDefault();
        undo();
        return;
      }
      if (
        mod &&
        ((e.shiftKey && (e.key === "z" || e.key === "Z")) ||
          e.key === "y" ||
          e.key === "Y")
      ) {
        if (inEditable) return;
        e.preventDefault();
        redo();
        return;
      }

      // Copy / Paste
      if (mod && (e.key === "c" || e.key === "C")) {
        if (inEditable) return;
        const { selectedNodeIds, nodes } = useCanvasStore.getState();
        if (selectedNodeIds.length !== 1) return;
        const node = nodes.find((n) => n.id === selectedNodeIds[0]);
        if (!node) return;
        try {
          sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(node));
          window.dispatchEvent(new Event("canvas-clipboard-changed"));
        } catch {
          /* ignore */
        }
        return;
      }
      if (mod && (e.key === "v" || e.key === "V")) {
        if (inEditable) return;
        try {
          const raw = sessionStorage.getItem(CLIPBOARD_KEY);
          if (!raw) return;
          const payload = JSON.parse(raw);
          useCanvasStore.getState().pasteNodeFromClipboard(payload);
        } catch {
          /* ignore */
        }
        return;
      }

      // Esc → clear selection
      if (e.key === "Escape") {
        if (inEditable) return;
        const { setSelectedNodeIds, nodes } = useCanvasStore.getState();
        const cleared = nodes.map((n) =>
          n.selected ? { ...n, selected: false } : n,
        );
        useCanvasStore.setState({ nodes: cleared });
        setSelectedNodeIds([]);
        return;
      }

      // Delete / Backspace — defer to React Flow when not in editable target.
      // We just intercept to make sure we don't accidentally delete while
      // typing in an input that doesn't ship its own stopPropagation.
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        inEditable
      ) {
        // Let the input handle it normally — do nothing.
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
