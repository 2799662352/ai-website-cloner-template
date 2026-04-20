const API_KEY = "sk-8KMaMPxTh6lERmJQAbB1A6153536491d853e5c7f704c3c08";
const BASE_URL = "https://api.apiyi.com";
const MODEL = "gemini-3.1-flash-image-preview";

const AZIMUTH_MAP: Record<number, string> = {
  0: "from the front",
  45: "from the front-right at a 45-degree angle",
  90: "from the right side",
  135: "from the back-right at a 135-degree angle",
  180: "from the back",
  225: "from the back-left at a 225-degree angle",
  270: "from the left side",
  315: "from the front-left at a 315-degree angle",
};

const ELEVATION_MAP: Record<string, string> = {
  "-30": "looking up from a low angle",
  "0": "at eye level",
  "30": "from a slightly elevated angle looking down",
  "60": "from a high overhead angle looking down",
};

const DISTANCE_MAP: Record<string, string> = {
  "0.6": "as a close-up shot",
  "1": "at a medium distance",
  "1.4": "as a wide shot from further away",
};

function snapToNearest(value: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

export function buildCameraPrompt(
  horizontal: number,
  vertical: number,
  distance: number
): string {
  const azSnap = snapToNearest(horizontal, Object.keys(AZIMUTH_MAP).map(Number));
  const elSnap = snapToNearest(vertical, [-30, 0, 30, 60]);
  const distSnap = snapToNearest(distance, [0.6, 1.0, 1.4]);

  const azName = AZIMUTH_MAP[azSnap];
  const elName = ELEVATION_MAP[String(elSnap)];
  const distKey = distSnap === 1 ? "1" : distSnap.toFixed(1);
  const distName = DISTANCE_MAP[distKey];

  return `Rotate the camera to view this subject ${azName}, ${elName}, ${distName}. Keep the same subject, style, lighting, and background. Only change the camera angle and distance.`;
}

export interface CameraEditResult {
  success: boolean;
  imageDataUrl?: string;
  error?: string;
  prompt?: string;
}

async function imageUrlToBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  if (url.startsWith("data:image/")) {
    const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], data: match[2] };
    return null;
  }

  try {
    const resp = await fetch(url, { mode: "cors" });
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (m) resolve({ mimeType: m[1], data: m[2] });
        else resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function callGeminiImageEdit(
  imageSource: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<CameraEditResult> {
  const imageData = await imageUrlToBase64(imageSource);
  if (!imageData) {
    return { success: false, error: "无法加载输入图片", prompt };
  }

  const url = `${BASE_URL}/v1beta/models/${MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: imageData.mimeType, data: imageData.data } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {},
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error?.message || `API 错误: ${resp.status}`, prompt };
    }

    const images: string[] = [];
    if (data.candidates) {
      for (const candidate of data.candidates) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data) {
            images.push(`data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`);
          }
        }
      }
    }
    if (data.data) {
      for (const item of data.data) {
        if (item.url) images.push(item.url);
        if (item.b64_json) images.push(`data:image/png;base64,${item.b64_json}`);
      }
    }

    if (images.length === 0) {
      return { success: false, error: "未能从响应中提取图片", prompt };
    }

    return { success: true, imageDataUrl: images[0], prompt };
  } catch (err: unknown) {
    if (signal?.aborted) return { success: false, error: "已取消", prompt };
    return { success: false, error: err instanceof Error ? err.message : "请求失败", prompt };
  }
}

export async function generateCameraAngleEdit(
  imageSource: string,
  horizontal: number,
  vertical: number,
  zoom: number,
  signal?: AbortSignal,
): Promise<CameraEditResult> {
  const prompt = buildCameraPrompt(horizontal, vertical, zoom);
  return callGeminiImageEdit(imageSource, prompt, signal);
}

const LIGHT_DIR_MAP: Record<string, string> = {
  left: "from the left side",
  top: "from above",
  right: "from the right side",
  front: "from the front",
  bottom: "from below",
  back: "from behind",
};

export function buildLightingPrompt(
  direction: string,
  brightness: number,
  color: string,
  rimLight: boolean,
): string {
  const dirDesc = LIGHT_DIR_MAP[direction] || `from the ${direction}`;
  const intensityPct = Math.round(brightness * 25);
  const parts = [
    `Relight this image with a ${color} light source ${dirDesc} at ${intensityPct}% intensity.`,
  ];
  if (rimLight) parts.push("Add a subtle rim light to separate the subject from the background.");
  parts.push("Keep the same subject, composition, and background. Only change the lighting.");
  return parts.join(" ");
}

export async function generateLightingEdit(
  imageSource: string,
  direction: string,
  brightness: number,
  color: string,
  rimLight: boolean,
  signal?: AbortSignal,
): Promise<CameraEditResult> {
  const prompt = buildLightingPrompt(direction, brightness, color, rimLight);
  return callGeminiImageEdit(imageSource, prompt, signal);
}
