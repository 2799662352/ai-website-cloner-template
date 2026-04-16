# Nine Grid (九宫格) Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase C of the nine-grid feature — Canvas placeholder generation so the full UI flow works end-to-end without real AI.

**Architecture:** When a user selects a grid type from the NineGridDropdown (e.g. "多机位九宫格"), the system creates an output node with loading state, generates a Canvas-composited placeholder image (source image tiled N×N with grid lines), and displays it in the output node. Three existing files are modified to wire the grid type through; two new files provide the generation logic and future prompt templates.

**Tech Stack:** React Flow, Zustand, HTML5 Canvas API, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-16-nine-grid-generation-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/grid-generation.ts` | **Create** | Grid config registry, Canvas placeholder generator, AI generator stub |
| `src/lib/grid-prompts.ts` | **Create** | Prompt template strings for Phase A+B (stubbed with TapNow prompt) |
| `src/lib/spawn-output-node.ts` | **Modify** | Accept `gridType` param, route grid types to new generator |
| `src/components/canvas/ToolbarDropdowns.tsx` | **Modify** | Already passes key in `pick()` — no code change needed (it already works) |
| `src/components/canvas/nodes/ImageNode.tsx` | **Modify** | Wire `gridType` through `handleSpawn` → `spawnOutputNode` |

---

### Task 1: Create Grid Configuration Registry

**Files:**
- Create: `src/lib/grid-generation.ts`

- [ ] **Step 1: Create `src/lib/grid-generation.ts` with types and config map**

```typescript
// src/lib/grid-generation.ts

export interface GridConfig {
  gridType: string;
  rows: number;
  cols: number;
  outputSize: number;
  nodeWidth: number;
  nodeHeight: number;
}

