import { useEffect, useRef, useState } from "react";
import { VIEWER_OBJECTS } from "../uiDefinitions";
import type { ViewerHotspot, ViewerObject } from "../uiDefinitions";

/**
 * Manages the model gallery: built-in and uploaded models, the selected model
 * and hotspot, the viewer message, and cleanup for uploaded model files.
 */
export function useModelGallery(onExitFocus: () => void) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadedRef = useRef<ViewerObject[]>([]);
  const [uploadedObjects, setUploadedObjects] = useState<ViewerObject[]>([]);
  const [activeObjectIndex, setActiveObjectIndex] = useState(0);
  const [activeHotspotIndex, setActiveHotspotIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("No virtual event yet.");
  const [previewClickCount, setPreviewClickCount] = useState(0);

  const viewerObjects = [...VIEWER_OBJECTS, ...uploadedObjects];
  const activeObject = viewerObjects[activeObjectIndex] ?? viewerObjects[0];
  const activeHotspot =
    activeObject.hotspots[
      activeHotspotIndex % Math.max(activeObject.hotspots.length, 1)
    ];
  const hotspotColorByTarget = Object.fromEntries(
    activeObject.hotspots.map((hotspot) => [hotspot.target, hotspot.color]),
  );
  const setPreviewAction = (message: string) =>
    setPreviewStatus(`${new Date().toLocaleTimeString()}: ${message}`);

  useEffect(() => {
    uploadedRef.current = uploadedObjects;
  }, [uploadedObjects]);
  useEffect(
    () => () =>
      uploadedRef.current.forEach(
        (model) => model.url && URL.revokeObjectURL(model.url),
      ),
    [],
  );

  const toggleGallery = () => {
    if (!galleryOpen) {
      onExitFocus();
      setGalleryOpen(true);
      return;
    }
    setGalleryOpen(false);
  };
  const selectObject = (index: number) => {
    setActiveObjectIndex(index);
    setActiveHotspotIndex(0);
    setGalleryOpen(false);
    setPreviewAction(`gallery: loaded ${viewerObjects[index].name}.`);
  };
  const selectNextHotspot = (source: "gesture" | "mouse" | "keyboard") => {
    setPreviewClickCount((count) => count + 1);
    setActiveHotspotIndex((index) => {
      const next = (index + 1) % activeObject.hotspots.length;
      setPreviewAction(
        `${source}: selected ${activeObject.hotspots[next].label}.`,
      );
      return next;
    });
  };
  const showNextObject = (direction: 1 | -1, source: "gesture" | "keyboard") =>
    setActiveObjectIndex((index) => {
      const next =
        (index + direction + viewerObjects.length) % viewerObjects.length;
      setActiveHotspotIndex(0);
      setPreviewAction(`${source}: loaded ${viewerObjects[next].name}.`);
      return next;
    });
  const uploadModel = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setPreviewAction("Upload rejected: please choose a .glb file.");
      return;
    }
    const model: ViewerObject = {
      name: file.name.replace(/\.glb$/i, ""),
      kind: "uploaded",
      accent: "#0f766e",
      background: "#ecfeff",
      description:
        "Uploaded GLB model. Its visible mesh parts become selectable hotspots when it loads.",
      url: URL.createObjectURL(file),
      hotspots: [
        {
          id: "uploaded-model",
          label: "Uploaded model",
          target: "uploaded-model",
        },
      ],
    };
    setUploadedObjects((items) => {
      const next = [...items, model];
      setActiveObjectIndex(VIEWER_OBJECTS.length + next.length - 1);
      return next;
    });
    setActiveHotspotIndex(0);
    setGalleryOpen(false);
    setPreviewAction(`upload: loaded ${model.name}.`);
  };
  const updateUploadedHotspots = (url: string, hotspots: ViewerHotspot[]) =>
    hotspots.length > 0 &&
    setUploadedObjects((items) =>
      items.map((model) =>
        model.url === url
          ? {
              ...model,
              hotspots,
              description: `Uploaded GLB model with ${hotspots.length} selectable mesh part${hotspots.length === 1 ? "" : "s"}.`,
            }
          : model,
      ),
    );
  return {
    activeHotspot,
    activeObject,
    activeObjectIndex,
    galleryOpen,
    hotspotColorByTarget,
    previewClickCount,
    previewStatus,
    selectNextHotspot,
    selectObject,
    setPreviewAction,
    showNextObject,
    toggleGallery,
    updateUploadedHotspots,
    uploadInputRef,
    uploadModel,
    viewerObjects,
  };
}
