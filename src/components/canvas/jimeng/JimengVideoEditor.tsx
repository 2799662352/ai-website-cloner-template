"use client";
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, message, Switch, Popover, Image } from 'antd';
import {
  CloudUploadOutlined, CloseOutlined, VideoCameraOutlined,
  AudioOutlined, SendOutlined, PlusOutlined, CaretDownOutlined,
  PlaySquareOutlined, CodeSandboxOutlined, BulbOutlined, FolderOpenOutlined,
  UserOutlined, BorderOutlined, ClockCircleOutlined, SoundOutlined, GlobalOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensors, useSensor } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { SortableMediaItem } from './SortableMediaItem';
import { JimengRichInput, type JimengRichInputHandle } from './JimengRichInput';
import type { MediaReference } from './mediaTypes';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type {
  VolcengineArkVideoMode, ImageWithRole, VideoWithRole, AudioWithRole, UnifiedMedia,
} from './types';
import {
  VOLCENGINE_ARK_VIDEO_MODES, VOLCENGINE_ARK_MODELS, VOLCENGINE_ARK_RATIOS,
  isSeedance2Model, getArkModelConfig, genMediaUid,
} from './types';
import './JimengVideoEditor.css';

const MODE_LABELS: Record<string, string> = {
  text2video: '文生视频',
  first_frame: '首帧',
  first_last_frame: '首尾帧',
  reference_images: '参考图',
  multimodal_ref: '全能参考',
  edit_video: '编辑视频',
  extend_video: '延长视频',
};

function replaceFrameInOrder(
  prev: string[],
  oldUid: string | undefined,
  newUid: string,
  position: 'prepend' | 'append'
): string[] {
  const filtered = oldUid ? prev.filter(uid => uid !== oldUid) : prev;
  return position === 'prepend' ? [newUid, ...filtered] : [...filtered, newUid];
}

export interface JimengVideoEditorProps {
  prompt: string;
  setPrompt: (v: string) => void;
  onGenerate?: () => void;
  generatingCount?: number;
}

