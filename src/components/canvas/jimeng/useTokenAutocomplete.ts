import { useState, useCallback, useRef, useEffect } from 'react';
import { characterCardTokenManager, TokenSuggestion } from './characterCardTokenManager';
import { debounce } from 'lodash';
import type { MediaReference } from './mediaTypes';

interface UseTokenAutocompleteProps {
  onApplyToken: (newText: string, newCursorPosition: number) => void;
  maxSuggestions?: number;
  mediaReferences?: MediaReference[];
  volcengineArkMode?: boolean;
}

interface UseTokenAutocompleteReturn {
  visible: boolean;
  suggestions: TokenSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number };
  loading: boolean;
  handleTextChange: (text: string, cursorPosition: number, textAreaElement?: HTMLTextAreaElement, externalPosition?: { top: number; left: number }) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  handleSelect: (token: string) => boolean;
  handleClose: () => void;
  handleHover: (index: number) => void;
}

const MEDIA_TYPE_MAP = {
  image: { label: '图片', emoji: '📷', category: '参考图' },
  video: { label: '视频', emoji: '🎥', category: '参考视频' },
  audio: { label: '音频', emoji: '🎵', category: '参考音频' },
} as const;

export function useTokenAutocomplete({
  onApplyToken,
  maxSuggestions = 10,
  mediaReferences,
  volcengineArkMode = false,
}: UseTokenAutocompleteProps): UseTokenAutocompleteReturn {
  const [visible, setVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<TokenSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);

  const currentTextRef = useRef('');
  const currentCursorRef = useRef(0);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastAtPositionRef = useRef(-1);

  const mediaRefsRef = useRef(mediaReferences);
  mediaRefsRef.current = mediaReferences;
  const arkModeRef = useRef(volcengineArkMode);
  arkModeRef.current = volcengineArkMode;
  const maxRef = useRef(maxSuggestions);
  maxRef.current = maxSuggestions;
  const onApplyTokenRef = useRef(onApplyToken);
  onApplyTokenRef.current = onApplyToken;

  const getCaretCoordinates = useCallback((element: HTMLTextAreaElement, pos: number) => {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    ['font', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
      'whiteSpace', 'lineHeight', 'padding', 'border', 'boxSizing'].forEach(prop => {
      (div.style as unknown as Record<string, string>)[prop] =
        (style as unknown as Record<string, string>)[prop];
    });
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'hidden';
    div.style.width = element.clientWidth + 'px';
    div.style.height = element.clientHeight + 'px';
    div.textContent = element.value.substring(0, pos);
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);
    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    document.body.removeChild(div);
    return {
      top: spanRect.top - elementRect.top + element.scrollTop,
      left: spanRect.left - elementRect.left + element.scrollLeft,
    };
  }, []);

  const updateSuggestions = useRef(
    debounce(async (prefix: string) => {
      setLoading(true);
      try {
        const cleanPrefix = prefix.replace(/^@/, '').toLowerCase();
        const refs = mediaRefsRef.current;
        const isArk = arkModeRef.current;
        const max = maxRef.current;

        const mediaSuggestions: TokenSuggestion[] = [];
        if (refs && refs.length > 0) {
          for (const ref of refs) {
            const meta = MEDIA_TYPE_MAP[ref.type];
            const displayLabel = ref.label || `${meta.label}${ref.index}`;
            const tokenKey = `【@${meta.label}${ref.index}】`;
            if (!cleanPrefix || displayLabel.toLowerCase().includes(cleanPrefix) || ref.type.includes(cleanPrefix) || meta.label.includes(cleanPrefix)) {
              mediaSuggestions.push({
                key: tokenKey,
                value: ref.fileName || `${meta.category} ${ref.index}`,
                description: `插入 ${displayLabel} 引用`,
                category: meta.category,
                type: 'image_ref',
                thumbnail: ref.thumbnail,
                usageCount: 0,
                isFavorite: false,
                metadata: { mediaType: ref.type, emoji: meta.emoji, displayLabel },
              });
            }
          }
        }

        let charSuggestions: TokenSuggestion[] = [];
        if (!isArk) {
          charSuggestions = await characterCardTokenManager.getSuggestions(prefix, {
            maxResults: max, includeCharacters: true, includeTokens: true, favoriteFirst: true, sortBy: 'usage',
          });
        }

        const combined = [...mediaSuggestions, ...charSuggestions].slice(0, max);
        setSuggestions(combined);
        setSelectedIndex(0);
      } catch (error) {
        console.error('[useTokenAutocomplete] 获取建议失败:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 80)
  ).current;

  const detectAt = useCallback((text: string, cursorPosition: number) => {
    let atPosition = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      if (/[\s\n\r,，。！？!?;；]/.test(char)) break;
      if (char === '@') { atPosition = i; break; }
    }
    if (atPosition === -1) return null;
    const prefix = text.substring(atPosition, cursorPosition);
    const isValidPosition = atPosition === 0 || /[\s\n\r】）})\]」』]/.test(text[atPosition - 1]);
    return { atPosition, prefix, shouldShow: isValidPosition && prefix.length >= 1 };
  }, []);

  const handleTextChange = useCallback((
    text: string,
    cursorPosition: number,
    textAreaElement?: HTMLTextAreaElement,
    externalPosition?: { top: number; left: number }
  ) => {
    if (cursorPosition >= 2 && text[cursorPosition - 1] === '@') {
      const prevChar = text[cursorPosition - 2];
      if (prevChar && !/[\s\n\r,，。！？!?;；】）})\]」』]/.test(prevChar)) {
        text = text.substring(0, cursorPosition - 1) + ' @' + text.substring(cursorPosition);
        cursorPosition += 1;
        onApplyTokenRef.current(text, cursorPosition);
      }
    }

    currentTextRef.current = text;
    currentCursorRef.current = cursorPosition;
    if (textAreaElement) textAreaRef.current = textAreaElement;

    const detection = detectAt(text, cursorPosition);
    if (!detection || !detection.shouldShow) {
      setVisible(false);
      lastAtPositionRef.current = -1;
      return;
    }

    lastAtPositionRef.current = detection.atPosition;
    if (externalPosition) {
      setPosition({ top: externalPosition.top + 25, left: externalPosition.left });
    } else if (textAreaRef.current) {
      const caretPos = getCaretCoordinates(textAreaRef.current, detection.atPosition);
      const rect = textAreaRef.current.getBoundingClientRect();
      setPosition({ top: rect.top + caretPos.top + 25, left: rect.left + caretPos.left });
    }

    updateSuggestions(detection.prefix);
    setVisible(true);
  }, [getCaretCoordinates, detectAt, updateSuggestions]);

  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const handleSelect = useCallback((token: string): boolean => {
    const text = currentTextRef.current;
    const cursor = currentCursorRef.current;
    let inserted = false;

    if (token.startsWith('【@')) {
      let atPos = -1;
      for (let i = cursor - 1; i >= 0; i--) {
        if (text[i] === '@') { atPos = i; break; }
      }
      if (atPos >= 0) {
        const before = text.substring(0, atPos);
        const after = text.substring(cursor);
        const sBefore = before.length > 0 && before[before.length - 1] !== ' ' && before[before.length - 1] !== '\n' ? ' ' : '';
        const sAfter = after.length > 0 && after[0] !== ' ' && after[0] !== '\n' ? ' ' : '';
        const newText = before + sBefore + token + sAfter + after;
        const newCursor = before.length + sBefore.length + token.length + sAfter.length;
        onApplyTokenRef.current(newText, newCursor);
        inserted = true;
      }
      setVisible(false); setSuggestions([]); setSelectedIndex(0); lastAtPositionRef.current = -1;
      return inserted;
    }

    const { newText, newCursorPosition } = characterCardTokenManager.applyToken(text, cursor, token);
    onApplyTokenRef.current(newText, newCursorPosition);
    setVisible(false); setSuggestions([]); setSelectedIndex(0); lastAtPositionRef.current = -1;
    return true;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    if (!visibleRef.current || suggestionsRef.current.length === 0) return false;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestionsRef.current.length - 1);
        return true;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestionsRef.current.length - 1 ? prev + 1 : 0);
        return true;
      case 'Enter':
        e.preventDefault();
        const item = suggestionsRef.current[selectedIndexRef.current];
        if (item) handleSelect(item.key);
        return true;
      case 'Escape':
        e.preventDefault();
        setVisible(false); setSuggestions([]); setSelectedIndex(0); lastAtPositionRef.current = -1;
        return true;
      case ' ':
        setVisible(false); setSuggestions([]); setSelectedIndex(0); lastAtPositionRef.current = -1;
        return false;
      default: return false;
    }
  }, [handleSelect]);

  const handleClose = useCallback(() => {
    setVisible(false); setSuggestions([]); setSelectedIndex(0); lastAtPositionRef.current = -1;
  }, []);

  const handleHover = useCallback((index: number) => { setSelectedIndex(index); }, []);

  useEffect(() => {
    return () => { updateSuggestions.cancel(); };
  }, [updateSuggestions]);

  return { visible, suggestions, selectedIndex, position, loading, handleTextChange, handleKeyDown, handleSelect, handleClose, handleHover };
}
