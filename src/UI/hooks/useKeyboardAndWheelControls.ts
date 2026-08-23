import { useEffect, type RefObject } from "react";
import type { ModelRotation } from "../uiDefinitions";

type ViewerActions = {
  changeFocusView: (isFocused: boolean) => void;
  changeObject: (direction: 1 | -1) => void;
  rotateViewer: (delta: ModelRotation) => void;
  selectNextHotspot: () => void;
  zoomViewer: (amount: number, source: "keyboard" | "mouse") => void;
};

type KeyboardAndWheelControlOptions = {
  actions: ViewerActions;
  isDebugMode: boolean;
  isFocusView: boolean;
  isGalleryOpen: boolean;
  viewerElementRef: RefObject<HTMLDivElement | null>;
};

/**
 * Adds keyboard and mouse-wheel controls for the 3D viewer.
 *
 * Keyboard: arrows rotate, A/D change model, +/- zoom, Enter/Space select,
 * and F/Escape enter or leave immersive view. Mouse wheel zoom works only
 * while the 3D viewer is focused. Browser pinch-to-zoom is blocked there so
 * it does not zoom the entire page.
 */
export function useKeyboardAndWheelControls({
  actions,
  isDebugMode,
  isFocusView,
  isGalleryOpen,
  viewerElementRef,
}: KeyboardAndWheelControlOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")) return;

      const keyboardActions: Record<string, () => void> = {
        ArrowLeft: () => actions.rotateViewer({ x: 0, y: -12 }),
        ArrowRight: () => actions.rotateViewer({ x: 0, y: 12 }),
        ArrowUp: () => actions.rotateViewer({ x: -12, y: 0 }),
        ArrowDown: () => actions.rotateViewer({ x: 12, y: 0 }),
        a: () => actions.changeObject(-1),
        d: () => actions.changeObject(1),
        "+": () => actions.zoomViewer(0.08, "keyboard"),
        "=": () => actions.zoomViewer(0.08, "keyboard"),
        "-": () => actions.zoomViewer(-0.08, "keyboard"),
        _: () => actions.zoomViewer(-0.08, "keyboard"),
        Enter: actions.selectNextHotspot,
        " ": actions.selectNextHotspot,
      };

      if (event.key === "Escape" && isFocusView) {
        event.preventDefault();
        actions.changeFocusView(false);
        return;
      }
      if (event.key.toLowerCase() === "f" && !isFocusView && !isDebugMode && !isGalleryOpen) {
        event.preventDefault();
        actions.changeFocusView(true);
        return;
      }

      const action = keyboardActions[event.key] ?? keyboardActions[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    const viewerElement = viewerElementRef.current;
    if (!viewerElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (document.activeElement !== viewerElement) return;
      event.preventDefault();
      actions.zoomViewer(event.deltaY < 0 ? 0.06 : -0.06, "mouse");
    };
    const preventPagePinch = (event: Event) => {
      if (document.activeElement === viewerElement) event.preventDefault();
    };

    viewerElement.addEventListener("wheel", handleWheel, { passive: false });
    viewerElement.addEventListener("gesturestart", preventPagePinch);
    viewerElement.addEventListener("gesturechange", preventPagePinch);
    return () => {
      viewerElement.removeEventListener("wheel", handleWheel);
      viewerElement.removeEventListener("gesturestart", preventPagePinch);
      viewerElement.removeEventListener("gesturechange", preventPagePinch);
    };
  });
}
