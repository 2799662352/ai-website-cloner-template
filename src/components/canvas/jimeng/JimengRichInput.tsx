import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { Image } from 'antd';
import TokenAutocomplete from './TokenAutocomplete';
import { useTokenAutocomplete } from './useTokenAutocomplete';
import type { MediaReference } from './mediaTypes';
import { ChipPreviewPopover } from './ChipPreviewPopover';

interface JimengRichInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  mediaReferences?: MediaReference[];
  onTokenSelect?: (token: string) => void;
}

export interface JimengRichInputHandle {
  focus: () => void;
  blur: () => void;
  readonly textAreaRef: HTMLDivElement | null;
  insertAtCursor: (text: string) => void;
}

function textToHtml(text: string, mediaRefs?: MediaReference[]): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  html = html.replace(/【@(图片|视频|音频)(\d+)】/g, (_match, type, idx) => {
    const typeKey = type === '图片' ? 'image' : type === '视频' ? 'video' : 'audio';
    const ref = mediaRefs?.find(r => r.type === typeKey && r.index === parseInt(idx, 10));
    const emoji = typeKey === 'image' ? '🖼' : typeKey === 'video' ? '🎬' : '🎵';
    const thumbHtml = ref?.thumbnail
      ? `<img src="${ref.thumbnail}" class="jm-token-thumb" />`
      : `<span class="jm-token-emoji">${emoji}</span>`;
    return `<span class="jm-token-node" contenteditable="false" data-token="${_match.replace(/"/g, '&quot;')}" data-thumb="${ref?.thumbnail?.substring(0, 100) || ''}" data-media-type="${typeKey}" data-media-index="${idx}">${thumbHtml}<span class="jm-token-label">${type}${idx}</span></span>`;
  });

  return html;
}

function extractPlainText(el: HTMLElement): string {
  let result = '';
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      result += n.textContent || '';
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const elem = n as HTMLElement;
      if (elem.classList.contains('jm-token-node')) {
        result += elem.getAttribute('data-token') || '';
      } else if (elem.tagName === 'BR') {
        result += '\n';
      } else {
        n.childNodes.forEach(c => walk(c));
      }
    }
  };
  walk(el);
  return result;
}

function getPlainTextAndCursor(el: HTMLElement): { text: string; cursor: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { text: extractPlainText(el), cursor: 0 };
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);

  const buildText = (root: Node): string => {
    let result = '';
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        result += n.textContent || '';
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const elem = n as HTMLElement;
        if (elem.classList.contains('jm-token-node')) {
          result += elem.getAttribute('data-token') || '';
        } else if (elem.tagName === 'BR') {
          result += '\n';
        } else {
          n.childNodes.forEach(c => walk(c));
        }
      }
    };
    walk(root);
    return result;
  };

  const fullText = buildText(el);
  const preFrag = preRange.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(preFrag);
  const cursor = buildText(tempDiv).length;

  return { text: fullText, cursor };
}

function getCaretRect(): { top: number; left: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  if (rect.top === 0 && rect.left === 0) {
    const span = document.createElement('span');
    span.textContent = '\u200b';
    range.insertNode(span);
    const spanRect = span.getBoundingClientRect();
    const result = { top: spanRect.top, left: spanRect.left };
    span.parentNode?.removeChild(span);
    sel.removeAllRanges();
    sel.addRange(range);
    return result;
  }
  return { top: rect.top, left: rect.left };
}

function setCursorByTextOffset(el: HTMLElement, targetOffset: number) {
  let remaining = targetOffset;
  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return true;
      }
      remaining -= len;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as HTMLElement;
      if (elem.classList.contains('jm-token-node')) {
        const tokenLen = (elem.getAttribute('data-token') || '').length;
        if (remaining <= tokenLen) {
          const range = document.createRange();
          range.setStartAfter(elem);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          return true;
        }
        remaining -= tokenLen;
      } else if (elem.tagName === 'BR') {
        if (remaining <= 1) {
          const range = document.createRange();
          range.setStartAfter(elem);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          return true;
        }
        remaining -= 1;
      } else {
        for (const child of Array.from(node.childNodes)) {
          if (walk(child)) return true;
        }
      }
    }
    return false;
  };

  if (!walk(el)) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

