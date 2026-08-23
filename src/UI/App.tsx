import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";

import { getGestureEvents, type TrackedHand } from "../Core";

import AppHeader from "./AppHeader";
import "./App.css";
import HandLogHistory from "./HandLogHistory";
import HandTrackingDebugPanel from "./HandTrackingDebugPanel";
import { renderHandSkeleton } from "./utils/drawHandSkeleton";
import { useCameraTracker } from "./hooks/useCameraTracker";
import { useModelGallery } from "./hooks/useModelGallery";
import { useKeyboardAndWheelControls } from "./hooks/useKeyboardAndWheelControls";
import InstructionsPanel from "./InstructionsPanel";
import LiveCameraPanel from "./LiveCameraPanel";
import ModelStudioPanel from "./ModelStudioPanel";
import { VIRTUAL_EVENT_CONFIG } from "./uiDefinitions";
import type {
  ModelRotation,
  RecentVirtualEvent,
  VirtualEventKind,
} from "./uiDefinitions";

const SHOW_TOASTS = false;

/** Keep the model zoom between its smallest and largest allowed values. */
function clampViewerZoom(value: number) {
  return Math.max(0.65, Math.min(1.8, value));
}

/**
 * Creates the text shown in the UI for the currently detected gesture.
 * Core detects gestures; this function only chooses what the user sees.
 */
function deriveGestureFeedbackState(
  hands: TrackedHand[],
  retainedZoomGesture: TrackedHand["gestures"]["zoom"] | null,
) {
  const scrollGesture = hands.find(
    (hand) => hand.gestures.scroll.mode !== "idle",
  )?.gestures.scroll;
  const liveZoomGesture = hands.find(
    (hand) => hand.gestures.zoom.mode !== "idle" || hand.gestures.zoom.exited,
  )?.gestures.zoom;
  const zoomGesture =
    liveZoomGesture ??
    (retainedZoomGesture?.ready ? retainedZoomGesture : undefined);
  const navigationGesture = hands.find(
    (hand) =>
      hand.gestures.scroll.mode === "idle" &&
      hand.gestures.zoom.mode === "idle" &&
      hand.gestures.navigation.active,
  )?.gestures.navigation;
  const navigationReady = (navigationGesture?.holdProgressMs ?? 0) >= 1000;

  const modeTitle = scrollGesture?.ready
    ? "Rotate mode"
    : zoomGesture?.ready
      ? "Zoom mode"
      : zoomGesture?.mode === "arming"
        ? "Preparing zoom"
        : navigationReady
          ? "Navigation ready"
          : "Gesture controls";
  const modeDetail = scrollGesture?.ready
    ? "Move palm to rotate. Pinch to exit, or move hand out of frame."
    : zoomGesture?.ready
      ? "Move hands apart/together. Pinch exits."
      : zoomGesture?.mode === "arming"
        ? "Hold both hands for 1 second."
        : navigationReady && navigationGesture?.direction === "back"
          ? "Pinch with other hand for previous object."
          : navigationReady && navigationGesture?.direction === "forward"
            ? "Pinch with other hand for next object."
            : "Drag rotates. Click/pinch selects. Wheel/two hands zoom.";

  return {
    modeDetail,
    modeTitle,
    navigationGesture,
    navigationReady,
    scrollGesture,
    showZoomGesture: Boolean(
      zoomGesture &&
      (zoomGesture.ready ||
        (liveZoomGesture && liveZoomGesture.palmCount >= 2)),
    ),
    zoomGesture,
  };
}

