"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CloseOutlined, VideoCameraOutlined, AudioOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { UnifiedMedia } from './types';

const instantDropLayoutChanges: AnimateLayoutChanges = (args) => {
  const { wasDragging } = args;
  if (wasDragging) return false;
  return defaultAnimateLayoutChanges(args);
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface SortableMediaItemProps {
  id: string;
  disabled?: boolean;
  media: UnifiedMedia;
  onPreview?: (src: string) => void;
  onRemove?: (type: string, index: number) => void;
  onRoleChange?: (type: string, index: number, newRole: string) => void;
  isStackMode?: boolean;
  expandLeft?: number;
  style?: React.CSSProperties;
}

export const SortableMediaItem: React.FC<SortableMediaItemProps> = ({
  id, disabled, media, onPreview, onRemove, onRoleChange, isStackMode, expandLeft = 0, style: customStyle
}) => {
  const { active } = useDndContext();

  const renderOverlay = useCallback(() => (
    <div className="jm-media-item jm-drag-overlay" style={{ width: 72, height: 90, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {media.type === 'image' && <img src={media.displayUrl || media.url} alt="参考" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {media.type === 'video' && (
        media.thumbnail
          ? <img src={media.thumbnail} alt="视频封面" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <VideoCameraOutlined style={{ fontSize: 24, color: '#9ca3af' }} />
      )}
      {media.type === 'audio' && <AudioOutlined style={{ fontSize: 24, color: '#9ca3af' }} />}
      {media.duration != null && <span className="jm-media-item-duration">{formatDuration(media.duration)}</span>}
    </div>
  ), [media]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: { draggable: !!disabled, droppable: false },
    data: { type: 'media', media, renderDragOverlay: renderOverlay },
    animateLayoutChanges: instantDropLayoutChanges,
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const wrapperStyle: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: active?.id ? transition : 'none',
    opacity: isDragging ? 0 : 1,
    position: 'absolute',
    top: 0,
    left: expandLeft,
    width: 72,
    height: 90,
  };

  const getRoleLabel = () => {
    if (media.type === 'image') {
      if (media.role === 'first_frame') return '首帧';
      if (media.role === 'last_frame') return '尾帧';
      return `图${media.typedArrayIndex + 1}`;
    }
    if (media.type === 'video') return `视频${media.typedArrayIndex + 1}`;
    return media.label || `音频${media.typedArrayIndex + 1}`;
  };

  const menuItems: MenuProps['items'] = media.type === 'image' ? [
    { key: 'first_frame', label: '设为首帧' },
    { key: 'last_frame', label: '设为尾帧' },
    { key: 'reference_image', label: '设为参考图' },
  ] : [];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (onRoleChange) onRoleChange(media.type, media.typedArrayIndex, key);
    setDropdownOpen(false);
  };

  const innerContent = (
    <div
      className={`jm-media-item ${isStackMode ? 'jm-stack-layer' : ''}`}
      style={customStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (onPreview) {
          if (media.type === 'image') onPreview(media.url);
          else if (media.type === 'video' && media.thumbnail) onPreview(media.thumbnail);
        }
      }}
    >
      {media.type === 'image' && <img src={media.displayUrl || media.url} alt="参考" draggable={false} />}
      {media.type === 'video' && (
        media.thumbnail
          ? <img src={media.thumbnail} alt="视频封面" draggable={false} />
          : <VideoCameraOutlined style={{ fontSize: 24, color: '#9ca3af' }} />
      )}
      {media.type === 'audio' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><AudioOutlined style={{ fontSize: 24, color: '#9ca3af' }} /></div>}

      {(media.type === 'audio' || (media.type === 'image' && (media.role === 'first_frame' || media.role === 'last_frame'))) && (
        <div className="jm-media-item-label">{getRoleLabel()}</div>
      )}
      {media.duration != null && (
        <span className="jm-media-item-duration">{formatDuration(media.duration)}</span>
      )}

      {onRemove && (
        <button className="jm-stack-delete" onClick={(e) => { e.stopPropagation(); onRemove(media.type, media.typedArrayIndex); }} onPointerDown={(e) => e.stopPropagation()}>
          <CloseOutlined />
        </button>
      )}
    </div>
  );

  const wrapped = (
    <div ref={setNodeRef} className="jm-sortable-wrap" style={wrapperStyle} {...attributes} {...listeners}>
      {innerContent}
    </div>
  );

  return media.type === 'image' ? (
    <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['contextMenu']} open={dropdownOpen} onOpenChange={setDropdownOpen}>
      {wrapped}
    </Dropdown>
  ) : wrapped;
};
