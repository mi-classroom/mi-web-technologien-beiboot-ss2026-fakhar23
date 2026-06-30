import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  DEFAULT_PINCH_COOLDOWN_MS,
  createDefaultGestureLibrary,
} from "./gestureDetector";
import { formatCoordinate, getDistance3D, roundValue } from "./mathUtils";
import type { TrackerConfig, TrackedHand } from "./types";
import type { GestureLibrary } from "./gestureLibrary";

const ZOOM_READY_HOLD_MS = 1000;
const DEFAULT_ZOOM_DEAD_ZONE = 0.08;
const ZOOM_EXIT_PINCH_DISTANCE_THRESHOLD = 0.06;

interface ZoomModeState {
  openPalmStartTimeMs: number | null;
  anchorDistance: number | null;
  ready: boolean;
  scale: number;
}

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
  let zoomState: ZoomModeState = {
    openPalmStartTimeMs: null,
    anchorDistance: null,
    ready: false,
    scale: 1,
  };
  let previousZoomExitPinchActive = false;

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
      zoomDeadZone = DEFAULT_ZOOM_DEAD_ZONE,
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
    zoomState = {
      openPalmStartTimeMs: null,
      anchorDistance: null,
      ready: false,
      scale: 1,
    };
    previousZoomExitPinchActive = false;
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

        const defaultZoomGesture = {
          active: false,
          mode: "idle" as const,
          waitingForPalms: false,
          ready: false,
          entered: false,
          exited: false,
          holdProgressMs: 0,
          palmCount: 0,
          direction: null,
          zoomIn: false,
          zoomOut: false,
          scale: zoomState.scale,
          anchorDistance: null,
          deadZone: roundValue(zoomDeadZone, precision) ?? zoomDeadZone,
          distance: null,
          movement: null,
        };

        formattedHands.forEach((hand) => {
          hand.gestures.zoom = { ...defaultZoomGesture };
        });

        const zoomExitPinchActive = estimatedHands.some((hand) => {
          const pinchDistance = getDistance3D(
            hand.keypoints3D?.[4],
            hand.keypoints3D?.[8],
          );

          return (
            pinchDistance !== null &&
            pinchDistance < ZOOM_EXIT_PINCH_DISTANCE_THRESHOLD
          );
        });
        const zoomExitRequested =
          zoomState.ready &&
          zoomExitPinchActive &&
          !previousZoomExitPinchActive;
        previousZoomExitPinchActive = zoomExitPinchActive;
        const visiblePalmHands = estimatedHands
          .map((hand, index) => ({
            formattedHand: formattedHands[index],
            palm: hand.keypoints[9],
          }))
          .filter(
            ({ formattedHand, palm }) =>
              formattedHand &&
              palm?.x !== null &&
              palm?.x !== undefined &&
              palm?.y !== null &&
              palm?.y !== undefined &&
              Number.isFinite(palm.x) &&
              Number.isFinite(palm.y),
          );
        const zoomPair = visiblePalmHands.slice(0, 2);
        const firstPalm = zoomPair[0]?.palm;
        const secondPalm = zoomPair[1]?.palm;
        const hasTwoVisiblePalms = zoomPair.length >= 2;
        const navigationWaitingForPinch = formattedHands.some(
          (hand) =>
            hand.gestures.navigation.active &&
            hand.gestures.navigation.direction !== null &&
            hand.gestures.navigation.holdProgressMs >= 1000,
        );
        const canArmZoom = hasTwoVisiblePalms && !navigationWaitingForPinch;
        const zoomDistance =
          hasTwoVisiblePalms && firstPalm && secondPalm
            ? Math.hypot(
                (firstPalm.x! - secondPalm.x!) / videoElement.width,
                (firstPalm.y! - secondPalm.y!) / videoElement.height,
              )
            : null;
        const wasZoomReady = zoomState.ready;

        if (zoomExitRequested) {
          zoomState = {
            openPalmStartTimeMs: null,
            anchorDistance: null,
            ready: false,
            scale: 1,
          };
        } else if (!zoomState.ready && canArmZoom) {
          if (zoomState.openPalmStartTimeMs === null) {
            zoomState.openPalmStartTimeMs = currentTimeMs;
          }

          if (currentTimeMs - zoomState.openPalmStartTimeMs >= ZOOM_READY_HOLD_MS) {
            zoomState.ready = true;
            zoomState.anchorDistance = zoomDistance;
            zoomState.scale = 1;
          }
        } else if (!zoomState.ready) {
          zoomState.openPalmStartTimeMs = null;
        }

        const zoomMovement =
          zoomState.ready &&
          zoomDistance !== null &&
          zoomState.anchorDistance !== null
            ? zoomDistance - zoomState.anchorDistance
            : null;
        const zoomDirection: "in" | "out" | null =
          zoomMovement !== null && Math.abs(zoomMovement) >= zoomDeadZone
            ? zoomMovement > 0
              ? "in"
              : "out"
            : null;

        if (
          zoomState.ready &&
          zoomDistance !== null &&
          zoomState.anchorDistance !== null &&
          zoomState.anchorDistance > 0
        ) {
          zoomState.scale = Math.max(
            0.65,
            Math.min(1.8, zoomDistance / zoomState.anchorDistance),
          );
        }

        const zoomHoldProgressMs =
          canArmZoom &&
          zoomState.openPalmStartTimeMs !== null &&
          !zoomState.ready
            ? Math.min(
                currentTimeMs - zoomState.openPalmStartTimeMs,
                ZOOM_READY_HOLD_MS,
              )
            : zoomState.ready
              ? ZOOM_READY_HOLD_MS
              : 0;
        const zoomMode = zoomState.ready
          ? "ready" as const
          : canArmZoom && !zoomExitRequested
            ? "arming" as const
            : "idle" as const;
        const zoomGesture = {
          active: zoomState.ready && zoomDirection !== null,
          mode: zoomMode,
          waitingForPalms: !zoomState.ready && !hasTwoVisiblePalms,
          ready: zoomState.ready,
          entered: !wasZoomReady && zoomState.ready,
          exited: zoomExitRequested && wasZoomReady,
          holdProgressMs: Math.round(zoomHoldProgressMs),
          palmCount: visiblePalmHands.length,
          direction: zoomDirection,
          zoomIn: zoomState.ready && zoomDirection === "in",
          zoomOut: zoomState.ready && zoomDirection === "out",
          scale: roundValue(zoomState.scale, 2) ?? zoomState.scale,
          anchorDistance:
            roundValue(zoomState.anchorDistance, precision) ?? null,
          deadZone: roundValue(zoomDeadZone, precision) ?? zoomDeadZone,
          distance: roundValue(zoomDistance, precision) ?? null,
          movement: roundValue(zoomMovement, precision) ?? null,
        };

        const zoomGestureTargets = zoomGesture.exited || zoomState.ready
          ? formattedHands
          : zoomPair.map(({ formattedHand }) => formattedHand);

        zoomGestureTargets.forEach((hand) => {
          hand.gestures.zoom = zoomGesture;
        });

        if (zoomMode !== "idle") {
          activeGestureLibrary.reset();

          formattedHands.forEach((hand) => {
            hand.gestures.scroll = {
              ...hand.gestures.scroll,
              active: false,
              mode: "idle",
              ready: false,
              entered: false,
              exited: false,
              holdProgressMs: 0,
              direction: null,
              toTop: false,
              down: false,
            };
            hand.gestures.navigation = {
              ...hand.gestures.navigation,
              active: false,
              direction: null,
              back: false,
              forward: false,
              holdProgressMs: 0,
            };
          });
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