export const JimengRichInput = forwardRef<JimengRichInputHandle, JimengRichInputProps>(({
  value, onChange, placeholder, mediaReferences, onTokenSelect,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipSync = useRef(false);
  const lastValueRef = useRef(value);
  const lastMediaRefsRef = useRef(mediaReferences);
  const savedRangeRef = useRef<Range | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [hoverRef, setHoverRef] = useState<MediaReference | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [hoverVisible, setHoverVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current || !editorRef.current) return false;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); return true; }
    return false;
  }, []);

  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return; }
    if (!editorRef.current) return;
    const mediaRefsChanged = mediaReferences !== lastMediaRefsRef.current;
    if (value === lastValueRef.current && !mediaRefsChanged && editorRef.current.innerHTML) return;
    editorRef.current.innerHTML = textToHtml(value, mediaReferences);
    lastValueRef.current = value;
    lastMediaRefsRef.current = mediaReferences;
  }, [value, mediaReferences]);

  const {
    visible, suggestions, selectedIndex, position, loading,
    handleTextChange, handleKeyDown: hookKeyDown, handleSelect, handleClose, handleHover,
  } = useTokenAutocomplete({
    mediaReferences,
    volcengineArkMode: true,
    onApplyToken: (newText, newCursorPosition) => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = textToHtml(newText, mediaReferences);
      lastValueRef.current = newText;
      skipSync.current = true;
      onChange(newText);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        if (typeof newCursorPosition === 'number' && newCursorPosition >= 0) {
          setCursorByTextOffset(editorRef.current, newCursorPosition);
        } else {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 0);
    },
    maxSuggestions: 10,
  });

  const triggerAutocomplete = useCallback(() => {
    if (!editorRef.current) return;
    const { text, cursor } = getPlainTextAndCursor(editorRef.current);
    const caretPos = getCaretRect();
    handleTextChange(text, cursor, undefined, caretPos || undefined);
  }, [handleTextChange]);

  const onInput = useCallback(() => {
    if (!editorRef.current) return;
    const text = extractPlainText(editorRef.current);
    lastValueRef.current = text;
    skipSync.current = true;
    onChange(text);
    triggerAutocomplete();
  }, [onChange, triggerAutocomplete]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (visible && hookKeyDown(e)) { e.preventDefault(); return; }
  }, [visible, hookKeyDown]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const tokenNode = target.closest('.jm-token-node');
    if (tokenNode) {
      const thumb = tokenNode.querySelector('.jm-token-thumb') as HTMLImageElement;
      if (thumb && thumb.src) {
        setPreviewSrc(thumb.src);
        setPreviewVisible(true);
        e.preventDefault();
      }
    }
  }, []);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }, []);

  const startCloseTimer = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHoverVisible(false); setHoverRef(null); setHoverRect(null);
    }, 100);
  }, [cancelCloseTimer]);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const tokenNode = target.closest('.jm-token-node') as HTMLElement | null;
    if (!tokenNode) return;
    const mediaType = tokenNode.getAttribute('data-media-type') as 'image' | 'video' | 'audio' | null;
    const mediaIndex = tokenNode.getAttribute('data-media-index');
    if (!mediaType || !mediaIndex) return;
    const mRef = mediaReferences?.find(r => r.type === mediaType && r.index === parseInt(mediaIndex, 10));
    if (!mRef) return;
    cancelCloseTimer();
    setHoverRef(mRef);
    setHoverRect(tokenNode.getBoundingClientRect());
    setHoverVisible(true);
  }, [mediaReferences, cancelCloseTimer]);

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related) {
      if (related.closest?.('.jm-token-node') || related.closest?.('.chip-preview-popover')) return;
    }
    startCloseTimer();
  }, [startCloseTimer]);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    blur: () => editorRef.current?.blur(),
    get textAreaRef() { return editorRef.current; },
    insertAtCursor: (text: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      if (savedRangeRef.current) {
        try {
          const sel = window.getSelection();
          if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); }
        } catch { /* range may be stale */ }
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      const range = sel!.getRangeAt(0);
      range.collapse(false);
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel!.removeAllRanges();
      sel!.addRange(range);
      savedRangeRef.current = range.cloneRange();
      editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    },
  }));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder || '提示词输入框'}
        aria-placeholder={placeholder}
        tabIndex={0}
        className="jm-rich-input"
        onInput={onInput}
        onCompositionStart={() => {}}
        onCompositionEnd={onInput}
        onKeyDown={onKeyDown}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        onClick={handleEditorClick}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />

      <TokenAutocomplete
        visible={visible}
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        position={position}
        onSelect={(token) => {
          const ok = handleSelect(token);
          if (ok && onTokenSelect) onTokenSelect(token);
        }}
        onClose={handleClose}
        onHover={handleHover}
        loading={loading}
      />

      <Image
        style={{ display: 'none' }}
        preview={{
          open: previewVisible,
          src: previewSrc,
          onOpenChange: (v) => setPreviewVisible(v),
        }}
      />
      <ChipPreviewPopover
        visible={hoverVisible}
        mediaRef={hoverRef}
        anchorRect={hoverRect}
        onMouseEnter={cancelCloseTimer}
        onMouseLeave={startCloseTimer}
      />
    </div>
  );
});

JimengRichInput.displayName = 'JimengRichInput';
