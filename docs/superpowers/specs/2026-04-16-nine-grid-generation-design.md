# Nine Grid (九宫格) Generation — Design Spec

> Date: 2026-04-16
> Status: Approved
> Project: `ai-website-cloner-template`

## Overview

Implement the "九宫格" (Nine Grid) feature: AI-powered generation of multi-grid contact sheet images from a single source image. The feature follows a two-phase rollout:

- **Phase C** (immediate): UI flow + Canvas placeholder generation — validate the full interaction loop without real AI.
- **Phase A+B** (follow-up): Real AI generation via Gemini API using TapNow-style 5-step system prompts.

A separate future feature ("宫格切分") will handle splitting the generated contact sheet into individual sub-images — that is out of scope here.

## Reference

- TapNow reverse engineering docs (`D:\project\tapnow-reverse-engineering`)
  - `02-system-prompt.md` — 5-step cinematic storyboard prompt for 3×3 contact sheet
  - `04-frontend-implementation.md` — Canvas split algorithm, node layout, edge creation
  - `06-prompt-engineering-analysis.md` — Prompt design philosophy and reuse guidance
- `ai-image-master` Director mode — alternative contact sheet generation pipeline
- Context7 docs: Gemini API image generation, React Flow node management, Zustand async patterns

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  User clicks NineGridDropdown → selects grid type        │
│  e.g. "多机位九宫格" (multi-cam-nine)                     │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  ImageNode.handleSpawn("nine-grid", gridType)            │
│  Passes gridType key to spawnOutputNode                  │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  spawnOutputNode(sourceId, pos, w, "nine-grid", ...)     │
│  1. Create output node (loading state) + edge            │
│  2. Route to grid generation based on gridType           │
│     - Grid types (rows>1 || cols>1) → gridGeneration     │
│     - Single-image types (1×1) → simulateGeneration      │
└────────────────────────┬─────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     Phase C (now)           Phase A+B (later)
┌─────────────────────┐  ┌──────────────────────────┐
│ generateGridPlace-  │  │ generateGridWithAI()     │
│ holder()            │  │                          │
│                     │  │ 1. Source img → base64   │
│ 1. Create Canvas    │  │ 2. Get prompt template   │
│    (1024×1024)      │  │ 3. Call Gemini API       │
│ 2. Tile source img  │  │    (gemini-3.1-flash-    │
│    into N×N grid    │  │     image-preview)       │
│ 3. Draw grid lines  │  │ 4. Extract contact sheet │
│ 4. toDataURL()      │  │    from response         │
│ 5. Update node url  │  │ 5. Update node url       │
└─────────────────────┘  └──────────────────────────┘
```

## Grid Type Configuration

Each `NineGridDropdown` menu item maps to a grid configuration:

| Menu Item | Key | Grid | Output Canvas | Node Size (display) | Generation |
|---|---|---|---|---|---|
| 多机位九宫格 | `multi-cam-nine` | 3×3 | 1024×1024 | 625×625 | Grid placeholder / AI |
| 剧情推演四宫格 | `plot-push-four` | 2×2 | 1024×1024 | 625×625 | Grid placeholder / AI |
| 25宫格连贯分镜 | `grid-25` | 5×5 | 1024×1024 | 625×625 | Grid placeholder / AI |
| 角色三视图生成 | `char-tri-view` | 1×3 | 1024×341 | 625×250 | Grid placeholder / AI |
| 电影级光影校正 | `film-light` | 1×1 | — | 625×350 | simulateGeneration |
| 画面推演 - 3秒后 | `push-after-3s` | 1×1 | — | 625×350 | simulateGeneration |
| 画面推演 - 5秒前 | `push-before-5s` | 1×1 | — | 625×350 | simulateGeneration |

Single-image types (1×1) reuse the existing `simulateGeneration` path — no Canvas compositing needed.

## New Module: `src/lib/grid-generation.ts`

Standalone module, no React dependency. Handles both placeholder and AI generation.

### Types

```typescript
export interface GridConfig {
  gridType: string;
  rows: number;
  cols: number;
  outputSize: number;       // canvas dimension in px (e.g. 1024)
  nodeWidth: number;        // display width in the React Flow canvas
  nodeHeight: number;       // display height
}

