"use client";

import { memo, useState, useCallback, useMemo, useRef, useEffect, useImperativeHandle, forwardRef, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import type { ImageNodeData } from "@/types/canvas";
import { NodeShell } from "./NodeShell";
import {
  IconImage,
  IconSend,
  IconTranslate,
  IconChevronDown,
} from "../icons";
import { MultiAngleEditor } from "../MultiAngleEditor";
import { LightEditor } from "../LightEditor";
import { NineGridDropdown, GridSplitDropdown, HDDropdown } from "../ToolbarDropdowns";
import { spawnOutputNode, spawnAnnotationNode, spawnRotationNode } from "@/lib/spawn-output-node";
import { useCanvasStore } from "@/store/canvas-store";
import JimengVideoEditor from "../jimeng/JimengVideoEditor";
import { JimengRichInput, type JimengRichInputHandle } from "../jimeng/JimengRichInput";
import type { MediaReference } from "../jimeng/mediaTypes";
import { IMAGE_MODELS, IMAGE_RATIOS, IMAGE_QUALITIES, getRatioIconSize } from "../jimeng/imageConstants";
import { Upload, Popover } from "antd";
import {
  CaretDownOutlined, SendOutlined, CloseOutlined,
  AppstoreOutlined, BorderOutlined, VideoCameraOutlined,
} from "@ant-design/icons";
import "../jimeng/JimengVideoEditor.css";

function ImageNodeInner({ id, data, selected }: NodeProps & { data: ImageNodeData }) {
  const hasImage = data.url.length > 0 && data.url[0] !== "";
  const isGenerate = data.action === "image_generate";
  const w = Math.min(data.contentWidth, 627);
  const h = Math.min(data.contentHeight, 350);
  const [prompt, setPrompt] = useState(data.params?.prompt ?? "");
  const [activeEditor, setActiveEditor] = useState<"angle" | "light" | "annotate" | null>(null);
  const [annotColor, setAnnotColor] = useState("#e84040");
  const [annotTool, setAnnotTool] = useState<"pen" | "rect" | "text">("pen");
  const [annotBrush, setAnnotBrush] = useState(4);
  const annotCanvasRef = useRef<AnnotationCanvasHandle>(null);
  const isRotationNode = data.rotationMode === true;
  const [rotateDeg, setRotateDeg] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"nine" | "split" | "hd" | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const isGenerating = data.taskInfo?.loading === true;
  const showPanel = selected && hasImage && !isGenerating;
  const { getNode } = useReactFlow();

  // Image panel state
  const [imgModel, setImgModel] = useState(data.params?.model ?? 'lib-nano-pro');
  const [imgRatio, setImgRatio] = useState(data.params?.settings?.ratio ?? '16:9');
  const [imgQuality, setImgQuality] = useState(data.params?.settings?.quality ?? '4K');
  const [imgCount, setImgCount] = useState(data.params?.count ?? 1);
  const [refImages, setRefImages] = useState<Array<{ url: string; objectUrl?: string; nodeId?: string }>>(
    () => (data.params?.imageList ?? []).map(r => ({ url: r.url, nodeId: r.nodeId }))
  );
  const [imgModelOpen, setImgModelOpen] = useState(false);
  const [imgRatioOpen, setImgRatioOpen] = useState(false);
  const [imgCountOpen, setImgCountOpen] = useState(false);
  const [imgCameraOpen, setImgCameraOpen] = useState(false);
  const richInputRef = useRef<JimengRichInputHandle | null>(null);

  const imgModelLabel = IMAGE_MODELS.find(m => m.value === imgModel)?.label ?? imgModel;

  const imgMediaRefs: MediaReference[] = useMemo(() =>
    refImages.map((r, i) => ({
      index: i + 1,
      type: 'image' as const,
      thumbnail: r.objectUrl || r.url,
      url: r.objectUrl || r.url,
    })),
    [refImages]
  );

  const handleRefUpload = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setRefImages(prev => {
      if (prev.length >= 4) return prev;
      return [...prev, { url: objectUrl, objectUrl }];
    });
    return false;
  }, []);

  const removeRef = useCallback((index: number) => {
    setRefImages(prev => {
      const item = prev[index];
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const DARK_POPOVER_STYLE: React.CSSProperties = {
    padding: 0, borderRadius: 12, background: '#1e1e2e',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  };

  const toggleEditor = (editor: "angle" | "light" | "annotate") => {
    setActiveEditor(activeEditor === editor ? null : editor);
    setOpenDropdown(null);
  };
  const toggleDropdown = (key: "nine" | "split" | "hd") => {
    setOpenDropdown(openDropdown === key ? null : key);
    setActiveEditor(null);
  };

  const handleSpawn = useCallback((kind: "multi-angle" | "lighting" | "expand" | "nine-grid" | "grid-split", gridType?: string) => {
    const node = getNode(id);
    if (!node) return;
    spawnOutputNode(id, node.position, w, kind, undefined, undefined, gridType);
    setActiveEditor(null);
  }, [id, getNode, w]);

  const handleGenerate = useCallback(() => {
    const node = getNode(id);
    if (!node) return;
    if (!prompt.trim() && refImages.length === 0) return;
    spawnOutputNode(id, node.position, w, "expand");
  }, [id, getNode, w, prompt, refImages.length]);

  const handleRotateSpawn = useCallback(() => {
    const node = getNode(id);
    if (!node || !hasImage) return;
    spawnRotationNode(id, node.position, w, h, data.url[0]);
  }, [id, getNode, hasImage, w, h, data.url]);

  const handleDownload = useCallback(() => {
    if (!hasImage) return;
    const url = data.url[0];
    const filename = `${data.name || "image"}-${data.contentWidth}x${data.contentHeight}.png`;

    if (url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    fetch(url, { mode: "cors" })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(url, "_blank");
      });
  }, [hasImage, data.url, data.name, data.contentWidth, data.contentHeight]);

  const handlePreview = useCallback(() => {
    if (!hasImage) return;
    setShowPreview(true);
  }, [hasImage]);

  const handleAnnotationSave = useCallback(() => {
    const node = getNode(id);
    if (!node || !hasImage) return;
    const annotDataUrl = annotCanvasRef.current?.toDataURL();
    const sourceUrl = data.url[0];

    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = w;
    compositeCanvas.height = h;
    const ctx = compositeCanvas.getContext("2d");
    if (!ctx) return;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, w, h);
      if (annotDataUrl) {
        const overlayImg = new Image();
        overlayImg.onload = () => {
          ctx.drawImage(overlayImg, 0, 0, w, h);
          const resultUrl = compositeCanvas.toDataURL("image/png");
          spawnAnnotationNode(id, node.position, w, h, resultUrl);
          setActiveEditor(null);
        };
        overlayImg.src = annotDataUrl;
      } else {
        const resultUrl = compositeCanvas.toDataURL("image/png");
        spawnAnnotationNode(id, node.position, w, h, resultUrl);
        setActiveEditor(null);
      }
    };
    bgImg.src = sourceUrl;
  }, [id, getNode, hasImage, data.url, w, h]);

  const handleRotationSave = useCallback(() => {
    if (!hasImage) return;
    const sourceUrl = data.url[0];
    if (rotateDeg === 0 && !flipH && !flipV) {
      useCanvasStore.getState().updateNodeData(id, { rotationMode: false });
      return;
    }
    const isSwapped = rotateDeg === 90 || rotateDeg === 270;
    const outW = isSwapped ? h : w;
    const outH = isSwapped ? w : h;
    const offscreen = document.createElement("canvas");
    offscreen.width = outW;
    offscreen.height = outH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rotateDeg * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      const resultUrl = offscreen.toDataURL("image/png");
      useCanvasStore.getState().updateNodeData(id, {
        url: [resultUrl],
        contentWidth: outW,
        contentHeight: outH,
        rotationMode: false,
      });
      setRotateDeg(0);
      setFlipH(false);
      setFlipV(false);
    };
    img.src = sourceUrl;
  }, [id, hasImage, data.url, w, h, rotateDeg, flipH, flipV]);

  const resolution =
    data.contentWidth && data.contentHeight
      ? `${data.contentWidth} × ${data.contentHeight}`
      : "";

  /* ────── Context toolbar (above image, integrates node title) ────── */
  const contextToolbar = selected && hasImage ? (
    <div
      className="nodrag absolute left-1/2 z-30 -translate-x-1/2"
      style={{ top: -62 }}
    >
      {isRotationNode ? (
        /* ── Rotation & Mirror toolbar (on the spawned rotation node) ── */
        <div className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-2 py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { useCanvasStore.getState().updateNodeData(id, { rotationMode: false }); setRotateDeg(0); setFlipH(false); setFlipV(false); }}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 transition-colors hover:bg-white/10"
          >
            <ExitEditorIcon />
            <span className="text-[13px] font-medium text-fg-default">旋转与镜像</span>
          </button>
          <ToolbarSep />
          <TBIconBtn title="逆时针旋转90°" onClick={() => setRotateDeg((d) => (d - 90 + 360) % 360)}><RotateCCWIcon /></TBIconBtn>
          <span className="min-w-[32px] text-center text-[13px] text-fg-default">{rotateDeg}°</span>
          <TBIconBtn title="顺时针旋转90°" onClick={() => setRotateDeg((d) => (d + 90) % 360)}><RotateCWIcon /></TBIconBtn>
          <ToolbarSep />
          <TBIconBtn title="水平翻转" onClick={() => setFlipH((f) => !f)}><FlipHIcon active={flipH} /></TBIconBtn>
          <TBIconBtn title="垂直翻转" onClick={() => setFlipV((f) => !f)}><FlipVIcon active={flipV} /></TBIconBtn>
          <ToolbarSep />
          <button
            type="button"
            onClick={handleRotationSave}
            className="ml-1 rounded-lg bg-fg-default px-3 py-1 text-[13px] font-medium text-canvas-bg transition-colors hover:opacity-90"
          >
            保存
          </button>
        </div>
      ) : activeEditor === "annotate" ? (
        /* ── Annotation toolbar ── */
        <div className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-2 py-1 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveEditor(null)}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 transition-colors hover:bg-white/10"
          >
            <ExitEditorIcon />
            <span className="text-[13px] font-medium text-fg-default">标注</span>
          </button>
          <ToolbarSep />
          <AnnotToolBtn icon={<PenToolIcon />} active={annotTool === "pen"} onClick={() => setAnnotTool("pen")} title="画笔" />
          <AnnotToolBtn icon={<RectToolIcon />} active={annotTool === "rect"} onClick={() => setAnnotTool("rect")} title="框选" />
          <AnnotToolBtn icon={<TextToolIcon />} active={annotTool === "text"} onClick={() => setAnnotTool("text")} title="文字" />
          <ToolbarSep />
          <div className="relative flex h-7 w-7 items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-white/20" style={{ backgroundColor: annotColor }} />
            <input
              type="color"
              value={annotColor}
              onChange={(e) => setAnnotColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              title="颜色"
            />
          </div>
          <div className="flex items-center gap-1.5 px-1">
            <BrushIcon />
            <input
              type="range"
              min={1}
              max={20}
              value={annotBrush}
              onChange={(e) => setAnnotBrush(Number(e.target.value))}
              className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
            />
          </div>
          <ToolbarSep />
          <TBIconBtn title="撤销" onClick={() => annotCanvasRef.current?.undo()}><UndoIcon /></TBIconBtn>
          <TBIconBtn title="重做" onClick={() => annotCanvasRef.current?.redo()}><RedoIcon /></TBIconBtn>
          <button
            type="button"
            onClick={handleAnnotationSave}
            className="ml-1 rounded-lg bg-fg-default px-3 py-1 text-[13px] font-medium text-canvas-bg transition-colors hover:opacity-90"
          >
            保存
          </button>
        </div>
      ) : (
        /* ── Normal toolbar ── */
        <div className="flex items-center gap-0 whitespace-nowrap rounded-xl border border-[var(--canvas-node-border)] bg-[var(--Surface-Panel-background)] px-1 py-0.5 shadow-lg">
          <TBBtn label="多角度" icon={<MultiAngleIcon />} active={activeEditor === "angle"} onClick={() => toggleEditor("angle")} />
          <TBBtn label="打光" icon={<LightIcon />} active={activeEditor === "light"} onClick={() => toggleEditor("light")} />
          <NineGridDropdown
            open={openDropdown === "nine"}
            onToggle={() => toggleDropdown("nine")}
            onSelect={(gridType) => handleSpawn("nine-grid", gridType)}
            trigger={<TBBtn label="九宫格" icon={<GridNineIcon />} hasDropdown active={openDropdown === "nine"} />}
          />
          <HDDropdown
            open={openDropdown === "hd"}
            onToggle={() => toggleDropdown("hd")}
            onSelect={(item) => {
              if (item === "expand") handleSpawn("expand");
            }}
            trigger={<TBBtn label="高清" icon={<HDIcon />} hasDropdown active={openDropdown === "hd"} />}
          />
          <GridSplitDropdown
            open={openDropdown === "split"}
            onToggle={() => toggleDropdown("split")}
            onSelect={() => handleSpawn("grid-split")}
            trigger={<TBBtn label="宫格切分" icon={<GridSplitIcon />} hasDropdown active={openDropdown === "split"} />}
          />

          <ToolbarSep />

          <TBIconBtn title="标注" onClick={() => toggleEditor("annotate")}><AnnotateIcon /></TBIconBtn>
          <TBIconBtn title="旋转" onClick={handleRotateSpawn}><RotateIcon /></TBIconBtn>
          <TBIconBtn title="下载" onClick={handleDownload}><DownloadIcon /></TBIconBtn>
          <TBIconBtn title="预览" onClick={handlePreview}><PreviewIcon /></TBIconBtn>
        </div>
      )}
    </div>
  ) : undefined;

  /* ────── Editor overlays (multi-angle / lighting) ────── */
  const editorOverlay = selected && hasImage && activeEditor && activeEditor !== "annotate" && !isRotationNode ? (
    <div className="p-3 pb-0">
      {activeEditor === "angle" && (
        <MultiAngleEditor
          onClose={() => setActiveEditor(null)}
          onApply={(params) => {
            const node = getNode(id);
            if (!node) return;
            const sourceUrl = hasImage ? data.url[0] : undefined;
            spawnOutputNode(id, node.position, w, "multi-angle", {
              horizontal: params.horizontal,
              vertical: params.vertical,
              distance: params.zoom,
              imageUrl: sourceUrl,
            });
            setActiveEditor(null);
          }}
          imageUrl={hasImage ? data.url[0] : undefined}
        />
      )}
      {activeEditor === "light" && (
        <LightEditor
          onClose={() => setActiveEditor(null)}
          onApply={(params) => {
            const node = getNode(id);
            if (!node) return;
            const sourceUrl = hasImage ? data.url[0] : undefined;
            spawnOutputNode(id, node.position, w, "lighting", undefined, {
              direction: params.direction,
              brightness: params.brightness,
              color: params.color,
              rimLight: params.rimLight,
              imageUrl: sourceUrl,
            });
            setActiveEditor(null);
          }}
          imageUrl={hasImage ? data.url[0] : undefined}
        />
      )}
    </div>
  ) : undefined;

  /* ────── Floating control panel (below image) ────── */
  const controlPanel = showPanel ? (
    panelExpanded ? (
      /* ═══ Expanded panel — Jimeng Video Editor ═══ */
      <div className="nodrag nowheel relative w-full">
        <button
          type="button"
          onClick={() => setPanelExpanded(false)}
          className="absolute right-2 top-1.5 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-muted/60 transition-colors hover:bg-white/5 hover:text-fg-default"
          title="收起"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
        <JimengVideoEditor prompt={prompt} setPrompt={setPrompt} />
      </div>
    ) : (
      /* ═══ Collapsed panel — Image Generation ═══ */
      <div className="relative flex min-h-0 w-full flex-col gap-2.5 p-3.5">
        {/* Row 1: Tool buttons + Reference images */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <PanelToolBtn icon={<StyleIcon />} label="风格" disabled title="风格库 · 即将推出" />
            <PanelToolBtn icon={<MarkIcon />} label="标记" disabled title="区域标记 · 即将推出" />
            <PanelToolBtn icon={<FocusIcon />} label="聚焦" disabled title="主体聚焦 · 即将推出" />
          </div>
          {refImages.length > 0 && <div className="h-6 w-px bg-white/[0.06]" />}
          <div className="flex items-center gap-2">
            {refImages.map((ref, i) => (
              <div key={ref.nodeId || i} className="group relative">
                <RefBadge index={i + 1} url={ref.objectUrl || ref.url} />
                <button
                  type="button"
                  onClick={() => removeRef(i)}
                  className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[8px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                ><CloseOutlined style={{ fontSize: 8 }} /></button>
              </div>
            ))}
            {refImages.length < 4 && (
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleRefUpload}>
                <button
                  type="button"
                  className="nodrag group flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-white/30 transition-all duration-150 hover:border-[#36b5f0]/50 hover:bg-[#36b5f0]/[0.06] hover:text-[#5cc5f5]"
                  title="添加参考图"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform duration-150 group-hover:rotate-90">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </Upload>
            )}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setPanelExpanded(true)}
            className="nodrag flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/45 transition-all duration-150 hover:bg-white/[0.08] hover:text-white/90"
            title="展开完整编辑器"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Row 2: Rich Input */}
        <div className="nodrag" style={{ minHeight: 60 }}>
          <JimengRichInput
            ref={richInputRef}
            value={prompt}
            onChange={setPrompt}
            placeholder="描述你想要生成的画面内容，按/呼出指令，@引用素材"
            mediaReferences={imgMediaRefs}
          />
        </div>

        {/* Row 3: Popover selectors + actions */}
        <div className="flex w-full items-center gap-1.5 border-t border-white/[0.04] pt-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {/* Model selector */}
            <Popover open={imgModelOpen} onOpenChange={setImgModelOpen} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide overlayInnerStyle={DARK_POPOVER_STYLE}
              content={<div className="jm-popover-menu">{IMAGE_MODELS.map(m => (
                <div key={m.value} className={`jm-menu-item ${m.value === imgModel ? 'selected' : ''}`} onClick={() => { setImgModel(m.value); setImgModelOpen(false); }}>
                  <div className="jm-menu-item-title">{m.label}</div><div className="jm-menu-item-desc">{m.description}</div>
                </div>
              ))}</div>}
            >
              <div className="jm-pill"><GreenDot /><span className="jm-pill-text">{imgModelLabel}</span><CaretDownOutlined className="jm-pill-arrow" /></div>
            </Popover>

            {/* Ratio + Quality selector — matches LibTV grid layout */}
            <Popover open={imgRatioOpen} onOpenChange={setImgRatioOpen} trigger="click" placement="topLeft" arrow={false} destroyTooltipOnHide
              overlayInnerStyle={{ ...DARK_POPOVER_STYLE, padding: '16px 16px 12px', minWidth: 280 }}
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Quality row */}
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>分辨率</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {IMAGE_QUALITIES.map(q => (
                        <button key={q.value} type="button" onClick={() => setImgQuality(q.value)}
                          style={{
                            height: 36, borderRadius: 8, border: '1px solid',
                            borderColor: q.value === imgQuality ? 'rgba(54,181,240,0.5)' : 'rgba(255,255,255,0.08)',
                            background: q.value === imgQuality ? 'rgba(54,181,240,0.12)' : 'rgba(255,255,255,0.04)',
                            color: q.value === imgQuality ? '#5cc5f5' : 'rgba(255,255,255,0.7)',
                            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (q.value !== imgQuality) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; } }}
                          onMouseLeave={e => { if (q.value !== imgQuality) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                        >{q.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Ratio grid */}
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>比例</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                      {IMAGE_RATIOS.map(r => {
                        const icon = getRatioIconSize(r.value);
                        const selected = r.value === imgRatio;
                        return (
                          <button key={r.value} type="button" onClick={() => { setImgRatio(r.value); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              gap: 4, padding: '8px 2px', borderRadius: 8, border: '1px solid',
                              borderColor: selected ? 'rgba(54,181,240,0.5)' : 'rgba(255,255,255,0.08)',
                              background: selected ? 'rgba(54,181,240,0.12)' : 'rgba(255,255,255,0.04)',
                              cursor: 'pointer', transition: 'all 0.15s', minHeight: 52,
                            }}
                            onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; } }}
                            onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                          >
                            <div style={{
                              width: icon.w, height: icon.h,
                              border: `1.5px solid ${selected ? '#5cc5f5' : 'rgba(255,255,255,0.35)'}`,
                              borderRadius: 2,
                            }} />
                            <span style={{
                              fontSize: 11, fontWeight: selected ? 600 : 400,
                              color: selected ? '#5cc5f5' : 'rgba(255,255,255,0.55)',
                            }}>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              }
            >
              <div className="jm-pill"><BorderOutlined style={{ fontSize: 13 }} /><span className="jm-pill-text">{imgRatio === 'auto' ? '自适应' : imgRatio} · {imgQuality}</span><CaretDownOutlined className="jm-pill-arrow" /></div>
            </Popover>

            {/* Camera Control selector */}
            <Popover
              open={imgCameraOpen}
              onOpenChange={setImgCameraOpen}
              trigger="click"
              placement="topLeft"
              arrow={false}
              destroyTooltipOnHide
              overlayInnerStyle={{ ...DARK_POPOVER_STYLE, padding: 0, minWidth: 240, overflow: "hidden" }}
              content={
                <div style={{ fontSize: 13 }}>
                  <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                      <VideoCameraOutlined style={{ color: "#5cc5f5", fontSize: 14 }} />
                      <span>摄像机控制</span>
                    </div>
                    <div style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Camera • Lens • Focal • Aperture</div>
                  </div>
                  <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                    {[
                      { label: "相机", value: "Panavision DXL2" },
                      { label: "镜头", value: "ARRI Signature Prime" },
                      { label: "焦距", value: "35mm" },
                      { label: "光圈", value: "f/4" },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{row.label}</span>
                        <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>展开完整编辑器调节参数</span>
                  </div>
                </div>
              }
            >
              <div className="jm-pill"><VideoCameraOutlined style={{ fontSize: 12 }} /><span className="jm-pill-text">摄像机控制</span><CaretDownOutlined className="jm-pill-arrow" /></div>
            </Popover>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <PanelIconBtn title="翻译提示词"><IconTranslate className="h-3.5 w-3.5" /></PanelIconBtn>
            <PanelIconBtn title="联网搜索"><WebSearchIcon /></PanelIconBtn>

            {/* Count selector */}
            <Popover open={imgCountOpen} onOpenChange={setImgCountOpen} trigger="click" placement="top" arrow={false} destroyTooltipOnHide overlayInnerStyle={{ ...DARK_POPOVER_STYLE, padding: '6px' }}
              content={<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, minWidth: 120 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} type="button" onClick={() => { setImgCount(n); setImgCountOpen(false); }}
                    style={{
                      width: 36, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      background: n === imgCount ? 'rgba(54,181,240,0.2)' : 'rgba(255,255,255,0.04)',
                      color: n === imgCount ? '#5cc5f5' : 'rgba(255,255,255,0.65)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (n !== imgCount) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; } }}
                    onMouseLeave={e => { if (n !== imgCount) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                  >{n}</button>
                ))}
              </div>}
            >
              <div className="jm-pill" style={{ padding: '0 8px' }}><span>{imgCount}张</span><CaretDownOutlined className="jm-pill-arrow" /></div>
            </Popover>

            <span
              className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium tabular-nums text-white/55"
              title="算力消耗"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400/80">
                <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
              </svg>
              26
            </span>

            {(() => {
              const canGenerate = prompt.trim().length > 0 || refImages.length > 0;
              return (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  aria-label="生成图片"
                  className="nodrag flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-all duration-150 enabled:shadow-[0_2px_10px_rgba(54,181,240,0.35)] enabled:hover:shadow-[0_3px_14px_rgba(54,181,240,0.5)] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: canGenerate
                      ? "linear-gradient(135deg, #36b5f0 0%, #2b9cd9 100%)"
                      : "rgba(255,255,255,0.08)",
                  }}
                  title={canGenerate ? "生成" : "请输入提示词或添加参考图"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    )
  ) : undefined;

  const floatingPanel = (editorOverlay || controlPanel) ? (
    <>
      {editorOverlay}
      {!activeEditor && controlPanel}
    </>
  ) : undefined;

  return (
    <>
    <NodeShell
      nodeId={id}
      name={data.name}
      resolution={resolution}
      icon={<IconImage className="h-3.5 w-3.5" />}
      selected={selected}
      width={hasImage ? w : 350}
      height={hasImage ? h : 350}
      floatingPanel={floatingPanel}
      contextToolbar={contextToolbar}
    >
      {isGenerating ? (
        <GeneratingOverlay
          percent={data.taskInfo?.progressPercent ?? 0}
          onCancel={() => {
            import("@/lib/spawn-output-node").then(({ cancelGeneration }) =>
              cancelGeneration(id)
            );
          }}
        />
      ) : hasImage ? (
        <div className="relative h-full w-full overflow-hidden">
          <img
            src={data.url[0]}
            alt={data.alt || data.name}
            className="h-full w-full object-cover transition-transform duration-200"
            draggable={false}
            style={isRotationNode ? {
              transform: `rotate(${rotateDeg}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            } : undefined}
          />
          {activeEditor === "annotate" && (
            <AnnotationCanvas
              ref={annotCanvasRef}
              width={w}
              height={h}
              color={annotColor}
              brushSize={annotBrush}
              tool={annotTool}
            />
          )}
          <button
            type="button"
            onClick={handleDownload}
            aria-label="下载图片"
            title="下载"
            className="nodrag absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white opacity-0 shadow-md transition-all duration-150 hover:bg-emerald-500 active:scale-95 group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="mb-4">
            <IconImage className="h-16 w-16 text-fg-muted opacity-30" />
          </div>
          <div className="w-full">
            <div className="mb-2 text-sm text-fg-muted">尝试：</div>
            <div className="flex flex-col items-start gap-1">
              <SuggestButton>图生图</SuggestButton>
              <SuggestButton>图片高清</SuggestButton>
            </div>
          </div>
        </div>
      )}
    </NodeShell>

    {/* ── Fullscreen Preview Modal ── */}
    {showPreview && hasImage && createPortal(
      <ImagePreviewModal
        url={data.url[0]}
        name={data.name}
        width={data.contentWidth}
        height={data.contentHeight}
        onClose={() => setShowPreview(false)}
        onDownload={handleDownload}
      />,
      document.body,
    )}
    </>
  );
}

export const ImageNodeComponent = memo(ImageNodeInner);

/* ═══════════════════════════════════════════════════════
   Fullscreen Image Preview Modal
   ═══════════════════════════════════════════════════════ */

function ImagePreviewModal({
  url,
  name,
  width,
  height,
  onClose,
  onDownload,
}: {
  url: string;
  name: string;
  width: number;
  height: number;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.1, Math.min(10, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const scalePercent = Math.round(scale * 100);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top bar */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 backdrop-blur-sm"
        style={{ cursor: "default" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-white/90">{name}</span>
          <span className="text-[12px] text-white/50">{width} × {height}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.1, s - 0.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="缩小"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-w-[48px] rounded-lg px-2 py-1 text-center text-[12px] tabular-nums text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="重置缩放"
          >
            {scalePercent}%
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(10, s + 0.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="放大"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>

          <div className="mx-2 h-5 w-px bg-white/20" />

          <button
            type="button"
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="适应屏幕"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="下载"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v10M6 9l4 4 4-4M3 15v2h14v-2" />
            </svg>
          </button>

          <div className="mx-2 h-5 w-px bg-white/20" />

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="关闭 (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area — drag/zoom only here */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <img
          src={url}
          alt={name}
          draggable={false}
          className="max-h-none max-w-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        />
      </div>

      {/* Bottom info bar */}
      <div className="flex h-8 shrink-0 items-center justify-center border-t border-white/10 bg-black/60" style={{ cursor: "default" }}>
        <span className="text-[11px] text-white/40">
          滚轮缩放 · 拖拽移动 · Esc 关闭
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Annotation Canvas (draws on top of image)
   ═══════════════════════════════════════════════════════ */

interface AnnotationCanvasHandle {
  undo: () => void;
  redo: () => void;
  toDataURL: () => string | null;
}

interface AnnotationCanvasProps {
  width: number;
  height: number;
  color: string;
  brushSize: number;
  tool: "pen" | "rect" | "text";
}

const AnnotationCanvas = forwardRef(function AnnotationCanvas(
  { width, height, color, brushSize, tool }: AnnotationCanvasProps,
  ref: Ref<AnnotationCanvasHandle>,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const history = useRef<ImageData[]>([]);
  const historyIdx = useRef(-1);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textJustOpened = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    canvas.width = width;
    canvas.height = height;
    overlay.width = width;
    overlay.height = height;
    saveSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    if (textInput && textInputRef.current) {
      textJustOpened.current = true;
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
        setTimeout(() => { textJustOpened.current = false; }, 200);
      });
    }
  }, [textInput]);

  const saveSnapshot = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, width, height);
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(snap);
    historyIdx.current = history.current.length - 1;
  };

  const restoreSnapshot = (idx: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !history.current[idx]) return;
    ctx.putImageData(history.current[idx], 0, 0);
  };

  useImperativeHandle(ref, () => ({
    undo() {
      if (historyIdx.current > 0) {
        historyIdx.current -= 1;
        restoreSnapshot(historyIdx.current);
      }
    },
    redo() {
      if (historyIdx.current < history.current.length - 1) {
        historyIdx.current += 1;
        restoreSnapshot(historyIdx.current);
      }
    },
    toDataURL() {
      return canvasRef.current?.toDataURL("image/png") ?? null;
    },
  }));

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const clearOverlay = () => {
    const ctx = overlayRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (textInput) return;
    drawing.current = true;
    const pos = getPos(e);
    startPos.current = pos;

    if (tool === "pen") {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    if (tool === "text") {
      drawing.current = false;
      const rect = canvasRef.current!.getBoundingClientRect();
      setTextInput({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        value: "",
      });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const pos = getPos(e);

    if (tool === "pen") {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    if (tool === "rect") {
      const ctx = overlayRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([6, 3]);
      const rx = Math.min(startPos.current.x, pos.x);
      const ry = Math.min(startPos.current.y, pos.y);
      const rw = Math.abs(pos.x - startPos.current.x);
      const rh = Math.abs(pos.y - startPos.current.y);
      ctx.strokeRect(rx, ry, rw, rh);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    const pos = getPos(e);

    if (tool === "pen") {
      saveSnapshot();
    }
    if (tool === "rect") {
      clearOverlay();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([]);
      const rx = Math.min(startPos.current.x, pos.x);
      const ry = Math.min(startPos.current.y, pos.y);
      const rw = Math.abs(pos.x - startPos.current.x);
      const rh = Math.abs(pos.y - startPos.current.y);
      ctx.strokeRect(rx, ry, rw, rh);
      saveSnapshot();
    }
  };

  const commitText = useCallback(() => {
    setTextInput((prev) => {
      if (!prev || !prev.value.trim()) return null;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const fontSize = Math.max(14, brushSize * 3);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(prev.value, prev.x * scaleX, prev.y * scaleY + fontSize);
        requestAnimationFrame(() => saveSnapshot());
      }
      return null;
    });
  }, [brushSize, color]);

  const handleTextBlur = useCallback(() => {
    if (textJustOpened.current) return;
    commitText();
  }, [commitText]);

  const stopAll = useCallback((e: React.KeyboardEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="nodrag absolute inset-0 z-10"
        style={{ width, height, pointerEvents: "none" }}
      />
      <canvas
        ref={overlayRef}
        className="nodrag absolute inset-0 z-20 cursor-crosshair"
        style={{ width, height, pointerEvents: textInput ? "none" : "auto" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          if (drawing.current && tool === "rect") clearOverlay();
          drawing.current = false;
        }}
      />
      {textInput && (
        <div
          className="nodrag nopan nowheel absolute z-30"
          style={{ left: textInput.x, top: textInput.y }}
          onMouseDown={stopAll}
          onMouseUp={stopAll}
          onClick={stopAll}
          onKeyDown={stopAll}
          onKeyUp={stopAll}
        >
          <input
            ref={textInputRef}
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput((p) => p ? { ...p, value: e.target.value } : null)}
            onKeyDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") setTextInput(null);
            }}
            onKeyUp={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onBlur={handleTextBlur}
            autoFocus
            className="nodrag nopan nowheel w-auto rounded border border-white/40 bg-black/70 px-2 py-1 text-white outline-none backdrop-blur-sm"
            style={{
              minWidth: 120,
              fontSize: Math.max(14, brushSize * 3) * (canvasRef.current ? canvasRef.current.getBoundingClientRect().width / canvasRef.current.width : 1),
              color,
              caretColor: color,
            }}
            placeholder="输入文字，回车确认"
          />
        </div>
      )}
    </>
  );
});

/* ═══════════════════════════════════════════════════════
   Context Toolbar components
   ═══════════════════════════════════════════════════════ */

function ToolbarSep() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />;
}

function TBBtn({ label, icon, active, hasDropdown, onClick }: { label: string; icon?: ReactNode; active?: boolean; hasDropdown?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 select-none items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] leading-none transition-colors ${
        active
          ? "bg-blue-600/80 text-white"
          : "text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)]"
      }`}
    >
      {icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-90">{icon}</span>}
      <span>{label}</span>
      {hasDropdown && <IconChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />}
    </button>
  );
}

function TBIconBtn({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)]"
    >
      {children}
    </button>
  );
}

function AnnotToolBtn({ icon, active, onClick, title }: { icon: ReactNode; active?: boolean; onClick?: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-white/15 text-fg-default" : "text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)]"
      }`}
    >
      {icon}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Floating Panel components
   ═══════════════════════════════════════════════════════ */

function PanelToolBtn({
  icon,
  label,
  onClick,
  disabled,
  title,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? (disabled ? "功能即将推出" : undefined)}
      aria-label={label}
      aria-disabled={disabled}
      className={`nodrag group flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-all duration-150 ${
        active
          ? "border-[#36b5f0]/40 bg-[#36b5f0]/[0.08] text-[#5cc5f5]"
          : "border-white/[0.08] bg-white/[0.03] text-white/65 enabled:hover:border-white/15 enabled:hover:bg-white/[0.07] enabled:hover:text-white/90"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center transition-transform group-enabled:group-hover:scale-110">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

function RefBadge({ index, url }: { index: number; url?: string }) {
  const hasImg = url && url !== "";
  return (
    <div className="group/ref relative">
      <div
        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border transition-all duration-200 ${
          hasImg
            ? "border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.25)] group-hover/ref:-translate-y-0.5 group-hover/ref:border-[#36b5f0]/40 group-hover/ref:shadow-[0_4px_14px_rgba(54,181,240,0.25)]"
            : "border-dashed border-white/10 bg-white/[0.02] group-hover/ref:border-white/20"
        }`}
      >
        {hasImg ? (
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover/ref:scale-105" draggable={false} />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </div>
      <span className="pointer-events-none absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border border-[#1a1a1a] bg-[#36b5f0] px-[3px] text-[9px] font-semibold tabular-nums text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 group-hover/ref:scale-110">
        {index}
      </span>
    </div>
  );
}

function AddRefBtn() {
  return (
    <button
      type="button"
      className="nodrag flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[var(--canvas-node-border)] text-fg-muted/40 transition-colors hover:border-[var(--canvas-node-border-selected)] hover:text-fg-muted"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

function ExpandedToolBtn({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="nodrag flex flex-col items-center justify-center gap-1 rounded-lg border border-[var(--canvas-node-border)] px-3 py-2 text-fg-muted transition-colors hover:border-[var(--canvas-node-border-selected)] hover:text-fg-default"
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}

function ExpandedRefBadge({ index, url }: { index: number; url?: string }) {
  const hasImg = url && url !== "";
  return (
    <div className="relative">
      <div className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border ${hasImg ? "border-[var(--canvas-node-border)]" : "border-dashed border-[var(--canvas-node-border)]"} bg-white/5`}>
        {hasImg ? (
          <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-muted/40">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </div>
      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-bold text-white">
        {index}
      </span>
    </div>
  );
}

function PanoramaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c4-2 8-2 10 0s6 2 10 0v12c-4 2-8 2-10 0s-6-2-10 0V6z" />
    </svg>
  );
}

function PanelSelector({ label, icon, compact }: { label: string; icon?: ReactNode; compact?: boolean }) {
  return (
    <button
      type="button"
      className={`nodrag flex items-center gap-0.5 rounded-lg text-fg-default transition-colors hover:bg-white/5 ${compact ? "px-1.5 py-0.5 text-[12px]" : "px-2 py-1 text-[13px]"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <IconChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
    </button>
  );
}

function PanelIconBtn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="nodrag flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-all duration-150 hover:bg-white/[0.08] hover:text-white/90"
    >
      {children}
    </button>
  );
}

function SuggestButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="nodrag flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-default hover:bg-[var(--canvas-controls-hover)]">
      <span>→</span>
      <span>{children}</span>
    </button>
  );
}

function GreenDot() {
  return (
    <span className="flex h-3 w-3 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   SVG icons for toolbar
   ═══════════════════════════════════════════════════════ */

function MultiAngleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM13 3h6v6h-6zM8 13h6v6H8z" />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}

function GridNineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="1" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="7.25" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="7.25" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="7.25" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="13.5" width="5.5" height="5.5" rx="1" /><rect x="7.25" y="13.5" width="5.5" height="5.5" rx="1" /><rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function HDIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="4" width="18" height="12" rx="2" />
      <path d="M6 8v4M6 10h3M9 8v4M13 8v2a2 2 0 0 1-2 2h0" />
    </svg>
  );
}

function GridSplitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <path d="M8 1v14M1 8h14" />
    </svg>
  );
}

function AnnotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 19" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="10" width="10" height="10" rx="1.5" />
      <path d="M4 7 A 8 8 0 0 1 19 5" />
      <polyline points="19 2 19 5 16 5" />
    </svg>
  );
}

function ExitEditorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

function RotateCCWIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RotateCWIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function FlipHIcon({ active }: { active?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M16 7l4 5-4 5" />
      <path d="M8 7L4 12l4 5" />
    </svg>
  );
}

function FlipVIcon({ active }: { active?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" />
      <path d="M7 8L12 4l5 4" />
      <path d="M7 16l5 4 5-4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v10M6 9l4 4 4-4M3 15v2h14v-2" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14 1 17 1 17 4" />
      <polyline points="4 17 1 17 1 14" />
      <polyline points="17 14 17 17 14 17" />
      <polyline points="1 4 1 1 4 1" />
    </svg>
  );
}

/* ── Annotation tool icons ── */

function PenToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function RectToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
    </svg>
  );
}

function TextToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M12 4v16" />
      <path d="M8 20h8" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.37 2.63a2.12 2.12 0 0 1 3 3L14 13l-4 1 1-4 7.37-7.37z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M3 13a9 9 0 0 1 15.36-6.36L21 9" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M21 13a9 9 0 0 0-15.36-6.36L3 9" />
    </svg>
  );
}

function StyleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813h6.088l-4.956 3.574 1.912 5.813L12 14.626l-4.956 3.574 1.912-5.813L4 8.813h6.088z" />
    </svg>
  );
}

function MarkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function RatioIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
    </svg>
  );
}

function CamCtrlIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="15" height="12" rx="2" />
      <polygon points="23 8 17 12 23 16 23 8" />
    </svg>
  );
}

function WebSearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="12" height="12" rx="2" strokeDasharray="3 2" />
      <rect x="1" y="1" width="18" height="18" rx="3" />
    </svg>
  );
}

function GeneratingOverlay({ percent, onCancel }: { percent: number; onCancel: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[rgb(38,38,38)]">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-white/60">
          生成中 {percent}%...
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="nodrag text-[13px] text-white/40 hover:text-white/70"
        >
          取消
        </button>
      </div>
      <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
