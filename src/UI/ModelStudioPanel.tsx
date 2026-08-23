import type { CSSProperties, MouseEvent, MutableRefObject, RefObject } from "react";

import ThreeModelViewer from "./ThreeModelViewer";
import type { ModelRotation, ViewerHotspot, ViewerObject } from "./uiDefinitions";

type RotationDrag = { active: boolean; moved: boolean; startX: number; startY: number; baseRotation: ModelRotation };

/** Data and actions used by the model gallery. */
export type ModelGallery = {
  availableModels: ViewerObject[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  onModelSelect: (index: number) => void;
  onToggle: () => void;
  onUpload: (file: File) => void;
  selectedModelIndex: number;
};

/** Data and actions used by the current 3D model viewer. */
export type ModelViewer = {
  colorsByHotspotTarget: Record<string, string | undefined>;
  currentRotationRef: MutableRefObject<ModelRotation>;
  isImmersiveMode: boolean;
  modelContainerRef: RefObject<HTMLDivElement | null>;
  modelRotation: ModelRotation;
  modelZoomScale: number;
  onImmersiveModeChange: (isImmersive: boolean) => void;
  onModelHotspotsFound: (modelUrl: string, hotspots: ViewerHotspot[]) => void;
  onRotationChange: (rotation: ModelRotation) => void;
  onSelectNextHotspot: () => void;
  rotationDragRef: MutableRefObject<RotationDrag>;
  selectedHotspot: ViewerHotspot | undefined;
  selectedModel: ViewerObject;
  statusMessage: string;
};

type GestureFeedback = { title: string; detail: string };
type ModelStudioPanelProps = { gallery: ModelGallery; gestureFeedback: GestureFeedback; viewer: ModelViewer };

function ModelThumbnail({ model }: { model: ViewerObject }) {
  if (model.kind === "uploaded" && model.url) return <ThreeModelViewer modelUrl={model.url} rotation={{ x: -16, y: 28 }} scale={1} thumbnail />;
  if (model.kind === "cube") return <div className="gallery-3d-preview"><div className="css-model cube-model gallery-cube-model"><span className="cube-face cube-front">1</span><span className="cube-face cube-back">2</span><span className="cube-face cube-right">3</span><span className="cube-face cube-left">4</span><span className="cube-face cube-top">Top</span><span className="cube-face cube-bottom">Bottom</span></div></div>;
  return <div className="gallery-3d-preview"><div className="css-model capsule-model gallery-capsule-model"><span className="capsule-core" /><span className="capsule-ring ring-a" /><span className="capsule-ring ring-b" /><span className="capsule-stand" /></div></div>;
}

function ModelGalleryGrid({ availableModels, fileInputRef, onModelSelect, onUpload, selectedModelIndex }: Omit<ModelGallery, "isOpen" | "onToggle">) {
  return (
    <div className="model-gallery" aria-label="Model gallery">
      <input accept=".glb,model/gltf-binary" hidden ref={fileInputRef} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} />
      <div className="model-gallery-grid">
        {availableModels.map((model, index) => <button className={index === selectedModelIndex ? "active" : ""} key={`${model.name}-${index}`} onClick={() => onModelSelect(index)} type="button"><div className={`gallery-model-thumbnail ${model.kind}`} aria-hidden="true"><ModelThumbnail model={model} /></div><strong>{model.name}</strong><span>{model.kind === "uploaded" ? `${model.hotspots.length} mesh hotspot${model.hotspots.length === 1 ? "" : "s"}` : "Built-in model"}</span></button>)}
        <button className="upload-model-card" onClick={() => fileInputRef.current?.click()} type="button"><span className="upload-model-icon" aria-hidden="true">↑</span><strong>Upload a model</strong><span>Choose a self-contained .glb file</span></button>
      </div>
    </div>
  );
}

function BuiltInModel({ colorsByHotspotTarget, selectedHotspot, selectedModel }: Pick<ModelViewer, "colorsByHotspotTarget" | "selectedHotspot" | "selectedModel">) {
  const parts = selectedModel.kind === "cube" ? [["cube-front", "cube-face cube-front", "1"], ["cube-back", "cube-face cube-back", "2"], ["cube-right", "cube-face cube-right", "3"], ["cube-left", "cube-face cube-left", "4"], ["cube-top", "cube-face cube-top", "Top"], ["cube-bottom", "cube-face cube-bottom", "Bottom"]] : [["capsule-core", "capsule-core", ""], ["ring-a", "capsule-ring ring-a", ""], ["ring-b", "capsule-ring ring-b", ""], ["capsule-stand", "capsule-stand", ""]];
  return <div className={`css-model ${selectedModel.kind === "cube" ? "cube-model" : "capsule-model"}`} style={{ "--model-accent": selectedModel.accent } as CSSProperties}>{parts.map(([target, className, label]) => <span className={`${className} ${selectedHotspot?.target === target ? "selected-hotspot" : ""}`} key={target} style={selectedModel.kind === "cube" ? undefined : ({ "--part-color": colorsByHotspotTarget[target] ?? selectedModel.accent } as CSSProperties)}>{label}</span>)}</div>;
}

