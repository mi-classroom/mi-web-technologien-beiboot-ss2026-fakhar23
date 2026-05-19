import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

// setting or config available to other components when starting the tracker
export interface TrackerConfig {
  videoElement: HTMLVideoElement;
  onData: (hands: any[]) => void;
  flipHorizontal?: boolean;
  normalize?: boolean;
  precision?: number;
}

// Factory function that creates and returns our headless tracking engine
export function createHandTracker() {
  // Internal state variables / hidden
  let detector: handPoseDetection.HandDetector | null = null;
  let animationFrameId: number | null = null;
  let isRunning: boolean = false;

  // Tracks the active loop session to prevent multiple loops from running at the same time
  let currentLoopId: number = 0;

  // Loads the TensorFlow backend and compiles the MediaPipe ML model
  async function initialize(modelType: "lite" | "full" = "full") {
    await tf.ready();
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detector = await handPoseDetection.createDetector(model, {
      runtime: "tfjs",
      modelType: modelType,
    });
  }

  // Starts the continuous camera analysis loop
  function start(config: TrackerConfig) {
    // Stop any previously running loop first
    stop();

    if (!detector) {
      throw new Error("Tracker not initialized. Call initialize() first.");
    }

    isRunning = true;
    currentLoopId++; // Bump the ID to invalidate any leftover async frames

    // Capture the current loop ID locally to compare it inside the asynchronous loop
    const localLoopId = currentLoopId;
    const {
      videoElement,
      onData,
      flipHorizontal = true,
      normalize = true,
      precision = 4,
    } = config;

    // The core recursive loop that processes webcam frames
    const detectLoop = async () => {
      // Guard Check 1: Stop immediately if the tracker was turned off or updated
      if (!isRunning || localLoopId !== currentLoopId) return;

      // Ensure the webcam is fully loaded and feeding data
      if (videoElement.readyState === 4) {
        const estimatedHands = await detector!.estimateHands(videoElement, {
          flipHorizontal,
        });

        // Guard Check 2: The ML model estimation takes a few milliseconds.
        // If the user changed settings during that wait time, drop this frame.
        if (!isRunning || localLoopId !== currentLoopId) return;

        // Inline helper function to scale coordinates and truncate decimal places
        const formatValue = (
          value: number | null,
          maxPixelDimension: number,
        ): number | null => {
          if (value === null) return null;
          // Scale between 0.0 and 1.0 if normalization is active, otherwise keep raw pixel numbers
          const processedValue = normalize ? value / maxPixelDimension : value;
          return precision !== undefined
            ? Number(processedValue.toFixed(precision))
            : processedValue;
        };

        // Format the raw machine learning output into clean object arrays
        const formattedHands = estimatedHands.map((hand) => ({
          hand: hand.handedness, // Tells us if it's a 'Left' or 'Right' hand
          score: hand.score ? Number(hand.score.toFixed(3)) : null, // Confidence rating

          // Clean 2D Screen Space Coordinates
          keypoints: hand.keypoints.map((kp) => ({
            name: kp.name,
            x: formatValue(kp.x, videoElement.width),
            y: formatValue(kp.y, videoElement.height),
          })),

          // Clean 3D Metric Space Coordinates
          keypoints3D: hand.keypoints3D
            ? hand.keypoints3D.map((kp) => ({
                name: kp.name,
                x:
                  precision !== undefined && kp.x !== null
                    ? Number(kp.x.toFixed(precision))
                    : kp.x,
                y:
                  precision !== undefined && kp.y !== null
                    ? Number(kp.y.toFixed(precision))
                    : kp.y,
                z:
                  precision !== undefined && kp.z !== null
                    ? Number(kp.z?.toFixed(precision))
                    : kp.z,
              }))
            : undefined,
        }));

        // Send the formatted raw data back to the application callback
        onData(formattedHands);
      }

      // Guard Check 3: Only schedule the next webcam frame if this loop version is still active
      if (isRunning && localLoopId === currentLoopId) {
        animationFrameId = requestAnimationFrame(detectLoop);
      }
    };

    // Fire the initial loop frame
    detectLoop();
  }

  // Cancels animations and stops tracking loops
  function stop() {
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // Expose our public interface methods to developers
  return { initialize, start, stop };
}