export const GRID_CONFIGS: Record<string, GridConfig> = {
  "multi-cam-nine": { gridType: "multi-cam-nine", rows: 3, cols: 3, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "plot-push-four": { gridType: "plot-push-four", rows: 2, cols: 2, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "grid-25":        { gridType: "grid-25",        rows: 5, cols: 5, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "char-tri-view":  { gridType: "char-tri-view",  rows: 1, cols: 3, outputSize: 1024, nodeWidth: 625, nodeHeight: 250 },
};

export function isGridType(gridType: string): boolean {
  return gridType in GRID_CONFIGS;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/lib/grid-generation.ts` or just open it in the IDE and check for red squiggles. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/grid-generation.ts
git commit -m "feat(grid): add grid config registry with type definitions"
```

---

### Task 2: Implement Canvas Placeholder Generator

**Files:**
- Modify: `src/lib/grid-generation.ts`

- [ ] **Step 1: Add image loader helper**

Append to `src/lib/grid-generation.ts`:

```typescript
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

- [ ] **Step 2: Add `generateGridPlaceholder` function**

Append to `src/lib/grid-generation.ts`:

```typescript
export async function generateGridPlaceholder(
  sourceImageUrl: string,
  config: GridConfig,
): Promise<string> {
  const img = await loadImage(sourceImageUrl);

  const canvasW = config.outputSize;
  const canvasH = config.rows === config.cols
    ? config.outputSize
    : Math.round(config.outputSize * config.rows / config.cols);

  const cellW = canvasW / config.cols;
  const cellH = canvasH / config.rows;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      ctx.drawImage(img, x, y, cellW, cellH);
    }
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  for (let col = 1; col < config.cols; col++) {
    const x = col * cellW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasH);
    ctx.stroke();
  }
  for (let row = 1; row < config.rows; row++) {
    const y = row * cellH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
  }

  return canvas.toDataURL("image/png");
}
```

- [ ] **Step 3: Verify the file compiles**

Open `src/lib/grid-generation.ts` in IDE. Expected: no TypeScript errors. The file should now export `GridConfig`, `GRID_CONFIGS`, `isGridType`, and `generateGridPlaceholder`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/grid-generation.ts
git commit -m "feat(grid): implement Canvas placeholder generator for grid compositing"
```

---

### Task 3: Create Prompt Templates Stub

**Files:**
- Create: `src/lib/grid-prompts.ts`

- [ ] **Step 1: Create `src/lib/grid-prompts.ts` with TapNow multi-cam prompt and stubs**

```typescript
// src/lib/grid-prompts.ts

const MULTI_CAM_NINE_PROMPT = `Multi-Angle / Multi-Shot 3×3 Keyframe Generator (No Labels on Frames)

<role>
You are a top-tier cinematic storyboard artist + cinematographer. Your task: based on ONE reference image, generate a **3×3 grid (9 frames)** of multi-angle, multi–shot-size keyframes.
You must **preserve the original scene exactly**: same subjects, same pose, same action, same expression, same props, same environment, same lighting, same time-of-day, same mood.
Only the **camera angle, shot size, composition, lens choice, and perspective** may change.
</role>

<input>
User provides: one reference image (image).
</input>

<non-negotiable rules – continuity & truthfulness>
1. **Do NOT change**: pose, gesture, movement, facial expression, clothing, props, objects, environment layout, lighting direction/quality, color palette, weather, time-of-day.
2. **Do NOT add**: new characters, new props, new objects, new light sources, new environmental elements.
3. **The moment must remain identical** across all 9 frames. Only the camera moves.
4. **All frames must obey physical camera logic**: every viewpoint must be spatially consistent with the environment in the reference image.
5. Depth of field: deeper for wider shots, shallower for closer shots, always natural.
6. Color grade must be identical across all 9 frames.
7. **NO labels, NO text, NO graphics may appear inside any frame.**

* (No KF numbers, no shot types, no duration text, nothing.)
</non-negotiable rules – continuity & truthfulness>

<goal>
Generate 9 coherent keyframes representing **the same frozen moment** captured from 9 different cinematic perspectives and shot sizes.
The output will be used to create multi-angle AI video variations.
</goal>

<step 1 – scene breakdown>
Output (with subheadings):
* **Subjects:** Identify all visible subjects in the reference image; describe appearance, pose, facing direction, spatial position.
* **Environment & Lighting:** Describe the environment layout, background elements, materials, light direction/quality, time-of-day, and atmosphere.
* **Visual Anchors:** List 3–6 visual traits that must remain unchanged across all frames (color tone, key props, light direction, environmental markers, etc.).
</step 1 – scene breakdown>

<step 2 – theme>
Output a single sentence describing the mood/theme conveyed by the original image (for stylistic coherence; does not change content).
</step 2 – theme>

<step 3 – cinematic approach>
Describe:
* **Shot strategy:** 9 frames covering a full range of perspectives and shot sizes (ELS, LS, MLS, MS, MCU, CU, ECU, high-angle, low-angle).
* **Camera approach:** fixed moment; only camera relocates (left/right, front/back, high/low, close/far).
* **Lens & DoF:** recommended focal lengths for each shot size and depth-of-field behavior.
* **Light & color:** must strictly match the reference image.
</step 3 – cinematic approach>

<step 4 – keyframes for AI video>
Output **9 keyframes**, using the format:
**[KF# | duration (sec) | shot type]**
* **Composition:** describe subject placement, perspective shift, foreground/mid/background.
* **Perspective:** describe camera position (e.g., left side, low-angle upshot, overhead, telephoto compression).
* **Camera:** height, angle, static or minimal motion.
* **Lens/DoF:** focal length, focus point, DoF depth.
* **Lighting/Grade:** identical to the reference image.

**Hard rules:**
* All 9 frames must preserve the same moment with zero pose/action changes.
* Includes mandatory shots: 1 extreme wide, 1 wide, 1 medium-wide, 1 medium, 1 medium-close, 1 close-up, 1 extreme close-up, 1 high-angle view, 1 low-angle view
* **NO text, NO labels, NO graphics inside the images.**
</step 4 – keyframes for AI video>

<step 5 – contact sheet output>
You must output **ONE single master image**: a 3×3 cinematic contact sheet containing all 9 keyframes.
Requirements:
1. 3×3 layout only.
2. Each frame = one unique camera angle/shot size.
3. No visual text labels inside any frame (strict).
4. Perfect continuity across all 9 frames.
5. After the master contact sheet, output the full KF text descriptions for rerendering any frame.
</step 5 – contact sheet output>

<final output format>
A) Scene Breakdown
B) Theme
C) Cinematic Approach
D) Keyframes
E) ONE 3×3 Master Contact Sheet Image
</final output format>`;

const PLOT_PUSH_FOUR_PROMPT = `Based on the provided reference image, generate a **2×2 grid (4 frames)** showing a 4-beat narrative progression of this scene.

Frame 1 (top-left): The moment just before the current scene — establish context.
Frame 2 (top-right): The current moment as shown in the reference image — match exactly.
Frame 3 (bottom-left): The next beat — a natural continuation of the action.
Frame 4 (bottom-right): The resolution — the scene settles or transitions.

