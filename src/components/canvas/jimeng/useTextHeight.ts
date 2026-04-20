import { useRef, useCallback } from 'react';
import { prepare, layout, prepareWithSegments, layoutNextLine } from '@chenglou/pretext';

interface TextHeightOptions {
  font: string;
  lineHeight: number;
  whiteSpace?: 'normal' | 'pre-wrap';
  minHeight?: number;
  maxHeight?: number;
  padding?: number;
}

export interface Obstacle {
  width: number;
  height: number;
}

export function useTextHeight(options: TextHeightOptions) {
  const { font, lineHeight, whiteSpace = 'pre-wrap', minHeight = 0, maxHeight = Infinity, padding = 0 } = options;

  const preparedRef = useRef<{ key: string; val: ReturnType<typeof prepare> } | null>(null);
  const segmentsRef = useRef<{ key: string; val: ReturnType<typeof prepareWithSegments> } | null>(null);

  const cacheKey = useCallback((text: string) => `${text}\0${font}\0${whiteSpace}`, [font, whiteSpace]);

  const getHeight = useCallback((text: string, width: number, obstacle?: Obstacle): number => {
    if (!text || width <= 0) return minHeight;
    const key = cacheKey(text);

    if (!obstacle || obstacle.width <= 0 || obstacle.height <= 0) {
      let p: ReturnType<typeof prepare>;
      if (preparedRef.current?.key === key) { p = preparedRef.current.val; }
      else { p = prepare(text, font, { whiteSpace }); preparedRef.current = { key, val: p }; }
      const { height } = layout(p, width, lineHeight);
      return Math.max(minHeight, Math.min(maxHeight, height + padding));
    }

    let seg: ReturnType<typeof prepareWithSegments>;
    if (segmentsRef.current?.key === key) { seg = segmentsRef.current.val; }
    else { seg = prepareWithSegments(text, font, { whiteSpace }); segmentsRef.current = { key, val: seg }; }

    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    for (let i = 0; i < 2000; i++) {
      const availableWidth = y < obstacle.height ? width - obstacle.width : width;
      if (availableWidth <= 0) { y += lineHeight; continue; }
      const line = layoutNextLine(seg, cursor, availableWidth);
      if (line === null) break;
      cursor = line.end;
      y += lineHeight;
    }

    return Math.max(minHeight, Math.min(maxHeight, y + padding));
  }, [font, lineHeight, whiteSpace, minHeight, maxHeight, padding, cacheKey]);

  return { getHeight };
}
