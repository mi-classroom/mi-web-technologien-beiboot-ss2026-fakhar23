import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import HandLogHistory from "./HandLogHistory";
import "./App.css";
import TrackerControls from "./TrackerControls";
import {
  createHandTracker,
  getGestureEvents,
  type TrackedHand,
  type TrackedHandKeypoint,
} from "../Core";

// Set a maximum display width. The height will calculate automatically based on the camera's aspect ratio.
const MAX_WIDTH = 640;

// Configuration mapping for skeletal lines and their colors (used for the canvas overlay)
const SKELETON_RENDER_CONFIG = {
  thumb: { path: [0, 1, 2, 3, 4], color: "red" },
  indexFinger: { path: [0, 5, 6, 7, 8], color: "blue" },
  middleFinger: { path: [0, 9, 10, 11, 12], color: "yellow" },
  ringFinger: { path: [0, 13, 14, 15, 16], color: "green" },
  pinky: { path: [0, 17, 18, 19, 20], color: "pink" },
};

const PREVIEW_TITLE = "Accessible UI controls for a static page";
const PREVIEW_PAGES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PREVIEW_COLORS = [
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#fce7f3",
  "#ede9fe",
  "#cffafe",
  "#ffedd5",
  "#ecfccb",
];

const PREVIEW_INSTRUCTIONS = [
  "👋 This preview is a small app using the gesture library only through the public Core API.",
  "🤏 Pinch your thumb and index finger to trigger a virtual click. The click counter in the toolbar increases.",
  "🖐️ Hold one clear open palm for about one second to enter scroll mode. Then move your palm up or down for infinite scroll. Pinch to exit scroll mode.",
  "👈 Point your pinky left for one second, then pinch with the other hand to go to the previous letter page.",
  "👉 Point your pinky right for one second, then pinch with the other hand to go to the next letter page.",
  "🔎 Hold two hands in frame for one second to enter zoom mode. Move hands apart or together to resize this text.",
  "✅ The app code imports from ../Core only. It does not import internal gesture files.",
  "♿ The goal is to test accessible controls for a static page: click, scroll, navigation, and text zoom.",
  "🧪 Use Debug mode when you want to inspect the raw gesture result JSON.",
  "🚪 Pinch exits scroll mode and zoom mode when those modes are active.",
];

type VirtualEventKind =
  | "click"
  | "zoomReady"
  | "zoomExit"
  | "zoomIn"
  | "zoomOut"
  | "scrollReady"
  | "scrollExit"
  | "scrollTop"
  | "scrollDown"
  | "navigateBack"
  | "navigateForward";

type VirtualEventConfig = {
  icon: string;
  label: string;
  color: string;
  background: string;
  className: string;
};

type RecentVirtualEvent = VirtualEventConfig & {
  id: number;
  detail: string;
};

const VIRTUAL_EVENT_CONFIG: Record<VirtualEventKind, VirtualEventConfig> = {
  click: {
    icon: "⌖",
    label: "Virtual Click",
    color: "#198754",
    background: "#e9f7ef",
    className: "click",
  },
  zoomReady: {
    icon: "⛶",
    label: "Zoom Ready",
    color: "#6610f2",
    background: "#f0e8ff",
    className: "zoom-ready",
  },
  zoomExit: {
    icon: "×",
    label: "Zoom Mode Off",
    color: "#6c757d",
    background: "#f1f3f5",
    className: "zoom-exit",
  },
  zoomIn: {
    icon: "+",
    label: "Zoom In",
    color: "#198754",
    background: "#e9f7ef",
    className: "zoom-in",
  },
  zoomOut: {
    icon: "-",
    label: "Zoom Out",
    color: "#dc3545",
    background: "#fdecec",
    className: "zoom-out",
  },
  scrollReady: {
    icon: "✓",
    label: "Scroll Ready",
    color: "#20c997",
    background: "#e8fbf5",
    className: "scroll-ready",
  },
  scrollExit: {
    icon: "×",
    label: "Scroll Mode Off",
    color: "#6c757d",
    background: "#f1f3f5",
    className: "scroll-exit",
  },
  scrollTop: {
    icon: "↑",
    label: "Scroll Top",
    color: "#0d6efd",
    background: "#eaf2ff",
    className: "scroll-top",
  },
  scrollDown: {
    icon: "↓",
    label: "Scroll Down",
    color: "#0dcaf0",
    background: "#e7faff",
    className: "scroll-down",
  },
  navigateBack: {
    icon: "←",
    label: "Navigate Back",
    color: "#6f42c1",
    background: "#f1ecfb",
    className: "navigate-back",
  },
  navigateForward: {
    icon: "→",
    label: "Navigate Forward",
    color: "#fd7e14",
    background: "#fff1e5",
    className: "navigate-forward",
  },
};

