"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { Navbar } from "@/components/canvas/Navbar";
import { LeftSidebar } from "@/components/canvas/LeftSidebar";
import { BottomBar } from "@/components/canvas/BottomBar";
import { CanvasArea } from "@/components/canvas/CanvasArea";

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-canvas-bg">
        <Navbar />
        <LeftSidebar />
        <CanvasArea />
        <BottomBar />
      </div>
    </ReactFlowProvider>
  );
}
