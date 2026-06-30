import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  DEFAULT_PINCH_COOLDOWN_MS,
  createDefaultGestureLibrary,
} from "./gestureDetector";
import { formatCoordinate, roundValue } from "./mathUtils";
import type { TrackerConfig, TrackedHand } from "./types";
import type { GestureLibrary } from "./gestureLibrary";

export type {
  GestureRecognizer,
  GestureRecognizerContext,
} from "./gestureDetector";
export {
  GestureLibrary,
  createDefaultGestureLibrary,
} from "./gestureDetector";

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
  let gestureLibrary: GestureLibrary | null = null;

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

    const {
      videoElement,
      onData,
      flipHorizontal = true,
      normalize = true,
      precision = 4,
      pinchCooldownMs = DEFAULT_PINCH_COOLDOWN_MS,
      scrollSpeedPx,
      gestureLibrary: configuredGestureLibrary,
    } = config;

    isRunning = true;
    gestureLibrary =
      configuredGestureLibrary ??
      createDefaultGestureLibrary({
        pinchCooldownMs,
        scrollSpeedPx,
      });
    gestureLibrary.reset();
    currentLoopId++;

    const localLoopId = currentLoopId;
    const activeGestureLibrary = gestureLibrary;

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
              gestures: activeGestureLibrary.evaluateHand({
                handId,
                keypoints: hand.keypoints,
                keypoints3D: hand.keypoints3D,
                videoWidth: videoElement.width,
                videoHeight: videoElement.height,
                currentTimeMs,
                precision,
              }) as unknown as TrackedHand["gestures"],
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

        const confirmingPinchHandIndex = formattedHands.findIndex(
          (hand) => hand.gestures.pinch.click,
        );

        if (confirmingPinchHandIndex !== -1) {
          const navigationHand = formattedHands.find(
            (hand, index) =>
              index !== confirmingPinchHandIndex &&
              hand.gestures.navigation.active &&
              hand.gestures.navigation.direction !== null &&
              hand.gestures.navigation.holdProgressMs >= 1000,
          );

          if (navigationHand?.gestures.navigation.direction === "back") {
            navigationHand.gestures.navigation.back = true;
          } else if (
            navigationHand?.gestures.navigation.direction === "forward"
          ) {
            navigationHand.gestures.navigation.forward = true;
          }
        }

        activeGestureLibrary.pruneInactiveHands(activeHandIds);
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
