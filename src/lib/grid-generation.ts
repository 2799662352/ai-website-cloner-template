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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

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
