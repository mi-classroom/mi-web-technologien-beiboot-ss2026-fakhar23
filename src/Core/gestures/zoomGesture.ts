import type * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { getDistance3D, roundValue } from "../mathUtils";
import type { TrackedHand, TrackedZoomGesture } from "../types";

export const DEFAULT_ZOOM_DEAD_ZONE = 0.08;

const ZOOM_READY_HOLD_MS = 1000;
const ZOOM_EXIT_PINCH_DISTANCE_THRESHOLD = 0.05;
const ZOOM_EXIT_PINCH_HOLD_MS = 180;

interface ZoomModeState {
  openPalmStartTimeMs: number | null;
  anchorDistance: number | null;
  ready: boolean;
  scale: number;
}

export interface ZoomGestureFrameInput {
  estimatedHands: handPoseDetection.Hand[];
  formattedHands: TrackedHand[];
  currentTimeMs: number;
  videoWidth: number;
  videoHeight: number;
  precision: number;
  deadZone?: number;
}

export interface ZoomGestureFrameResult {
  mode: TrackedZoomGesture["mode"];
}

function createInitialZoomState(): ZoomModeState {
  return {
    openPalmStartTimeMs: null,
    anchorDistance: null,
    ready: false,
    scale: 1,
  };
}

function createDefaultZoomGesture(
  state: ZoomModeState,
  deadZone: number,
  precision: number,
): TrackedZoomGesture {
  return {
    active: false,
    mode: "idle",
    waitingForPalms: false,
    ready: false,
    entered: false,
    exited: false,
    holdProgressMs: 0,
    palmCount: 0,
    direction: null,
    zoomIn: false,
    zoomOut: false,
    scale: state.scale,
    anchorDistance: null,
    deadZone: roundValue(deadZone, precision) ?? deadZone,
    distance: null,
    movement: null,
  };
}

function hasZoomExitPinch(hand: handPoseDetection.Hand): boolean {
  const pinchDistance = getDistance3D(
    hand.keypoints3D?.[4],
    hand.keypoints3D?.[8],
  );

  return (
    pinchDistance !== null &&
    pinchDistance < ZOOM_EXIT_PINCH_DISTANCE_THRESHOLD
  );
}

export function createZoomModeController() {
  let state = createInitialZoomState();
  let exitPinchStartTimeMs: number | null = null;

  return {
    reset() {
      state = createInitialZoomState();
      exitPinchStartTimeMs = null;
    },

    apply(input: ZoomGestureFrameInput): ZoomGestureFrameResult {
      const {
        estimatedHands,
        formattedHands,
        currentTimeMs,
        videoWidth,
        videoHeight,
        precision,
        deadZone = DEFAULT_ZOOM_DEAD_ZONE,
      } = input;

      formattedHands.forEach((hand) => {
        hand.gestures.zoom = createDefaultZoomGesture(
          state,
          deadZone,
          precision,
        );
      });

      const exitPinchActive = state.ready && estimatedHands.some(hasZoomExitPinch);
      if (exitPinchActive && exitPinchStartTimeMs === null) {
        exitPinchStartTimeMs = currentTimeMs;
      } else if (!exitPinchActive) {
        exitPinchStartTimeMs = null;
      }

      // A single noisy landmark frame should not close zoom mode. Require a
      // short deliberate pinch hold before emitting the exit event.
      const exitRequested =
        exitPinchStartTimeMs !== null &&
        currentTimeMs - exitPinchStartTimeMs >= ZOOM_EXIT_PINCH_HOLD_MS;

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

      // Navigation confirmation has priority: when pinky navigation is ready
      // and waiting for a pinch, a second hand must not accidentally arm zoom.
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
              (firstPalm.x! - secondPalm.x!) / videoWidth,
              (firstPalm.y! - secondPalm.y!) / videoHeight,
            )
          : null;
      const wasReady = state.ready;

      if (exitRequested) {
        state = createInitialZoomState();
        exitPinchStartTimeMs = null;
      } else if (!state.ready && canArmZoom) {
        if (state.openPalmStartTimeMs === null) {
          state.openPalmStartTimeMs = currentTimeMs;
        }

        if (currentTimeMs - state.openPalmStartTimeMs >= ZOOM_READY_HOLD_MS) {
          state.ready = true;
          state.anchorDistance = zoomDistance;
          state.scale = 1;
        }
      } else if (!state.ready) {
        state.openPalmStartTimeMs = null;
      }

      const movement =
        state.ready && zoomDistance !== null && state.anchorDistance !== null
          ? zoomDistance - state.anchorDistance
          : null;
      const direction: "in" | "out" | null =
        movement !== null && Math.abs(movement) >= deadZone
          ? movement > 0
            ? "in"
            : "out"
          : null;

      if (
        state.ready &&
        zoomDistance !== null &&
        state.anchorDistance !== null &&
        state.anchorDistance > 0
      ) {
        state.scale = Math.max(
          0.65,
          Math.min(1.8, zoomDistance / state.anchorDistance),
        );
      }

      const holdProgressMs =
        canArmZoom && state.openPalmStartTimeMs !== null && !state.ready
          ? Math.min(currentTimeMs - state.openPalmStartTimeMs, ZOOM_READY_HOLD_MS)
          : state.ready
            ? ZOOM_READY_HOLD_MS
            : 0;
      const mode = state.ready
        ? "ready"
        : canArmZoom && !exitRequested
          ? "arming"
          : "idle";
      const zoomGesture: TrackedZoomGesture = {
        active: state.ready && direction !== null,
        mode,
        waitingForPalms: !state.ready && !hasTwoVisiblePalms,
        ready: state.ready,
        entered: !wasReady && state.ready,
        exited: exitRequested && wasReady,
        holdProgressMs: Math.round(holdProgressMs),
        palmCount: visiblePalmHands.length,
        direction,
        zoomIn: state.ready && direction === "in",
        zoomOut: state.ready && direction === "out",
        scale: roundValue(state.scale, 2) ?? state.scale,
        anchorDistance: roundValue(state.anchorDistance, precision) ?? null,
        deadZone: roundValue(deadZone, precision) ?? deadZone,
        distance: roundValue(zoomDistance, precision) ?? null,
        movement: roundValue(movement, precision) ?? null,
      };

      // Once zoom is ready, it remains attached to all visible hands even if
      // one hand leaves the frame. Pinch is the only exit path.
      const targets = zoomGesture.exited || state.ready
        ? formattedHands
        : zoomPair.map(({ formattedHand }) => formattedHand);

      targets.forEach((hand) => {
        hand.gestures.zoom = zoomGesture;
      });

      return { mode };
    },
  };
}
