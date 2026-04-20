const THUMB_MAX_SIZE = 200;
const TIMEOUT_MS = 12000;

function captureFrame(video: HTMLVideoElement): string | null {
  try {
    const vw = video.videoWidth || THUMB_MAX_SIZE;
    const vh = video.videoHeight || THUMB_MAX_SIZE;
    const scale = Math.min(THUMB_MAX_SIZE / vw, THUMB_MAX_SIZE / vh, 1);
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch { return null; }
}

let extractionQueue: Promise<unknown> = Promise.resolve();

function extractSingle(src: string, crossOrigin: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: string | null, video?: HTMLVideoElement) => {
      if (settled) return;
      settled = true;
      if (video) { video.onloadeddata = null; video.onseeked = null; video.onerror = null; video.src = ''; video.load(); }
      resolve(result);
    };
    try {
      const video = document.createElement('video');
      if (crossOrigin) video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = src;
      video.onloadeddata = () => { video.currentTime = Math.min(0.5, video.duration || 0.5); };
      video.onseeked = () => done(captureFrame(video), video);
      video.onerror = () => done(null, video);
      setTimeout(() => done(null, video), TIMEOUT_MS);
    } catch { done(null); }
  });
}

export function extractThumbnailFromFile(file: File): Promise<string | null> {
  const task = extractionQueue.then(() => {
    const objUrl = URL.createObjectURL(file);
    return extractSingle(objUrl, false).finally(() => URL.revokeObjectURL(objUrl));
  });
  extractionQueue = task.catch(() => null);
  return task;
}

export function extractThumbnailFromUrl(videoUrl: string): Promise<string | null> {
  const task = extractionQueue.then(async () => {
    return extractSingle(videoUrl, true);
  });
  extractionQueue = task.catch(() => null);
  return task;
}

export function toProxiedUrl(url: string): string {
  return url;
}