const renderColoredPinchState = (handsData: TrackedHand[]) => {
  const jsonText = JSON.stringify(handsData, null, 2);
  const parts = jsonText.split(
    /("(?:active|click|toTop|down|openPalm|ready|entered|exited|back|forward|zoomIn|zoomOut)":\s*)(true|false)/g,
  );

  return parts.map((part, index) => {
    if (part === "true" || part === "false") {
      return (
        <span
          className={part === "true" ? "pinch-true" : "pinch-false"}
          key={`${part}-${index}`}
        >
          {part}
        </span>
      );
    }

    return part;
  });
};

function App() {
  // HTML Element and tracker class references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<ReturnType<typeof createHandTracker> | null>(null);
  const activeScrollDirectionRef = useRef<"up" | "down" | null>(null);
  const activeZoomDirectionRef = useRef<"in" | "out" | null>(null);
  const zoomSessionBaseScaleRef = useRef(1);
  const previewZoomScaleRef = useRef(1);

  // Core application tracking states
  const [loading, setLoading] = useState(true);
  const [hands, setHands] = useState<TrackedHand[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [recentVirtualEvent, setRecentVirtualEvent] =
    useState<RecentVirtualEvent | null>(null);
  const [stickyZoomGesture, setStickyZoomGesture] = useState<
    TrackedHand["gestures"]["zoom"] | null
  >(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [previewStatus, setPreviewStatus] = useState("No virtual event yet.");
  const [previewClickCount, setPreviewClickCount] = useState(0);
  const [previewZoomScale, setPreviewZoomScale] = useState(1);

  // Dynamic Resolution State (defaults to 640x480 until the hardware camera is analyzed)
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  // --- Runtime Interactive Config States ---
  const [normalize, setNormalize] = useState(true);
  const [precision, setPrecision] = useState(3);
  const scrollModeGesture = hands.find(
    (hand) => hand.gestures.scroll.mode !== "idle",
  )?.gestures.scroll;
  const liveZoomGesture = hands.find(
    (hand) => hand.gestures.zoom.mode !== "idle" || hand.gestures.zoom.exited,
  )?.gestures.zoom;
  const zoomModeGesture =
    liveZoomGesture ??
    (stickyZoomGesture?.ready ? stickyZoomGesture : undefined);
  const showZoomModeGesture =
    zoomModeGesture &&
    (zoomModeGesture.ready || (liveZoomGesture && liveZoomGesture.palmCount >= 2));
  const navigationHoldGesture = hands.find(
    (hand) =>
      hand.gestures.scroll.mode === "idle" &&
      hand.gestures.zoom.mode === "idle" &&
      hand.gestures.navigation.active,
  )?.gestures.navigation;
  const navigationReady = (navigationHoldGesture?.holdProgressMs ?? 0) >= 1000;
  const previewHint =
    scrollModeGesture?.ready
      ? "🖐️ Scroll mode active: move your palm up or down for infinite scroll. Pinch to exit scroll mode."
      : zoomModeGesture?.ready
        ? "🔎 Zoom mode active: move both hands apart/together to resize text. Pinch to exit zoom mode."
        : zoomModeGesture?.mode === "arming"
          ? `🔎 Hold both hands steady to enter zoom mode: ${zoomModeGesture.holdProgressMs}/1000 ms.`
      : navigationReady && navigationHoldGesture?.direction === "back"
        ? "👈 Ready to go back: pinch with your other hand to confirm going to the previous page."
        : navigationReady && navigationHoldGesture?.direction === "forward"
          ? "👉 Ready to go forward: pinch with your other hand to confirm going to the next page."
          : null;

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
  };

  const setPreviewZoomScaleValue = (scale: number) => {
    previewZoomScaleRef.current = scale;
    setPreviewZoomScale(scale);
  };

  const setPreviewAction = (message: string) => {
    setPreviewStatus(`${new Date().toLocaleTimeString()}: ${message}`);
  };

  const scrollPreviewBy = (amount: number) => {
    if (previewRef.current) {
      previewRef.current.scrollBy({
        top: amount,
        behavior: "auto",
      });
      return;
    }

    window.scrollBy({
      top: amount,
      behavior: "auto",
    });
  };

  // Draws lines and joint markers onto the canvas overlay using output form Tracker.ts
  const renderHandSkeleton = (detectedHands: TrackedHand[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvasRef.current;

    // Clear the canvas from the previous frame
    ctx.clearRect(0, 0, width, height);

    detectedHands.forEach((hand) => {
      const keypoints = hand.keypoints;

      // 1. Draw the bone lines using descriptive point properties (.x and .y)
      Object.entries(SKELETON_RENDER_CONFIG).forEach(([_, renderConfig]) => {
        ctx.beginPath();
        ctx.strokeStyle = renderConfig.color;
        ctx.lineWidth = 4;

        for (let i = 0; i < renderConfig.path.length - 1; i++) {
          const pt1 = keypoints[renderConfig.path[i]];
          const pt2 = keypoints[renderConfig.path[i + 1]];

          // Multiply the clean object values by our canvas dimensions to position pixels accurately
          if (
            pt1 &&
            pt2 &&
            pt1.x !== null &&
            pt1.y !== null &&
            pt2.x !== null &&
            pt2.y !== null
          ) {
            const x1 = normalize ? pt1.x * width : pt1.x;
            const y1 = normalize ? pt1.y * height : pt1.y;
            const x2 = normalize ? pt2.x * width : pt2.x;
            const y2 = normalize ? pt2.y * height : pt2.y;

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
        }
        ctx.stroke();
      });

      // 2. Draw white circle markers at every individual joint intersection
      keypoints.forEach((kp: TrackedHandKeypoint) => {
        if (kp.x !== null && kp.y !== null) {
          const x = normalize ? kp.x * width : kp.x;
          const y = normalize ? kp.y * height : kp.y;

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "white";
          ctx.fill();
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    });
  };

  const notifyPinchClicks = (detectedHands: TrackedHand[]) => {
    getGestureEvents(detectedHands).forEach((event) => {
      if (event.kind !== "click") return;

      emitVirtualEvent(
        "click",
        event.hand,
        event.detail,
      );
      setPreviewClickCount((count) => count + 1);
      setPreviewAction("Virtual click fired in preview.");
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
      activeZoomDirectionRef.current = null;
      setStickyZoomGesture(null);
      const event = getGestureEvents(detectedHands).find(
        (item) => item.kind === "zoomExit",
      );
      emitVirtualEvent("zoomExit", event?.hand, event?.detail ?? "Zoom exited.");
      return;
    }

    setStickyZoomGesture(zoomGesture);

    if (zoomGesture.entered) {
      zoomSessionBaseScaleRef.current = previewZoomScaleRef.current;
    }

    if (zoomGesture.ready) {
      setPreviewZoomScaleValue(
        Math.max(
          0.65,
          Math.min(1.8, zoomSessionBaseScaleRef.current * zoomGesture.scale),
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

    if (zoomGesture.zoomIn) {
      if (activeZoomDirectionRef.current !== "in") {
        activeZoomDirectionRef.current = "in";
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "zoomIn",
        );
        emitVirtualEvent("zoomIn", event?.hand, event?.detail ?? "Hands moved apart.");
      }
      return;
    }

    if (zoomGesture.zoomOut) {
      if (activeZoomDirectionRef.current !== "out") {
        activeZoomDirectionRef.current = "out";
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "zoomOut",
        );
        emitVirtualEvent("zoomOut", event?.hand, event?.detail ?? "Hands moved together.");
      }
      return;
    }

    if (zoomGesture.mode === "ready") {
      activeZoomDirectionRef.current = null;
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
        emitVirtualEvent(
          "scrollReady",
          event?.hand,
          event?.detail ?? "Open palm held for one second. Pinch to exit.",
        );
        return;
      }

      if (hand.gestures.scroll.toTop) {
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "scrollUp",
        );
        scrollPreviewBy(-(event?.scrollSpeedPx ?? hand.gestures.scroll.scrollSpeedPx));
        if (activeScrollDirectionRef.current !== "up") {
          activeScrollDirectionRef.current = "up";
          emitVirtualEvent(
            "scrollTop",
            event?.hand,
            event?.detail ?? "Palm above anchor. Infinite scroll up started.",
          );
          setPreviewAction("Preview panel is scrolling up.");
        }
        return;
      }

      if (hand.gestures.scroll.down) {
        const event = getGestureEvents(detectedHands).find(
          (item) => item.kind === "scrollDown",
        );
        scrollPreviewBy(event?.scrollSpeedPx ?? hand.gestures.scroll.scrollSpeedPx);
        if (activeScrollDirectionRef.current !== "down") {
          activeScrollDirectionRef.current = "down";
          emitVirtualEvent(
            "scrollDown",
            event?.hand,
            event?.detail ?? "Palm below anchor. Infinite scroll down started.",
          );
          setPreviewAction("Preview panel is scrolling down.");
        }
        return;
      }

      if (hand.gestures.scroll.mode === "ready") {
        activeScrollDirectionRef.current = null;
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
        setPreviewPageIndex((index) =>
          index === 0 ? PREVIEW_PAGES.length - 1 : index - 1,
        );
        setPreviewAction("Navigate back fired in preview.");
        emitVirtualEvent(
          "navigateBack",
          event.hand,
          event.detail,
        );
        return;
      }

      if (event.kind === "navigateForward") {
        setPreviewPageIndex((index) =>
          index === PREVIEW_PAGES.length - 1 ? 0 : index + 1,
        );
        setPreviewAction("Navigate forward fired in preview.");
        emitVirtualEvent(
          "navigateForward",
          event.hand,
          event.detail,
        );
      }
    });
  };

  useEffect(() => {
    if (!recentVirtualEvent) return;

    const timeoutId = window.setTimeout(() => {
      setRecentVirtualEvent(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [recentVirtualEvent]);

  useEffect(() => {
    previewRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [previewPageIndex]);

  // EFFECT 1: Handles camera authorization and ML initialization ONCE on mount
  useEffect(() => {
    let active = true;

    const initializeResources = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // Let the camera provide its natural aspect ratio
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                // Calculate proportional scaling if the camera is wider than MAX_WIDTH
                const nativeWidth = videoRef.current!.videoWidth;
                const nativeHeight = videoRef.current!.videoHeight;

                let displayWidth = nativeWidth;
                let displayHeight = nativeHeight;

                if (nativeWidth > MAX_WIDTH) {
                  const scaleRatio = MAX_WIDTH / nativeWidth;
                  displayWidth = MAX_WIDTH;
                  displayHeight = nativeHeight * scaleRatio;
                }

                setVideoSize({
                  width: displayWidth,
                  height: displayHeight,
                });

                resolve(null);
              };
            }
          });
          videoRef.current.play();
        }

        const tracker = createHandTracker();
        await tracker.initialize("lite");
        trackerRef.current = tracker;

        if (active) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        if (active) setLoading(false);
      }
    };

    initializeResources();

    return () => {
      active = false;
      if (trackerRef.current) trackerRef.current.stop();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // EFFECT 2: Dynamically re-starts the calculation stream whenever configuration preferences toggle
  useEffect(() => {
    // Prevent starting loops before hardware or library dependencies have resolved setup cycles
    if (loading || !trackerRef.current || !videoRef.current) return;

    trackerRef.current.start({
      videoElement: videoRef.current,
      normalize: normalize, // Uses our live reactive checkbox state variable
      precision: precision, // Uses our live reactive numeric select dropdown option state
      flipHorizontal: true,
      onData: (data) => {
        setHands(data);
        renderHandSkeleton(data);
        handleZoomGestures(data);
        notifyPinchClicks(data);
        handleScrollGestures(data);
        notifyNavigationGestures(data);
      },
    });

    // Cleanup inside this block stops the loop before launching a new cycle with fresh configuration states
    return () => {
      if (trackerRef.current) trackerRef.current.stop();
    };
  }, [loading, normalize, precision]);

  return (
    <div className="app-container">
      <Toaster position="top-center" richColors visibleToasts={2} />
      <header className="app-header">
        <h2>Hand Tracking with TensorFlow.js (Headless Architecture)</h2>
        <label className="debug-toggle">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(event) => setDebugMode(event.target.checked)}
          />
          {debugMode ? "Debug mode" : "Preview mode"}
        </label>
      </header>
      {loading && <div className="loading-indicator">Loading ML Model...</div>}

      <div className="workspace-layout">
        <div>
          <div
            className="feed-container"
            style={{ width: videoSize.width, height: videoSize.height }}
          >
            <video
              ref={videoRef}
              width={videoSize.width}
              height={videoSize.height}
              autoPlay
              playsInline
              className="video-element"
              style={{ width: videoSize.width, height: videoSize.height }}
            />
            <canvas
              ref={canvasRef}
              width={videoSize.width}
              height={videoSize.height}
              className="canvas-overlay"
              style={{ width: videoSize.width, height: videoSize.height }}
            />
            {scrollModeGesture && (
              <div
                className={`scroll-mode-indicator ${scrollModeGesture.mode}`}
              >
                <strong>
                  {scrollModeGesture.ready
                    ? "Scroll mode ready"
                    : "Hold open palm"}
                </strong>
                <small>
                  {scrollModeGesture.ready
                    ? "Pinch to exit"
                    : `${scrollModeGesture.holdProgressMs}/1000 ms`}
                </small>
              </div>
            )}
            {showZoomModeGesture && (
              <div className={`zoom-mode-indicator ${zoomModeGesture.mode}`}>
                <strong>
                  {zoomModeGesture.ready
                    ? "Zoom mode ready"
                    : zoomModeGesture.waitingForPalms
                      ? "Open both palms"
                      : "Hold both hands"}
                </strong>
                <small>
                  {zoomModeGesture.ready
                    ? `Scale ${previewZoomScale.toFixed(2)} · pinch to exit`
                    : zoomModeGesture.waitingForPalms
                      ? `${zoomModeGesture.palmCount}/2 palms ready`
                      : `${zoomModeGesture.holdProgressMs}/1000 ms`}
                </small>
              </div>
            )}
            {navigationHoldGesture && (
              <div
                className={`navigation-hold-indicator ${navigationHoldGesture.direction}`}
              >
                <strong>
                  {navigationReady
                    ? "Other hand pinch"
                    : navigationHoldGesture.direction === "back"
                      ? "Hold pinky left"
                      : "Hold pinky right"}
                </strong>
                <small>
                  {navigationReady
                    ? navigationHoldGesture.direction === "back"
                      ? "Ready: navigate back"
                      : "Ready: navigate forward"
                    : `${navigationHoldGesture.holdProgressMs}/1000 ms`}
                </small>
              </div>
            )}
            {recentVirtualEvent && (
              <div
                className={`virtual-event-hud ${recentVirtualEvent.className}`}
              >
                <span className="virtual-event-icon">
                  {recentVirtualEvent.icon}
                </span>
                <span className="virtual-event-copy">
                  <strong>{recentVirtualEvent.label}</strong>
                  <small>{recentVirtualEvent.detail}</small>
                </span>
              </div>
            )}
          </div>
        </div>

        {debugMode ? (
          <div className="live-monitor" style={{ maxHeight: videoSize.height }}>
            <TrackerControls
              normalize={normalize}
              setNormalize={setNormalize}
              precision={precision}
              setPrecision={setPrecision}
            />
            <h3 style={{ marginTop: 0 }}>
              Live API Data ({hands.length} hands):
            </h3>
            <pre className="code-block">{renderColoredPinchState(hands)}</pre>
          </div>
        ) : (
          <div
            className="preview-panel"
            style={{ maxHeight: videoSize.height }}
          >
            <div className="preview-toolbar">
              <strong>
                {PREVIEW_TITLE}. {PREVIEW_PAGES[previewPageIndex]}
              </strong>
              <span>
                Clicks: {previewClickCount} · Zoom:{" "}
                {previewZoomScale.toFixed(2)}
              </span>
            </div>
            <div className="preview-status">{previewStatus}</div>
            <div
              ref={previewRef}
              className="preview-window"
              style={{
                backgroundColor:
                  PREVIEW_COLORS[previewPageIndex % PREVIEW_COLORS.length],
                fontSize: `${16 * previewZoomScale}px`,
              }}
            >
              <h3>
                {PREVIEW_TITLE}. {PREVIEW_PAGES[previewPageIndex]}
              </h3>
              {previewHint && <p className="preview-hint">{previewHint}</p>}
              {PREVIEW_INSTRUCTIONS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {debugMode && (
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