Rules:
- Maintain the same characters, environment, lighting, and color grade across all 4 frames.
- Only the action/pose may progress naturally. No new characters or props.
- NO text, labels, or graphics inside any frame.
- Output ONE single 2×2 contact sheet image.`;

const GRID_25_PROMPT = `Based on the provided reference image, generate a **5×5 grid (25 frames)** of continuous storyboard keyframes.

The 25 frames should tell a coherent visual story spanning approximately 30 seconds of screen time, with the reference image as the midpoint (frame 13).

Frames 1-12: Build-up leading to the reference image moment.
Frame 13: Match the reference image exactly.
Frames 14-25: Continuation after the reference moment.

Rules:
- Maintain character consistency, environment, and color grade throughout.
- Camera angles and shot sizes should vary cinematically across the sequence.
- NO text, labels, or graphics inside any frame.
- Output ONE single 5×5 contact sheet image.`;

const CHAR_TRI_VIEW_PROMPT = `Based on the provided reference image, generate a **1×3 grid (3 frames)** showing character orthographic views.

Frame 1 (left): Front view — character facing directly toward camera.
Frame 2 (center): Side view (3/4 or full profile) — character turned 90 degrees.
Frame 3 (right): Back view — character facing away from camera.

Rules:
- Identical character: same clothing, accessories, proportions, colors.
- Neutral pose, standing straight, arms slightly away from body for visibility.
- Clean, simple background (light gray or white).
- NO text, labels, or graphics inside any frame.
- Output ONE single 1×3 horizontal contact sheet image.`;

export const GRID_PROMPTS: Record<string, () => string> = {
  "multi-cam-nine": () => MULTI_CAM_NINE_PROMPT,
  "plot-push-four": () => PLOT_PUSH_FOUR_PROMPT,
  "grid-25": () => GRID_25_PROMPT,
  "char-tri-view": () => CHAR_TRI_VIEW_PROMPT,
};
```

- [ ] **Step 2: Verify the file compiles**

