import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  DEFAULT_PINCH_COOLDOWN_MS,
  createGestureDetectorState,
  detectHandGestures,
  pruneGestureDetectorState,
} from "./gestureDetector";
import { formatCoordinate, roundValue } from "./mathUtils";
import type { TrackerConfig, TrackedHand } from "./types";

export type {
  HandKeypoint2D,
  HandKeypoint3D,
  TrackedHand,
  TrackedHandGestures,
  TrackedHandKeypoint,
  TrackedHandKeypoint3D,
  TrackerConfig,
} from "./types";

// Factory function that creates and returns our headless tracking engine
export function createHandTracker() {
  let detector: handPoseDetection.HandDetector | null = null;
  let animationFrameId: number | null = null;
  let isRunning = false;
  let currentLoopId = 0;
  let gestureState = createGestureDetectorState();

  // Loads the TensorFlow backend and compiles the MediaPipe ML model
  async function initialize(modelType: "lite" | "full" = "lite") {
    await tf.ready();
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detector = await handPoseDetection.createDetector(model, {
      runtime: "tfjs",
      modelType,
    });
  }

  // Starts the continuous camera analysis loop
  function start(config: TrackerConfig) {
    stop();

    if (!detector) {
      throw new Error("Tracker not initialized. Call initialize() first.");
    }

    isRunning = true;
    gestureState = createGestureDetectorState();
    currentLoopId++;

    const localLoopId = currentLoopId;
    const {
      videoElement,
      onData,
      flipHorizontal = true,
      normalize = true,
      precision = 4,
      pinchCooldownMs = DEFAULT_PINCH_COOLDOWN_MS,
    } = config;

    const detectLoop = async () => {
      if (!isRunning || localLoopId !== currentLoopId) return;

      if (videoElement.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const estimatedHands = await detector!.estimateHands(videoElement, {
          flipHorizontal,
        });

        if (!isRunning || localLoopId !== currentLoopId) return;

        const currentTimeMs = performance.now();
        const activeHandIds = new Set<string>();

        const formattedHands: TrackedHand[] = estimatedHands.map(
          (hand, index) => {
            const handId = `${hand.handedness ?? "hand"}-${index}`;
            activeHandIds.add(handId);

            return {
              hand: hand.handedness,
              score: roundValue(hand.score, 3) ?? null,
              gestures: detectHandGestures({
                handId,
                keypoints3D: hand.keypoints3D,
                currentTimeMs,
                precision,
                pinchCooldownMs,
                state: gestureState,
              }),
              keypoints: hand.keypoints.map((keypoint) => ({
                name: keypoint.name,
                x: formatCoordinate(
                  keypoint.x,
                  videoElement.width,
                  normalize,
                  precision,
                ),
                y: formatCoordinate(
                  keypoint.y,
                  videoElement.height,
                  normalize,
                  precision,
                ),
              })),
              keypoints3D: hand.keypoints3D?.map((keypoint) => ({
                name: keypoint.name,
                x: roundValue(keypoint.x, precision),
                y: roundValue(keypoint.y, precision),
                z: roundValue(keypoint.z, precision),
              })),
            };
          },
        );

        pruneGestureDetectorState(gestureState, activeHandIds);
        onData(formattedHands);
      }

      if (isRunning && localLoopId === currentLoopId) {
        animationFrameId = requestAnimationFrame(detectLoop);
      }
    };

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

  return { initialize, start, stop };
}