const JimengVideoEditor: React.FC<JimengVideoEditorProps> = ({
  prompt, setPrompt,
  onGenerate,
  generatingCount = 0,
}) => {
  const [volcengineArkMode, setVolcengineArkMode] = useState<VolcengineArkVideoMode>('text2video');
  const [arkModel, setArkModel] = useState('doubao-seedance-2-0-260128');
  const [arkRatio, setArkRatio] = useState('16:9');
  const [arkDuration, setArkDuration] = useState(10);
  const [arkSeed, setArkSeed] = useState<number | undefined>(undefined);
  const [arkGenerateAudio, setArkGenerateAudio] = useState(true);
  const [arkWebSearch, setArkWebSearch] = useState(false);

  const [arkImagesWithRoles, setArkImagesWithRoles] = useState<ImageWithRole[]>([]);
  const [arkVideosWithRoles, setArkVideosWithRoles] = useState<VideoWithRole[]>([]);
  const [arkAudiosWithRoles, setArkAudiosWithRoles] = useState<AudioWithRole[]>([]);
  const [mediaOrder, setMediaOrder] = useState<string[]>([]);

  const [modeOpen, setModeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [mediaPopoverOpen, setMediaPopoverOpen] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const pendingFrameRoleRef = useRef<'first_frame' | 'last_frame' | null>(null);
  const mediaTriggerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<Record<string, unknown> | null>(null);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<HTMLDivElement>(null);
  const uploadingRef = useRef(false);
  const [keepExpandedAfterDrag, setKeepExpandedAfterDrag] = useState(false);
  const richInputRef = useRef<JimengRichInputHandle | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isSeedance2 = isSeedance2Model(arkModel);
  const modelConfig = getArkModelConfig(arkModel);
  const durationRange = {
    min: modelConfig?.minDuration || 4,
    max: modelConfig?.maxDuration || 15,
  };
  const currentModelLabel = VOLCENGINE_ARK_MODELS.find(m => m.value === arkModel)?.label || arkModel;

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    if (!open && uploadingRef.current) return;
    setMediaPopoverOpen(open);
  }, []);

  const resetMedia = useCallback(() => {
    setArkImagesWithRoles([]);
    setArkVideosWithRoles([]);
    setArkAudiosWithRoles([]);
    setMediaOrder([]);
  }, []);

  const handleModeChange = useCallback((mode: VolcengineArkVideoMode) => {
    setVolcengineArkMode(mode);
    resetMedia();
    setModeOpen(false);
    setMediaPopoverOpen(false);
  }, [resetMedia]);

  const handleModelChange = useCallback((value: string) => {
    setArkModel(value);
    setVolcengineArkMode('text2video');
    resetMedia();
    setArkSeed(undefined);
    setModelOpen(false);
  }, [resetMedia]);

  const allMedia: UnifiedMedia[] = useMemo(() => {
    const lookup = new Map<string, UnifiedMedia>();
    arkImagesWithRoles.forEach((m, i) => {
      const id = m._uid || `img-${i}-${m.url.slice(-12)}`;
      const displayUrl = m.thumbnailUrl || m.url;
      lookup.set(id, { id, type: 'image', url: m.url, displayUrl, role: m.role, typedArrayIndex: i });
    });
    arkVideosWithRoles.forEach((m, i) => {
      const id = m._uid || `vid-${i}-${m.url.slice(-12)}`;
      lookup.set(id, { id, type: 'video', url: m.url, displayUrl: m.displayUrl || m.url, role: m.role, typedArrayIndex: i, thumbnail: m.thumbnail, duration: m.duration });
    });
    arkAudiosWithRoles.forEach((m, i) => {
      const id = m._uid || `aud-${i}-${m.url.slice(-12)}`;
      lookup.set(id, { id, type: 'audio', url: m.url, displayUrl: m.url, role: m.role, typedArrayIndex: i, duration: m.duration, label: `音频${i + 1}` });
    });
    const ordered = mediaOrder.map(uid => lookup.get(uid)).filter(Boolean) as UnifiedMedia[];
    const orderSet = new Set(mediaOrder);
    lookup.forEach((v, k) => { if (!orderSet.has(k)) ordered.push(v); });
    const typeCounts: Record<string, number> = { image: 0, video: 0, audio: 0 };
    ordered.forEach(item => { item.typedArrayIndex = typeCounts[item.type]; typeCounts[item.type]++; });
    return ordered;
  }, [arkImagesWithRoles, arkVideosWithRoles, arkAudiosWithRoles, mediaOrder]);

  const handleImageUpload = useCallback(async (file: File, role: 'first_frame' | 'last_frame' | 'reference_image') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newUid = genMediaUid();
      if (role === 'first_frame' || role === 'last_frame') {
        const oldItem = arkImagesWithRoles.find(img => img.role === role);
        setArkImagesWithRoles(prev => {
          const rest = prev.filter(img => img.role !== role);
          return role === 'first_frame' ? [{ url, role, _uid: newUid }, ...rest] : [...rest, { url, role, _uid: newUid }];
        });
        setMediaOrder(prev => replaceFrameInOrder(prev, oldItem?._uid, newUid, role === 'first_frame' ? 'prepend' : 'append'));
      } else {
        setArkImagesWithRoles(prev => [...prev, { url, role, _uid: newUid }]);
        setMediaOrder(prev => [...prev, newUid]);
      }
      setMediaPopoverOpen(false);
    };
    reader.readAsDataURL(file);
    return false;
  }, [arkImagesWithRoles]);

  const handleUnifiedUpload = useCallback(async (file: File) => {
    uploadingRef.current = true;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    try {
      if (isImage) {
        if (volcengineArkMode === 'first_frame') {
          await handleImageUpload(file, 'first_frame');
        } else if (volcengineArkMode === 'first_last_frame') {
          if (!arkImagesWithRoles.find(i => i.role === 'first_frame')) {
            await handleImageUpload(file, 'first_frame');
          } else if (!arkImagesWithRoles.find(i => i.role === 'last_frame')) {
            await handleImageUpload(file, 'last_frame');
          } else {
            message.warning('最多上传2张图片');
          }
        } else {
          await handleImageUpload(file, 'reference_image');
        }
      } else if (isVideo) {
        const newUid = genMediaUid();
        const localUrl = URL.createObjectURL(file);
        setArkVideosWithRoles(prev => [...prev, { url: localUrl, role: 'reference_video' as const, _uid: newUid }]);
        setMediaOrder(prev => [...prev, newUid]);
        message.success('已添加视频参考');
      } else if (isAudio) {
        const newUid = genMediaUid();
        const localUrl = URL.createObjectURL(file);
        setArkAudiosWithRoles(prev => [...prev, { url: localUrl, role: 'reference_audio' as const, _uid: newUid }]);
        setMediaOrder(prev => [...prev, newUid]);
        message.success('已添加音频参考');
      } else {
        message.warning('不支持的文件类型');
      }
    } finally {
      uploadingRef.current = false;
      setMediaPopoverOpen(false);
    }
    return false;
  }, [volcengineArkMode, arkImagesWithRoles, handleImageUpload]);

  const handleUnifiedUploadRef = useRef(handleUnifiedUpload);
  handleUnifiedUploadRef.current = handleUnifiedUpload;

  const removeMedia = useCallback((type: string, typedArrayIndex: number) => {
    const target = allMedia.find(m => m.type === type && m.typedArrayIndex === typedArrayIndex);
    if (!target) return;
    setMediaOrder(prev => prev.filter(uid => uid !== target.id));
    if (type === 'image') setArkImagesWithRoles(p => p.filter(item => item._uid !== target.id));
    else if (type === 'video') setArkVideosWithRoles(p => p.filter(item => item._uid !== target.id));
    else if (type === 'audio') setArkAudiosWithRoles(p => p.filter(item => item._uid !== target.id));
  }, [allMedia]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData((event.active.data.current ?? null) as Record<string, unknown> | null);
    setKeepExpandedAfterDrag(false);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setActiveDragData(null);
    setKeepExpandedAfterDrag(true);
    const trigger = mediaTriggerRef.current;
    if (trigger) {
      setTimeout(() => { if (!trigger.matches(':hover')) setKeepExpandedAfterDrag(false); }, 150);
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = mediaOrder;
    const oldIdx = oldOrder.indexOf(active.id as string);
    const newIdx = oldOrder.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    setMediaOrder(arrayMove(oldOrder, oldIdx, newIdx));
  }, [mediaOrder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveDragData(null);
    setKeepExpandedAfterDrag(true);
    const trigger = mediaTriggerRef.current;
    if (trigger) {
      setTimeout(() => { if (!trigger.matches(':hover')) setKeepExpandedAfterDrag(false); }, 150);
    }
  }, []);

  const handleRoleChange = useCallback((type: string, index: number, newRole: string) => {
    if (type !== 'image') return;
    setArkImagesWithRoles(prev => prev.map((img, i) => {
      if ((newRole === 'first_frame' || newRole === 'last_frame') && img.role === newRole && i !== index)
        return { ...img, role: 'reference_image' as const };
      if (i === index) return { ...img, role: newRole as ImageWithRole['role'] };
      return img;
    }));
  }, []);

  const mediaReferences: MediaReference[] = useMemo(() => {
    const refs: MediaReference[] = [];
    let imgIdx = 1, vidIdx = 1, audIdx = 1;
    allMedia.forEach(m => {
      if (m.type === 'image') {
        refs.push({ index: imgIdx++, type: 'image', thumbnail: m.displayUrl, url: m.url, label: m.role === 'first_frame' ? '首帧' : m.role === 'last_frame' ? '尾帧' : undefined });
      } else if (m.type === 'video') {
        refs.push({ index: vidIdx++, type: 'video', thumbnail: m.thumbnail, url: m.url, duration: m.duration });
      } else if (m.type === 'audio') {
        refs.push({ index: audIdx++, type: 'audio', url: m.url, duration: m.duration, label: m.label });
      }
    });
    return refs;
  }, [allMedia]);

  const handleContainerDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) e.currentTarget.classList.add('drag-over');
  }, []);
  const handleContainerDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) e.currentTarget.classList.remove('drag-over');
  }, []);
  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    e.currentTarget.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleUnifiedUploadRef.current(file);
  }, []);

  const renderFrameSlotOptions = (role: 'first_frame' | 'last_frame') => (
    <div className="jm-media-list" style={{ minWidth: 'auto' }}>
      <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => { handleImageUpload(f, role); return false; }}>
        <div className="jm-media-add"><PlusOutlined style={{ fontSize: 16 }} /><span>上传</span></div>
      </Upload>
    </div>
  );

  const renderAddMenu = () => (
    <div className="jm-add-menu">
      <Upload
        accept={['multimodal_ref', 'edit_video'].includes(volcengineArkMode)
          ? 'image/*,video/mp4,video/quicktime,.mp4,.mov,audio/wav,audio/mpeg,audio/mp3,.wav,.mp3'
          : 'image/*'}
        showUploadList={false}
        beforeUpload={handleUnifiedUpload}
        multiple
      >
        <div className="jm-add-menu-item"><CloudUploadOutlined /><span>上传</span></div>
      </Upload>
      <div className="jm-add-menu-item" onClick={() => { setMediaPopoverOpen(false); message.info('素材库开发中'); }}>
        <FolderOpenOutlined /><span>素材库</span>
      </div>
      <div className="jm-add-menu-item" onClick={() => { setMediaPopoverOpen(false); message.info('人像库开发中'); }}>
        <UserOutlined /><span>人像库</span>
      </div>
    </div>
  );

  const handleGenerate = useCallback(() => {
    if (onGenerate) onGenerate();
    else message.info('生成功能开发中');
  }, [onGenerate]);

  return (
    <div
      className="jm-editor-container"
      onDragEnter={handleContainerDragEnter}
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
    >
      <div className="jm-editor-top">
        {volcengineArkMode === 'text2video' ? null :
         (volcengineArkMode === 'first_frame' || volcengineArkMode === 'first_last_frame') ? (
          <div className="jm-fl-panel">
            {(() => {
              const ff = arkImagesWithRoles.find(i => i.role === 'first_frame');
              const ffDisplay = ff ? (ff.thumbnailUrl || ff.url) : '';
              return ff ? (
                <div className="jm-fl-slot filled">
                  <img src={ffDisplay} alt="首帧" />
                  <button className="jm-fl-remove" onClick={(e) => {
                    e.stopPropagation();
                    const item = arkImagesWithRoles.find(i => i.role === 'first_frame');
                    if (item?._uid) setMediaOrder(prev => prev.filter(uid => uid !== item._uid));
                    setArkImagesWithRoles(p => p.filter(i => i.role !== 'first_frame'));
                  }}><CloseOutlined /></button>
                </div>
              ) : (
                <Popover content={renderFrameSlotOptions('first_frame')} trigger="click" placement="bottom" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                  <div className="jm-fl-slot"><div className="jm-fl-add"><PlusOutlined /><span>首帧</span></div></div>
                </Popover>
              );
            })()}
            {volcengineArkMode === 'first_last_frame' && (
              <>
                <div className="jm-fl-arrow">⇌</div>
                {(() => {
                  const lf = arkImagesWithRoles.find(i => i.role === 'last_frame');
                  const lfDisplay = lf ? (lf.thumbnailUrl || lf.url) : '';
                  return lf ? (
                    <div className="jm-fl-slot filled">
                      <img src={lfDisplay} alt="尾帧" />
                      <button className="jm-fl-remove" onClick={(e) => {
                        e.stopPropagation();
                        const item = arkImagesWithRoles.find(i => i.role === 'last_frame');
                        if (item?._uid) setMediaOrder(prev => prev.filter(uid => uid !== item._uid));
                        setArkImagesWithRoles(p => p.filter(i => i.role !== 'last_frame'));
                      }}><CloseOutlined /></button>
                    </div>
                  ) : (
                    <Popover content={renderFrameSlotOptions('last_frame')} trigger="click" placement="bottom" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                      <div className="jm-fl-slot"><div className="jm-fl-add"><PlusOutlined /><span>尾帧</span></div></div>
                    </Popover>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          <div ref={mediaTriggerRef} className={`jm-media-trigger ${allMedia.length > 0 ? 'has-media' : ''} ${mediaPopoverOpen ? 'popover-open' : ''} ${activeId || keepExpandedAfterDrag ? 'is-dragging' : ''}`} onMouseLeave={() => { if (keepExpandedAfterDrag) setKeepExpandedAfterDrag(false); }}>
            {allMedia.length === 0 ? (
              <Popover content={renderAddMenu()} trigger="click" placement="bottomLeft" open={mediaPopoverOpen} onOpenChange={handlePopoverOpenChange} arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                <div className="jm-empty-box"><PlusOutlined style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }} /><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>参考内容</span></div>
              </Popover>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <SortableContext items={allMedia.slice(0, 20).map(m => m.id)} strategy={horizontalListSortingStrategy}>
                  <div className="jm-stack-container" style={{ '--media-count': Math.min(allMedia.length, 20) } as React.CSSProperties}>
                    {allMedia.slice(0, 20).map((m, idx) => {
                      const rot = (idx % 2 === 0 ? -1 : 1) * (3 + (idx % 3) * 0.8);
                      const tx = (idx % 2 === 0 ? -1 : 1) * 2;
                      const ty = (idx % 2 === 0 ? 1 : -1) * 1.5;
                      return (
                        <SortableMediaItem key={m.id} id={m.id} media={m} isStackMode expandLeft={idx * 88}
                          onPreview={(src) => { setPreviewSrc(src); setPreviewVisible(true); }}
                          onRemove={removeMedia} onRoleChange={handleRoleChange}
                          style={{ zIndex: allMedia.length - idx, '--stack-rotate': `${rot}deg`, '--stack-tx': `${tx}px`, '--stack-ty': `${ty}px`, '--expand-left': `${idx * 88}px` } as React.CSSProperties}
                        />
                      );
                    })}
                    <Popover content={renderAddMenu()} trigger="click" placement="bottomLeft" open={mediaPopoverOpen} onOpenChange={handlePopoverOpenChange} arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
                      <div className="jm-stack-add-card" style={{ '--expand-left': `${Math.min(allMedia.length, 20) * 88}px` } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
                        <PlusOutlined style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)' }} />
                      </div>
                    </Popover>
                    <div className="jm-stack-plus" onClick={(e) => { e.stopPropagation(); setMediaPopoverOpen(true); }}><PlusOutlined /></div>
                  </div>
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={null}>
                    {activeId && typeof (activeDragData as { renderDragOverlay?: unknown } | null)?.renderDragOverlay === 'function'
                      ? (activeDragData as { renderDragOverlay: () => React.ReactNode }).renderDragOverlay()
                      : null}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>
            )}
          </div>
        )}

        <div className="jm-textarea-wrapper" style={{ minHeight: 56 }}>
          <JimengRichInput
            ref={richInputRef}
            value={prompt}
            onChange={setPrompt}
            placeholder={volcengineArkMode === 'text2video' ? "描述你想要生成的视频场景..." : "结合图片，描述你想生成的画面和动作。例如：海浪拍打着沙滩，粉色的月亮在天空缓缓升起。"}
            mediaReferences={mediaReferences}
          />
        </div>
      </div>

      <div className="jm-editor-bottom">
        <div className="jm-controls">
          <div className="jm-pill jm-pill-blue jm-pill-static" role="status" aria-label="当前任务类型：视频生成" title="当前任务：视频生成">
            <PlaySquareOutlined style={{ fontSize: 13 }} /><span className="jm-pill-text">视频生成</span>
          </div>

          <Popover open={modelOpen} onOpenChange={setModelOpen} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)' }}
            content={<div className="jm-popover-menu">{VOLCENGINE_ARK_MODELS.map(m => (
              <div key={m.value} className={`jm-menu-item ${m.value === arkModel ? 'selected' : ''}`} onClick={() => handleModelChange(m.value)}>
                <div className="jm-menu-item-title">{m.label}</div><div className="jm-menu-item-desc">{m.description}</div>
              </div>
            ))}</div>}
          >
            <div className="jm-pill"><CodeSandboxOutlined style={{ fontSize: 12 }} /><span className="jm-pill-text">{currentModelLabel.replace(/[🔥⚡⭐]/g, '').trim()}</span></div>
          </Popover>

          <Popover open={modeOpen} onOpenChange={setModeOpen} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)' }}
            content={<div className="jm-popover-menu">{VOLCENGINE_ARK_VIDEO_MODES.map(mode => {
              const supported = mode.supportedModels.includes('all') || mode.supportedModels.includes(arkModel);
              return (
                <div key={mode.value} className={`jm-menu-item ${mode.value === volcengineArkMode ? 'selected' : ''} ${!supported ? 'disabled' : ''}`} onClick={() => supported && handleModeChange(mode.value)}>
                  <div className="jm-menu-item-title">{mode.label}</div><div className="jm-menu-item-desc">{mode.description}</div>
                </div>
              );
            })}</div>}
          >
            <div className="jm-pill"><BulbOutlined /><span className="jm-pill-text">{MODE_LABELS[volcengineArkMode] || volcengineArkMode}</span><CaretDownOutlined className="jm-pill-arrow" /></div>
          </Popover>

          <Popover open={ratioOpen} onOpenChange={setRatioOpen} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)' }}
            content={<div className="jm-popover-menu">{VOLCENGINE_ARK_RATIOS.map(r => (
              <div key={r.value} className={`jm-menu-item ${r.value === arkRatio ? 'selected' : ''}`} onClick={() => { setArkRatio(r.value); setRatioOpen(false); }}>
                <div className="jm-menu-item-title">{r.label}</div>
              </div>
            ))}</div>}
          >
            <div className="jm-pill"><BorderOutlined style={{ fontSize: 13 }} /><span>{arkRatio}</span></div>
          </Popover>

          <Popover trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', padding: '6px' }}
            content={<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
              {Array.from({ length: durationRange.max - durationRange.min + 1 }, (_, i) => durationRange.min + i).map(d => (
                <button key={d} type="button" onClick={() => setArkDuration(d)}
                  style={{
                    minWidth: 40, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    background: d === arkDuration ? 'rgba(54,181,240,0.2)' : 'rgba(255,255,255,0.04)',
                    color: d === arkDuration ? '#5cc5f5' : 'rgba(255,255,255,0.65)',
                    padding: '0 8px',
                  }}
                  onMouseEnter={e => { if (d !== arkDuration) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { if (d !== arkDuration) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >{d}s</button>
              ))}
            </div>}
          >
            <div className="jm-pill"><ClockCircleOutlined style={{ fontSize: 12 }} /><span>{arkDuration}s</span></div>
          </Popover>

          {isSeedance2 && (
            <>
              <Popover
                content={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={0} max={4294967295} step={1} placeholder="留空=随机"
                    value={arkSeed ?? ''}
                    onChange={e => { const v = e.target.value; setArkSeed(v === '' ? undefined : Number(v)); }}
                    style={{
                      width: 140, height: 30, borderRadius: 8, padding: '0 10px', fontSize: 13,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e5e7eb', outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(54,181,240,0.4)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>固定→类似结果</span>
                </div>}
                trigger="click" placement="top" arrow={false} overlayInnerStyle={{ borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px' }}
              >
                <div className="jm-pill"><ExperimentOutlined style={{ fontSize: 12 }} /><span>{arkSeed !== undefined ? arkSeed : '随机'}</span></div>
              </Popover>
              <div className="jm-toggle-pill" title="有声视频">
                <SoundOutlined style={{ fontSize: 13 }} />
                <Switch checked={arkGenerateAudio} onChange={setArkGenerateAudio} size="small" />
              </div>
              <div className="jm-toggle-pill" title="联网搜索">
                <GlobalOutlined style={{ fontSize: 13 }} />
                <Switch checked={arkWebSearch} onChange={setArkWebSearch} size="small" />
              </div>
            </>
          )}

          <div className="jm-at-btn" onMouseDown={(e) => {
            e.preventDefault();
            if (richInputRef.current) {
              richInputRef.current.insertAtCursor('@');
            }
          }}>@</div>

          {!['text2video', 'first_frame', 'first_last_frame'].includes(volcengineArkMode) && (
            <Popover content={renderAddMenu()} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ padding: 0, borderRadius: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
              <div className="jm-add-pill"><PlusOutlined /></div>
            </Popover>
          )}
        </div>

        <button className={`jm-send-btn ${generatingCount > 0 ? 'generating' : ''}`} onClick={handleGenerate} title={generatingCount > 0 ? `${generatingCount} 个任务进行中` : '开始生成'}>
          <SendOutlined style={{ transform: 'rotate(-45deg)', marginLeft: -2, marginTop: 2 }} />
        </button>
      </div>

      <Image style={{ display: 'none' }} preview={{ visible: previewVisible, src: previewSrc, onVisibleChange: (v) => setPreviewVisible(v) }} />
    </div>
  );
};

export default JimengVideoEditor;
