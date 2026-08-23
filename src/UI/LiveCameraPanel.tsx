import type { CSSProperties, RefObject } from "react";
import type {
  TrackedHand,
  TrackedNavigationGesture,
  TrackedScrollGesture,
  TrackedZoomGesture,
} from "../Core";

type CameraEvent = {
  icon: string;
  label: string;
  detail: string;
  className: string;
};

type LiveCameraPanelProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hands: TrackedHand[];
  navigationGesture?: TrackedNavigationGesture;
  navigationReady: boolean;
  recentEvent: CameraEvent | null;
  scrollGesture?: TrackedScrollGesture;
  showTelemetry: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSize: { width: number; height: number };
  zoomGesture?: TrackedZoomGesture;
};

export default function LiveCameraPanel({
  canvasRef,
  hands,
  navigationGesture,
  navigationReady,
  recentEvent,
  scrollGesture,
  showTelemetry,
  videoRef,
  videoSize,
  zoomGesture,
}: LiveCameraPanelProps) {
  const feedStyle: CSSProperties = {
    maxWidth: videoSize.width,
    aspectRatio: `${videoSize.width} / ${videoSize.height}`,
  };

  return (
    <section className="camera-card">
      <div className="panel-heading">
        <span>Live camera</span>
        <small>
          {hands.length} hand{hands.length === 1 ? "" : "s"} tracked
        </small>
      </div>
      <div className="feed-container" style={feedStyle}>
        <video
          ref={videoRef}
          width={videoSize.width}
          height={videoSize.height}
          autoPlay
          playsInline
          className="video-element"
        />
        <canvas
          ref={canvasRef}
          width={videoSize.width}
          height={videoSize.height}
          className="canvas-overlay"
        />
        {scrollGesture && (
          <div className={`scroll-mode-indicator ${scrollGesture.mode}`}>
            <strong>
              {scrollGesture.ready ? "Rotate mode ready" : "Hold open palm"}
            </strong>
            <small>
              {scrollGesture.ready
                ? "Pinch to exit, or move hand out of frame"
                : "Hold for 1 second"}
            </small>
          </div>
        )}
        {zoomGesture && (
          <div className={`zoom-mode-indicator ${zoomGesture.mode}`}>
            <strong>
              {zoomGesture.ready
                ? "Zoom mode ready"
                : zoomGesture.waitingForPalms
                  ? "Open both palms"
                  : "Hold both hands"}
            </strong>
            <small>
              {zoomGesture.ready
                ? "Move hands apart or together. Pinch to exit."
                : zoomGesture.waitingForPalms
                  ? "Hold both hands in frame"
                  : "Hold for 1 second"}
            </small>
          </div>
        )}
        {navigationGesture && (
          <div className={`navigation-hold-indicator ${navigationGesture.direction}`}>
            <strong>
              {navigationReady
                ? "Other hand pinch"
                : navigationGesture.direction === "back"
                  ? "Hold pinky left"
                  : "Hold pinky right"}
            </strong>
            <small>
              {navigationReady
                ? navigationGesture.direction === "back"
                  ? "Ready: navigate back"
                  : "Ready: navigate forward"
                : "Hold for 1 second"}
            </small>
          </div>
        )}
        {showTelemetry && recentEvent && (
          <div className={`virtual-event-hud ${recentEvent.className}`}>
            <span className="virtual-event-icon">{recentEvent.icon}</span>
            <span className="virtual-event-copy">
              <strong>{recentEvent.label}</strong>
              <small>{recentEvent.detail}</small>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
