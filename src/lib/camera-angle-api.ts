const API_KEY = "sk-8KMaMPxTh6lERmJQAbB1A6153536491d853e5c7f704c3c08";
const BASE_URL = "https://api.apiyi.com";
const MODEL = "gemini-3.1-flash-image-preview";

const AZIMUTH_MAP: Record<number, string> = {
  0: "front view",
  45: "front-right quarter view",
  90: "right side view",
  135: "back-right quarter view",
  180: "back view",
  225: "back-left quarter view",
  270: "left side view",
  315: "front-left quarter view",
};

const ELEVATION_MAP: Record<number, string> = {
  "-30": "low-angle shot",
  "0": "eye-level shot",
  "30": "elevated shot",
  "60": "high-angle shot",
};

const DISTANCE_MAP: Record<number, string> = {
  0: "close-up",
  5: "medium shot",
  10: "wide shot",
};

function snapToNearest(value: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

export function buildCameraPrompt(
  horizontal: number,
  vertical: number,
  zoom: number
): string {
  const azSnap = snapToNearest(horizontal, Object.keys(AZIMUTH_MAP).map(Number));
  const elSnap = snapToNearest(vertical, Object.keys(ELEVATION_MAP).map(Number));
  const distSnap = snapToNearest(zoom, Object.keys(DISTANCE_MAP).map(Number));

  const azName = AZIMUTH_MAP[azSnap];
  const elName = ELEVATION_MAP[elSnap as keyof typeof ELEVATION_MAP];
  const distName = DISTANCE_MAP[distSnap];

  return `${azName} ${elName} ${distName}`;
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

export async function generateCameraAngleEdit(
  imageSource: string,
  horizontal: number,
  vertical: number,
  zoom: number,
  signal?: AbortSignal
): Promise<CameraEditResult> {
  const cameraPrompt = buildCameraPrompt(horizontal, vertical, zoom);
  const fullPrompt = `生成图片：${cameraPrompt}`;

  const imageData = await imageUrlToBase64(imageSource);
  if (!imageData) {
    return { success: false, error: "无法加载输入图片", prompt: cameraPrompt };
  }

  const url = `${BASE_URL}/v1beta/models/${MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: fullPrompt },
          {
            inline_data: {
              mime_type: imageData.mimeType,
              data: imageData.data,
            },
          },
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
      return {
        success: false,
        error: data.error?.message || `API 错误: ${resp.status}`,
        prompt: cameraPrompt,
      };
    }

    const images: string[] = [];
    if (data.candidates) {
      for (const candidate of data.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              images.push(
                `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`
              );
            }
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
      return {
        success: false,
        error: "未能从响应中提取图片",
        prompt: cameraPrompt,
      };
    }

    return { success: true, imageDataUrl: images[0], prompt: cameraPrompt };
  } catch (err: unknown) {
    if (signal?.aborted) {
      return { success: false, error: "已取消", prompt: cameraPrompt };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "请求失败",
      prompt: cameraPrompt,
    };
  }
}