export default function ModelStudioPanel({ gallery, gestureFeedback, viewer }: ModelStudioPanelProps) {
  const { selectedHotspot, selectedModel } = viewer;
  const { currentRotationRef, modelContainerRef, rotationDragRef } = viewer;
  const stopDragging = () => { rotationDragRef.current.active = false; };
  const startDragging = (event: MouseEvent<HTMLDivElement>) => {
    modelContainerRef.current?.focus();
    rotationDragRef.current = { active: true, moved: false, startX: event.clientX, startY: event.clientY, baseRotation: currentRotationRef.current };
  };
  const rotateFromMouse = (event: MouseEvent<HTMLDivElement>) => {
    const drag = rotationDragRef.current;
    if (!drag.active) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true;
    viewer.onRotationChange({ x: drag.baseRotation.x + deltaY * 0.45, y: drag.baseRotation.y + deltaX * 0.45 });
  };
  const selectHotspotFromMouse = () => {
    const drag = rotationDragRef.current;
    if (drag.moved) { drag.moved = false; return; }
    viewer.onSelectNextHotspot();
  };

  return (
    <div className="preview-panel" style={{ maxHeight: 580 }}>
      <div className="viewer-panel-header"><div><strong>{selectedModel.name}</strong><small className="active-hotspot-meta"><b>Selected area</b><em>{selectedHotspot?.label ?? "No hotspot"}</em><span>Click or pinch to cycle areas.</span></small></div><div className="viewer-stats"><button className="gallery-toggle" onClick={gallery.onToggle} type="button"><span aria-hidden="true">▦</span>{gallery.isOpen ? "Close gallery" : "Gallery"}</button>{!gallery.isOpen && <button className="focus-toggle" onClick={() => viewer.onImmersiveModeChange(!viewer.isImmersiveMode)} type="button"><span aria-hidden="true">{viewer.isImmersiveMode ? "×" : "⛶"}</span>{viewer.isImmersiveMode ? "Exit immersive" : "Immersive view"}</button>}</div></div>
      {gallery.isOpen ? <ModelGalleryGrid {...gallery} /> : <><div className="mode-strip"><strong>{gestureFeedback.title}</strong><span>{gestureFeedback.detail}</span></div><section className="model-inspector"><div ref={modelContainerRef} className="model-stage" role="application" tabIndex={0} aria-label="3D model viewer. Drag to rotate, click to select, use mouse wheel or plus and minus to zoom." onMouseDown={startDragging} onMouseMove={rotateFromMouse} onMouseUp={stopDragging} onMouseLeave={stopDragging} onClick={selectHotspotFromMouse}><div className="stage-zoom-meter">Zoom: {viewer.modelZoomScale.toFixed(2)}</div><div className={`model-viewport ${selectedModel.kind === "uploaded" ? "uploaded-model-viewport" : ""}`} style={{ transform: selectedModel.kind === "uploaded" ? "none" : `scale(${viewer.modelZoomScale}) rotateX(${viewer.modelRotation.x}deg) rotateY(${viewer.modelRotation.y}deg)` }}>{selectedModel.kind === "uploaded" && selectedModel.url ? <ThreeModelViewer modelUrl={selectedModel.url} rotation={viewer.modelRotation} scale={viewer.modelZoomScale} selectedHotspotTarget={selectedHotspot?.target} onHotspotsDiscovered={(hotspots) => viewer.onModelHotspotsFound(selectedModel.url!, hotspots)} /> : <BuiltInModel colorsByHotspotTarget={viewer.colorsByHotspotTarget} selectedHotspot={selectedHotspot} selectedModel={selectedModel} />}</div></div><section className="model-details"><div className="model-description"><p>{selectedModel.description}</p><p className="preview-status">{viewer.statusMessage}</p></div></section></section></>}
    </div>
  );
}