Open in IDE. Expected: no errors. Exports `GRID_PROMPTS`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/grid-prompts.ts
git commit -m "feat(grid): add prompt templates for AI grid generation (Phase A+B)"
```

---

### Task 4: Modify `spawn-output-node.ts` to Support Grid Types

**Files:**
- Modify: `src/lib/spawn-output-node.ts`

- [ ] **Step 1: Add imports at the top of the file**

At the top of `src/lib/spawn-output-node.ts`, after the existing imports, add:

```typescript
import { GRID_CONFIGS, isGridType, generateGridPlaceholder } from "./grid-generation";
```

- [ ] **Step 2: Add `gridType` parameter to `spawnOutputNode`**

Change the function signature from:

```typescript
export function spawnOutputNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  kind: OutputKind,
  generateParams?: GenerateParams,
  lightingParams?: LightingGenerateParams,
) {
```

To:

```typescript
export function spawnOutputNode(
  sourceNodeId: string,
  sourcePosition: { x: number; y: number },
  sourceWidth: number,
  kind: OutputKind,
  generateParams?: GenerateParams,
  lightingParams?: LightingGenerateParams,
  gridType?: string,
) {
```

- [ ] **Step 3: Use dynamic dimensions from GRID_CONFIGS when gridType is provided**

Inside `spawnOutputNode`, right after `const meta = KIND_META[kind];`, add the dynamic override:

```typescript
  const meta = KIND_META[kind];
  const gridConfig = gridType ? GRID_CONFIGS[gridType] : undefined;
  const effectiveW = gridConfig?.nodeWidth ?? meta.defaultW;
  const effectiveH = gridConfig?.nodeHeight ?? meta.defaultH;
```

Then update the `nodeData` object to use these values. Change:

```typescript
    contentWidth: meta.defaultW,
    contentHeight: meta.defaultH,
```

To:

```typescript
    contentWidth: effectiveW,
    contentHeight: effectiveH,
```

And update the `name` field. Change:

```typescript
    name: meta.name,
```

To:

```typescript
    name: gridConfig ? getGridDisplayName(gridType!) : meta.name,
```

Add this helper function before `spawnOutputNode`:

```typescript
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
```

- [ ] **Step 4: Route grid types to the new generator**

In the routing section at the end of `spawnOutputNode`, change:

```typescript
  if (kind === "multi-angle" && generateParams?.imageUrl) {
    runRealGeneration(newNodeId, generateParams);
  } else if (kind === "lighting" && lightingParams?.imageUrl) {
    runLightingGeneration(newNodeId, lightingParams);
  } else {
    simulateGeneration(newNodeId);
  }
```

To:

```typescript
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
```

- [ ] **Step 5: Add `runGridGeneration` function**

Add this new function after `simulateGeneration` in the file:

```typescript
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
```

- [ ] **Step 6: Verify the file compiles**

Open `src/lib/spawn-output-node.ts` in IDE. Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/spawn-output-node.ts
git commit -m "feat(grid): wire grid type routing and Canvas generation into spawnOutputNode"
```

---

### Task 5: Wire Grid Type Through ImageNode UI

**Files:**
- Modify: `src/components/canvas/nodes/ImageNode.tsx`

- [ ] **Step 1: Update `handleSpawn` callback to accept gridType**

In `ImageNode.tsx`, find the `handleSpawn` callback (around line 51-56). Change:

```typescript
  const handleSpawn = useCallback((kind: "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split") => {
    const node = getNode(id);
    if (!node) return;
    spawnOutputNode(id, node.position, w, kind);
    setActiveEditor(null);
  }, [id, getNode, w]);
```

To:

```typescript
  const handleSpawn = useCallback((kind: "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split", gridType?: string) => {
    const node = getNode(id);
    if (!node) return;
    spawnOutputNode(id, node.position, w, kind, undefined, undefined, gridType);
    setActiveEditor(null);
  }, [id, getNode, w]);
```

- [ ] **Step 2: Update NineGridDropdown `onSelect` to pass gridType**

Find the `NineGridDropdown` usage in the context toolbar (around line 265-270). Change:

```typescript
          <NineGridDropdown
            open={openDropdown === "nine"}
            onToggle={() => toggleDropdown("nine")}
            onSelect={() => handleSpawn("nine-grid")}
            trigger={<TBBtn label="九宫格" icon={<GridNineIcon />} hasDropdown active={openDropdown === "nine"} />}
          />
```

To:

```typescript
          <NineGridDropdown
            open={openDropdown === "nine"}
            onToggle={() => toggleDropdown("nine")}
            onSelect={(gridType) => handleSpawn("nine-grid", gridType)}
            trigger={<TBBtn label="九宫格" icon={<GridNineIcon />} hasDropdown active={openDropdown === "nine"} />}
          />
```

- [ ] **Step 3: Verify the file compiles**

Open `ImageNode.tsx` in IDE. Expected: no TypeScript errors. The `NineGridDropdown` already calls `onSelect?.(label)` with the key string (e.g. `"multi-cam-nine"`), so the type flows correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/nodes/ImageNode.tsx
git commit -m "feat(grid): wire gridType from NineGridDropdown through handleSpawn"
```

---

### Task 6: Manual End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open the app at `http://localhost:3003/` (or whatever port is configured).

- [ ] **Step 2: Test multi-cam-nine (3×3)**

1. Upload or select an image node on the canvas
2. Click the image node to select it → context toolbar appears
3. Click "九宫格" dropdown
4. Click "多机位九宫格"
5. Expected: A new output node appears to the right with loading indicator, then quickly shows a 3×3 tiled grid of the source image with white grid lines separating the cells. Node size should be 625×625. An edge connects source → output.

- [ ] **Step 3: Test plot-push-four (2×2)**

Repeat with "剧情推演四宫格". Expected: 2×2 grid placeholder, 625×625 node.

- [ ] **Step 4: Test grid-25 (5×5)**

Repeat with "25宫格连贯分镜". Expected: 5×5 grid placeholder, 625×625 node.

- [ ] **Step 5: Test char-tri-view (1×3)**

Repeat with "角色三视图生成". Expected: 1×3 horizontal grid placeholder, 625×250 node.

- [ ] **Step 6: Test single-image types**

Click "电影级光影校正", "画面推演 - 3秒后", "画面推演 - 5秒前". Expected: These fall back to the existing `simulateGeneration` (show source image after progress animation). No grid compositing.

- [ ] **Step 7: Test cancel flow**

Start a grid generation → click "取消" on the loading overlay. Expected: Generation stops, node shows error state.

- [ ] **Step 8: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(grid): address issues found during manual verification"
```

Only commit if changes were made during verification. If everything passed cleanly, skip this step.