function App() {
  // Camera elements used by the hand tracker.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The 3D viewer element receives mouse-wheel and drag controls.
  const modelViewerElementRef = useRef<HTMLDivElement>(null);
  const activeScrollDirectionRef = useRef<
    "up" | "down" | "left" | "right" | null
  >(null);
  // Zoom level at the start of a two-hand zoom gesture.
  const zoomGestureStartScaleRef = useRef(1);
  // Current zoom level for gesture and mouse-wheel controls.
  const currentViewerZoomRef = useRef(1);
  // Current rotation for callbacks that run while the camera is tracking.
  const currentViewerRotationRef = useRef<ModelRotation>({ x: -18, y: 28 });
  // Rotation at the start of palm rotation. Hand movement is measured from here.
  const palmRotationStartRef = useRef<ModelRotation>({ x: -18, y: 28 });
  // Details of the current mouse drag, including whether it should count as a click.
  const activeMouseDragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    baseRotation: { x: -18, y: 28 },
  });
  // Lets the running tracker call the latest UI code without restarting the camera.
  const latestTrackingHandlerRef = useRef<(data: TrackedHand[]) => void>(
    () => {},
  );

  // Latest hands reported by the tracker.
  const [hands, setHands] = useState<TrackedHand[]>([]);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [recentVirtualEvent, setRecentVirtualEvent] =
    useState<RecentVirtualEvent | null>(null);
  // Keeps zoom feedback visible briefly when one hand leaves the camera view.
  const [retainedZoomGesture, setRetainedZoomGesture] = useState<
    TrackedHand["gestures"]["zoom"] | null
  >(null);
  const [focusView, setIsFocusView] = useState(false);
  // Zoom and rotation shown by the 3D viewer.
  const [viewerZoomScale, setViewerZoomScale] = useState(1);
  const [viewerRotation, setViewerRotation] = useState<ModelRotation>({
    x: -18,
    y: 28,
  });

  // Switches between the normal and immersive layouts.
  const setFocusView = (nextFocusView: boolean) => setIsFocusView(nextFocusView);

  const {
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
  } = useModelGallery(() => setFocusView(false));

  const {
    loading,
    trackerOutputSettingsRef,
    updateDataDisplaySettings,
    videoSize,
  } = useCameraTracker({
    onDataRef: latestTrackingHandlerRef,
    videoRef,
  });
  const {
    modeDetail,
    modeTitle,
    navigationGesture: navigationHoldGesture,
    navigationReady,
    scrollGesture: scrollModeGesture,
    showZoomGesture: showZoomModeGesture,
    zoomGesture: zoomModeGesture,
  } = deriveGestureFeedbackState(hands, retainedZoomGesture);

  const emitVirtualEvent = (
    kind: VirtualEventKind,
    handName: string | undefined,
    detail: string,
  ) => {
    const config = VIRTUAL_EVENT_CONFIG[kind];
    const title = `${handName ?? "Hand"}: ${config.label}`;

    setRecentVirtualEvent({
      ...config,
      id: Date.now(),
      detail,
    });

    if (SHOW_TOASTS) {
      toast(title, {
        description: detail,
        duration: 1300,
        icon: (
          <span className={`virtual-toast-icon ${config.className}`}>
            {config.icon}
          </span>
        ),
        style: {
          borderLeft: `6px solid ${config.color}`,
          background: config.background,
          color: "#17202a",
        },
      });
    }
  };

  const setViewerZoomScaleValue = (scale: number) => {
    currentViewerZoomRef.current = scale;
    setViewerZoomScale(scale);
  };

  const setViewerRotationValue = (rotation: ModelRotation) => {
    currentViewerRotationRef.current = rotation;
    setViewerRotation(rotation);
  };

  const zoomViewerBy = (amount: number, source: "mouse" | "keyboard") => {
    const nextScale = clampViewerZoom(currentViewerZoomRef.current + amount);
    setViewerZoomScaleValue(nextScale);
    setPreviewAction(`${source}: zoom ${nextScale.toFixed(2)}.`);
  };

  const rotateViewerBy = (
    delta: ModelRotation,
    source: "mouse" | "keyboard",
  ) => {
    setViewerRotationValue({
      x: currentViewerRotationRef.current.x + delta.x,
      y: currentViewerRotationRef.current.y + delta.y,
    });
    setPreviewAction(`${source}: rotated model.`);
  };

  useKeyboardAndWheelControls({
    isDebugMode,
    isFocusView: focusView,
    isGalleryOpen: galleryOpen,
    viewerElementRef: modelViewerElementRef,
    actions: {
      changeFocusView: setFocusView,
      changeObject: (direction) => showNextObject(direction, "keyboard"),
      rotateViewer: (delta) => rotateViewerBy(delta, "keyboard"),
      selectNextHotspot: () => selectNextHotspot("keyboard"),
      zoomViewer: zoomViewerBy,
    },
  });

  const notifyPinchClicks = (detectedHands: TrackedHand[]) => {
    getGestureEvents(detectedHands).forEach((event) => {
      if (event.kind !== "click") return;

      emitVirtualEvent("click", event.hand, event.detail);
      selectNextHotspot("gesture");
    });
  };

  const handleZoomGestures = (detectedHands: TrackedHand[]) => {
    const zoomGesture = detectedHands.find(
      (hand) => hand.gestures.zoom.mode !== "idle" || hand.gestures.zoom.exited,
    )?.gestures.zoom;

    if (!zoomGesture) {
      return;
    }

    if (zoomGesture.exited) {
      setRetainedZoomGesture(null);
      const event = getGestureEvents(detectedHands).find(
        (item) => item.kind === "zoomExit",
      );
      emitVirtualEvent(
        "zoomExit",
        event?.hand,
        event?.detail ?? "Zoom exited.",
      );
      return;
    }

    setRetainedZoomGesture(zoomGesture);

    if (zoomGesture.entered) {
      zoomGestureStartScaleRef.current = currentViewerZoomRef.current;
    }

    if (zoomGesture.ready) {
      setViewerZoomScaleValue(
        Math.max(
          0.65,
          Math.min(1.8, zoomGestureStartScaleRef.current * zoomGesture.scale),
        ),
      );
    }

    if (zoomGesture.entered) {
      const event = getGestureEvents(detectedHands).find(
        (item) => item.kind === "zoomReady",
      );
      emitVirtualEvent(
        "zoomReady",
        event?.hand,
        event?.detail ?? "Both palms held for one second. Pinch to exit.",
      );
      return;
    }
  };

  const handleScrollGestures = (detectedHands: TrackedHand[]) => {
    if (detectedHands.some((hand) => hand.gestures.zoom.mode !== "idle")) {
      return;
    }

    detectedHands.forEach((hand) => {
      if (hand.gestures.scroll.exited) {
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "scrollExit",
        );
        activeScrollDirectionRef.current = null;
        emitVirtualEvent(
          "scrollExit",
          event?.hand,
          event?.detail ?? "Pinch returned control to normal gesture mode.",
        );
        return;
      }

      if (hand.gestures.scroll.entered) {
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "scrollReady",
        );
        palmRotationStartRef.current = currentViewerRotationRef.current;
        emitVirtualEvent(
          "scrollReady",
          event?.hand,
          event?.detail ??
            "Open palm held for one second. Pinch to exit, or move hand out of frame.",
        );
        setPreviewAction(
          "Rotate mode ready. Move your palm to orbit the model.",
        );
        return;
      }

      if (hand.gestures.scroll.mode === "ready") {
        const palmMoveEvent = getGestureEvents(detectedHands).find(
          (item) => item.kind === "palmMove",
        );
        const movementX =
          palmMoveEvent?.movementX ?? hand.gestures.scroll.movementX;
        const movementY =
          palmMoveEvent?.movementY ?? hand.gestures.scroll.movementY;

        if (movementX !== null && movementY !== null) {
          setViewerRotationValue({
            x: palmRotationStartRef.current.x - movementY * 220,
            y: palmRotationStartRef.current.y + movementX * 220,
          });
        }

        const directionLabel =
          hand.gestures.scroll.directionX ??
          hand.gestures.scroll.direction ??
          null;
        if (
          directionLabel &&
          activeScrollDirectionRef.current !== directionLabel
        ) {
          activeScrollDirectionRef.current = directionLabel;
          setPreviewAction(`Rotating model ${directionLabel}.`);
        }
      }
    });
  };

  const notifyNavigationGestures = (detectedHands: TrackedHand[]) => {
    if (detectedHands.some((hand) => hand.gestures.scroll.mode !== "idle")) {
      return;
    }
    if (detectedHands.some((hand) => hand.gestures.zoom.mode !== "idle")) {
      return;
    }

    getGestureEvents(detectedHands).forEach((event) => {
      if (event.kind === "navigateBack") {
        showNextObject(-1, "gesture");
        emitVirtualEvent("navigateBack", event.hand, event.detail);
        return;
      }

      if (event.kind === "navigateForward") {
        showNextObject(1, "gesture");
        emitVirtualEvent("navigateForward", event.hand, event.detail);
      }
    });
  };

  useEffect(() => {
    latestTrackingHandlerRef.current = (data) => {
      setHands(data);
      renderHandSkeleton(
        canvasRef.current,
        data,
        trackerOutputSettingsRef.current.isCoordinateDataNormalized,
      );
      handleZoomGestures(data);
      notifyPinchClicks(data);
      handleScrollGestures(data);
      notifyNavigationGestures(data);
    };
  });

  useEffect(() => {
    if (!recentVirtualEvent) return;

    const timeoutId = window.setTimeout(() => {
      setRecentVirtualEvent(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [recentVirtualEvent]);

  return (
    <div
      className={`app-container${focusView ? " focus-view" : ""}`}
    >
      {SHOW_TOASTS && (
        <Toaster position="top-center" richColors visibleToasts={2} />
      )}
      <AppHeader
        debugMode={isDebugMode}
        onDebugModeChange={setIsDebugMode}
        previewClickCount={previewClickCount}
      />
      {loading && <div className="loading-indicator">Loading ML Model...</div>}

      <div className="workspace-layout">
        <LiveCameraPanel
          canvasRef={canvasRef}
          hands={hands}
          navigationGesture={navigationHoldGesture}
          navigationReady={navigationReady}
          recentEvent={recentVirtualEvent}
          scrollGesture={scrollModeGesture}
          showTelemetry={isDebugMode}
          videoRef={videoRef}
          videoSize={videoSize}
          zoomGesture={showZoomModeGesture ? zoomModeGesture : undefined}
        />

        {isDebugMode ? (
          <HandTrackingDebugPanel
            hands={hands}
            maxHeight={videoSize.height}
            onDataDisplaySettingsChange={updateDataDisplaySettings}
          />
        ) : (
          <ModelStudioPanel
            gallery={{
              availableModels: viewerObjects,
              fileInputRef: uploadInputRef,
              isOpen: galleryOpen,
              onModelSelect: selectObject,
              onToggle: toggleGallery,
              onUpload: uploadModel,
              selectedModelIndex: activeObjectIndex,
            }}
            gestureFeedback={{ detail: modeDetail, title: modeTitle }}
            viewer={{
              colorsByHotspotTarget: hotspotColorByTarget,
              currentRotationRef: currentViewerRotationRef,
              isImmersiveMode: focusView,
              modelContainerRef: modelViewerElementRef,
              modelRotation: viewerRotation,
              modelZoomScale: viewerZoomScale,
              onImmersiveModeChange: setFocusView,
              onModelHotspotsFound: updateUploadedHotspots,
              onRotationChange: setViewerRotationValue,
              onSelectNextHotspot: () => selectNextHotspot("mouse"),
              rotationDragRef: activeMouseDragRef,
              selectedHotspot: activeHotspot,
              selectedModel: activeObject,
              statusMessage: previewStatus,
            }}
          />
        )}
      </div>

      {!isDebugMode && !focusView && <InstructionsPanel />}

      {isDebugMode && (
        <>
          <hr style={{ borderColor: "#dee2e6", margin: "40px 0" }} />

          <HandLogHistory
            handsData={hands}
            videoRef={videoRef}
            canvasRef={canvasRef}
            trackingWidth={videoSize.width}
            trackingHeight={videoSize.height}
          />
        </>
      )}
    </div>
  );
}

export default App;
