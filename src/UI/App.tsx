import { useEffect, useRef, useState } from "react";
import HandLogHistory from "./HandLogHistory";
import "./App.css";
import TrackerControls from "./TrackerControls";
import { createHandTracker } from "../Core/tracker";

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

function App() {
  // HTML Element and tracker class references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<ReturnType<typeof createHandTracker> | null>(null);

  // Core application tracking states
  const [loading, setLoading] = useState(true);
  const [hands, setHands] = useState<any[]>([]);

  // Dynamic Resolution State (defaults to 640x480 until the hardware camera is analyzed)
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  // --- Runtime Interactive Config States ---
  const [normalize, setNormalize] = useState(true);
  const [precision, setPrecision] = useState(3);

  // Draws lines and joint markers onto the canvas overlay using output form Tracker.ts
  const renderHandSkeleton = (detectedHands: any[]) => {
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
      keypoints.forEach((kp: any) => {
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
      onData: (data: any) => {
        setHands(data);
        renderHandSkeleton(data);
      },
    });

    // Cleanup inside this block stops the loop before launching a new cycle with fresh configuration states
    return () => {
      if (trackerRef.current) trackerRef.current.stop();
    };
  }, [loading, normalize, precision]);

  return (
    <div className="app-container">
      <h2>Hand Tracking with TensorFlow.js (Headless Architecture)</h2>
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
          </div>
        </div>

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
          <pre className="code-block">{JSON.stringify(hands, null, 2)}</pre>
        </div>
      </div>

      <hr style={{ borderColor: "#dee2e6", margin: "40px 0" }} />

      <HandLogHistory
        handsData={hands}
        videoRef={videoRef}
        canvasRef={canvasRef}
        trackingWidth={videoSize.width}
        trackingHeight={videoSize.height}
      />
    </div>
  );
}

export default App;
