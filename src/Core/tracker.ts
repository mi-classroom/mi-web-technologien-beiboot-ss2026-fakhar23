import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  DEFAULT_PINCH_COOLDOWN_MS,
  createDefaultGestureLibrary,
} from "./gestureDetector";
import {
  DEFAULT_ZOOM_DEAD_ZONE,
  createZoomModeController,
} from "./gestures";
import { formatCoordinate, roundValue } from "./mathUtils";
import type { TrackerConfig, TrackedHand } from "./types";
import type { GestureLibrary } from "./gestureLibrary";

// MediaPipe can briefly miss a hand during quick motion. Keep recognizer state
// long enough for that jitter to recover, but still release modes after a real exit.
const HAND_TRACKING_GRACE_PERIOD_MS = 400;

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
  TrackedNavigationGesture,
  TrackedPinchGesture,
  TrackedScrollGesture,
  TrackedZoomGesture,
  TrackerConfig,
} from "./types";

function navigationIsWaitingForPinch(hands: TrackedHand[]): boolean {
  return hands.some(
    (hand) =>
      hand.gestures.navigation.active &&
      hand.gestures.navigation.direction !== null &&
      hand.gestures.navigation.holdProgressMs >= 1000,
  );
}

function muteScrollGesture(hand: TrackedHand): void {
  hand.gestures.scroll = {
    ...hand.gestures.scroll,
    active: false,
    mode: "idle",
    ready: false,
    entered: false,
    exited: false,
    holdProgressMs: 0,
    direction: null,
    directionX: null,
    toTop: false,
    down: false,
    left: false,
    right: false,
  };
}

// Factory function that creates and returns our headless tracking engine
export function createHandTracker() {
  let detector: handPoseDetection.HandDetector | null = null;
  let animationFrameId: number | null = null;
  let isRunning = false;
  let currentLoopId = 0;
  let gestureLibrary: GestureLibrary | null = null;
  let zoomModeController = createZoomModeController();

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
      pinchDistanceThreshold,
      pinchClickHoldMs,
      scrollSpeedPx,
      scrollReadyHoldMs,
      navigationHoldMs,
      zoomDeadZone = DEFAULT_ZOOM_DEAD_ZONE,
      zoomReadyHoldMs,
      gestureLibrary: configuredGestureLibrary,
    } = config;

    isRunning = true;
    gestureLibrary =
      configuredGestureLibrary ??
      createDefaultGestureLibrary({
        navigationHoldMs,
        pinchClickHoldMs,
        pinchCooldownMs,
        pinchDistanceThreshold,
        scrollReadyHoldMs,
        scrollSpeedPx,
      });
    gestureLibrary.reset();
    zoomModeController = createZoomModeController({ readyHoldMs: zoomReadyHoldMs });
    zoomModeController.reset();
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

        const zoomFrame = zoomModeController.apply({
          estimatedHands,
          formattedHands,
          currentTimeMs,
          videoWidth: videoElement.width,
          videoHeight: videoElement.height,
          precision,
          deadZone: zoomDeadZone,
        });

        if (zoomFrame.mode !== "idle") {
          // Zoom is a modal two-hand gesture. While it is arming or ready, the
          // single-hand recognizers are muted so scroll/pinky cannot leak through.
          activeGestureLibrary.reset();

          formattedHands.forEach((hand) => {
            muteScrollGesture(hand);
            hand.gestures.navigation = {
              ...hand.gestures.navigation,
              active: false,
              direction: null,
              back: false,
              forward: false,
              holdProgressMs: 0,
            };
          });
        } else if (navigationIsWaitingForPinch(formattedHands)) {
          // Navigation confirmation has priority over scroll: once pinky is
          // armed, the second hand is expected to pinch, not start scroll mode.
          formattedHands.forEach(muteScrollGesture);
        }

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

        activeGestureLibrary.pruneInactiveHands(
          activeHandIds,
          currentTimeMs,
          HAND_TRACKING_GRACE_PERIOD_MS,
        );
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