export const GRID_CONFIGS: Record<string, GridConfig> = {
  "multi-cam-nine":  { gridType: "multi-cam-nine",  rows: 3, cols: 3, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "plot-push-four":  { gridType: "plot-push-four",  rows: 2, cols: 2, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "grid-25":         { gridType: "grid-25",         rows: 5, cols: 5, outputSize: 1024, nodeWidth: 625, nodeHeight: 625 },
  "char-tri-view":   { gridType: "char-tri-view",   rows: 1, cols: 3, outputSize: 1024, nodeWidth: 625, nodeHeight: 250 },
};
```

### `generateGridPlaceholder(sourceImageUrl, config): Promise<string>`

Phase C placeholder generator:

1. Load source image via `new Image()` with `crossOrigin = "anonymous"`
2. Create an offscreen `<canvas>`. For square grids (rows === cols): `outputSize × outputSize`. For non-square grids: width = `outputSize`, height = `Math.round(outputSize * rows / cols)`. Example: `char-tri-view` (1×3) → 1024×341
3. Compute `cellW = canvasWidth / cols`, `cellH = canvasHeight / rows`
4. For each cell `(row, col)`: draw the source image scaled to fill the cell via `ctx.drawImage()`
5. Draw white grid lines (2px) between cells
6. Return `canvas.toDataURL("image/png")`

### `generateGridWithAI(sourceImageUrl, config, signal?): Promise<string>`

Phase A+B real AI generation (implemented later):

1. Convert `sourceImageUrl` to base64 (fetch → blob → FileReader or canvas)
2. Look up the prompt template from `GRID_PROMPTS[config.gridType]`
3. Call Gemini API via existing project pattern (`@google/genai` SDK or existing `camera-angle-api.ts` helper)
   - Model: `gemini-3.1-flash-image-preview`
   - Contents: `[{ text: systemPrompt }, { inlineData: { mimeType: "image/png", data: base64 } }]`
   - Config: `responseModalities: ["TEXT", "IMAGE"]`
4. Extract `part.inlineData.data` from response → `data:image/png;base64,${data}`
5. Return the dataURL

### `isGridType(gridType: string): boolean`

Returns `true` if the gridType has a multi-cell config (exists in `GRID_CONFIGS`).

## New Module: `src/lib/grid-prompts.ts`

Prompt templates for Phase A+B, isolated from generation logic.

```typescript
export const GRID_PROMPTS: Record<string, () => string> = {
  "multi-cam-nine": () => MULTI_CAM_NINE_PROMPT,
  "plot-push-four": () => PLOT_PUSH_FOUR_PROMPT,
  "grid-25":        () => GRID_25_PROMPT,
  "char-tri-view":  () => CHAR_TRI_VIEW_PROMPT,
};
```

The `MULTI_CAM_NINE_PROMPT` is the TapNow 5-step system prompt verbatim (from `02-system-prompt.md`):
- Step 1: Scene Breakdown
- Step 2: Theme
- Step 3: Cinematic Approach (9 mandatory shot types)
- Step 4: Keyframe descriptions
- Step 5: Output ONE 3×3 master contact sheet image

Other templates follow the same structure but adapted for their grid size:
- `plot-push-four`: 4-frame narrative progression (2×2)
- `grid-25`: 25-frame continuous storyboard (5×5)
- `char-tri-view`: Character front/side/back orthographic views (1×3)

Phase C does not use these prompts — they are prepared for Phase A+B.

## Modifications to Existing Files

### `src/lib/spawn-output-node.ts`

**Changes:**

1. Add `gridType?: string` to `spawnOutputNode` parameters
2. Update `KIND_META["nine-grid"]` to use dynamic dimensions from `GRID_CONFIGS` when `gridType` is provided
3. In the routing logic after node creation:
   - If `gridType` exists in `GRID_CONFIGS` (multi-cell): call `simulateGridGeneration(nodeId, gridType, sourceImageUrl)`
   - If `gridType` is a single-image type or not provided: call existing `simulateGeneration(nodeId)`

**New function: `simulateGridGeneration(nodeId, gridType, sourceImageUrl)`**

```
1. Start progress simulation (same pattern as simulateGeneration)
2. Call generateGridPlaceholder(sourceImageUrl, GRID_CONFIGS[gridType])
3. On success: update node with { url: [dataUrl], taskInfo: { loading: false, status: 2 } }
4. On error: fall back to simulateGeneration behavior
```

Progress simulation uses the same interval pattern as `simulateGeneration` but completes faster (Canvas compositing is near-instant).

### `src/components/canvas/ToolbarDropdowns.tsx`

**Changes to `NineGridDropdown`:**

Current `onSelect` callback ignores the specific menu item — it always calls `onSelect()` without the key.

Change: `onSelect` now passes the specific grid type key.

```typescript
// Before
onSelect={() => handleSpawn("nine-grid")}

// After  
onSelect={(gridType) => handleSpawn("nine-grid", gridType)}
```

The `NineGridDropdown` already passes the key in `pick(label)` — but the parent (`ImageNode`) discards it. The fix is in `ImageNode`'s callback wiring.

### `src/components/canvas/nodes/ImageNode.tsx`

**Changes to `handleSpawn`:**

```typescript
// Before
const handleSpawn = useCallback((kind: OutputKind) => {
  const node = getNode(id);
  if (!node) return;
  spawnOutputNode(id, node.position, w, kind);
}, [id, getNode, w]);

// After
const handleSpawn = useCallback((kind: OutputKind, gridType?: string) => {
  const node = getNode(id);
  if (!node) return;
  spawnOutputNode(id, node.position, w, kind, undefined, undefined, gridType);
}, [id, getNode, w]);
```

**Changes to `NineGridDropdown` integration:**

```typescript
// Before
onSelect={() => handleSpawn("nine-grid")}

// After
onSelect={(gridType) => handleSpawn("nine-grid", gridType)}
```

## Data Flow Summary

### Phase C (Placeholder)

```
User → NineGridDropdown("multi-cam-nine")
  → ImageNode.handleSpawn("nine-grid", "multi-cam-nine")
  → spawnOutputNode(sourceId, pos, w, "nine-grid", ..., "multi-cam-nine")
  → creates node (loading, 625×625) + edge
  → simulateGridGeneration(nodeId, "multi-cam-nine", sourceUrl)
  → generateGridPlaceholder(sourceUrl, {rows:3, cols:3, outputSize:1024, ...})
  → Canvas: tile source image 3×3 + grid lines
  → dataURL → updateNodeData(nodeId, { url: [dataUrl] })
  → node displays 3×3 contact sheet placeholder
```

### Phase A+B (Real AI)

```
Same entry point, but simulateGridGeneration calls:
  → generateGridWithAI(sourceUrl, config, abortSignal)
  → Gemini API with TapNow 5-step prompt + source image
  → AI returns one 3×3 contact sheet image
  → dataURL → updateNodeData(nodeId, { url: [dataUrl] })
  → node displays AI-generated contact sheet
```

The switch from Phase C to A+B is a single function swap inside `simulateGridGeneration`.

## Error Handling

- **Image load failure** (CORS, network): Fall back to `simulateGeneration` (show source image as-is)
- **Canvas API failure** (getContext returns null): Fall back to `simulateGeneration`
- **AI generation failure** (Phase A+B): Show error status on node (`status: 3`), same pattern as existing `runRealGeneration`
- **AbortController**: Grid generation supports cancellation via the same `cancelGeneration` mechanism

## Testing Strategy

Phase C is purely client-side Canvas — no API mocking needed:

1. **Manual verification**: Click each grid menu item, verify correct grid dimensions appear
2. **Visual check**: Placeholder shows tiled source image with visible grid lines
3. **Edge cases**: Very small source images, very large source images, non-square aspect ratios
4. **Cancel flow**: Start generation → cancel → verify node shows error state

## File Summary

| File | Action | Description |
|---|---|---|
| `src/lib/grid-generation.ts` | **New** | Grid configs, placeholder generator, AI generator stub |
| `src/lib/grid-prompts.ts` | **New** | Prompt templates for AI generation (Phase A+B) |
| `src/lib/spawn-output-node.ts` | **Modify** | Add gridType param, route grid types to new generator |
| `src/components/canvas/ToolbarDropdowns.tsx` | **Modify** | Pass gridType key through onSelect callback |
| `src/components/canvas/nodes/ImageNode.tsx` | **Modify** | Wire gridType through handleSpawn to spawnOutputNode |
