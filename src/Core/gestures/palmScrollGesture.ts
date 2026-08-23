import type { GestureRecognizer } from "../gestureLibrary";
import { roundValue } from "../mathUtils";
import type { TrackedPinchGesture, TrackedScrollGesture } from "../types";
import {
  analyzeScreenFacingOpenPalm,
  getNormalizedPalmX,
  getNormalizedPalmY,
} from "../gestureUtils";

const SCROLL_READY_HOLD_MS = 1000;
const DEFAULT_SCROLL_SPEED_PX = 18;

interface ScrollGestureState {
  previousPalmX: number | null;
  previousPalmY: number | null;
  anchorPalmX: number | null;
  anchorPalmY: number | null;
  openPalmStartTimeMs: number | null;
  ready: boolean;
}

export interface PalmScrollGestureOptions {
  readyHoldMs?: number;
  scrollSpeedPx?: number;
}

export function createPalmScrollGesture(
  options: PalmScrollGestureOptions = {},
): GestureRecognizer<TrackedScrollGesture, ScrollGestureState> {
  const readyHoldMs = Math.max(0, options.readyHoldMs ?? SCROLL_READY_HOLD_MS);
  const scrollSpeedPx = Math.max(
    0,
    options.scrollSpeedPx ?? DEFAULT_SCROLL_SPEED_PX,
  );

  return {
    name: "scroll",
    createInitialState: () => ({
      previousPalmX: null,
      previousPalmY: null,
      anchorPalmX: null,
      anchorPalmY: null,
      openPalmStartTimeMs: null,
      ready: false,
    }),
    recognize: (context, state) => {
      const pinch = context.recognizedGestures.pinch as
        | TrackedPinchGesture
        | undefined;
      const palmX = getNormalizedPalmX(context.keypoints, context.videoWidth);
      const palmY = getNormalizedPalmY(context.keypoints, context.videoHeight);
      const palmDeltaX =
        palmX !== null && state.previousPalmX !== null
          ? palmX - state.previousPalmX
          : null;
      const palmDeltaY =
        palmY !== null && state.previousPalmY !== null
          ? palmY - state.previousPalmY
          : null;
      const palmAnalysis = analyzeScreenFacingOpenPalm(
        context.keypoints,
        context.keypoints3D,
      );
      const openPalm = palmAnalysis.active;
      const wasReady = state.ready;
      const wasArming = state.openPalmStartTimeMs !== null;
      const shouldExitMode =
        pinch?.click === true && (state.ready || wasArming);

      if (
        shouldExitMode ||
        palmX === null ||
        palmY === null ||
        (!state.ready && !openPalm)
      ) {
        state.openPalmStartTimeMs = null;
        state.anchorPalmX = null;
        state.anchorPalmY = null;
        state.ready = false;
      } else if (!state.ready) {
        if (state.openPalmStartTimeMs === null) {
          state.openPalmStartTimeMs = context.currentTimeMs;
        }

        if (
          context.currentTimeMs - state.openPalmStartTimeMs >=
          readyHoldMs
        ) {
          state.ready = true;
          state.anchorPalmX = palmX;
          state.anchorPalmY = palmY;
        }
      } else if (state.anchorPalmX === null || state.anchorPalmY === null) {
        state.anchorPalmX = palmX;
        state.anchorPalmY = palmY;
      }

      const holdProgressMs =
        openPalm && state.openPalmStartTimeMs !== null && !state.ready
          ? Math.min(
              context.currentTimeMs - state.openPalmStartTimeMs,
              readyHoldMs,
            )
          : state.ready
            ? readyHoldMs
            : 0;
      const palmMovementY =
        state.ready && palmY !== null && state.anchorPalmY !== null
          ? palmY - state.anchorPalmY
          : null;
      const palmMovementX =
        state.ready && palmX !== null && state.anchorPalmX !== null
          ? palmX - state.anchorPalmX
          : null;
      const direction =
        palmMovementY !== null
          ? palmMovementY < 0
            ? "up"
            : "down"
          : null;
      const directionX =
        palmMovementX !== null
          ? palmMovementX < 0
            ? "left"
            : "right"
          : null;
      const toTop =
        context.hasStableHistory && state.ready && direction === "up";
      const down =
        context.hasStableHistory && state.ready && direction === "down";
      const left =
        context.hasStableHistory && state.ready && directionX === "left";
      const right =
        context.hasStableHistory && state.ready && directionX === "right";
      const mode = state.ready
        ? "ready"
        : openPalm && palmY !== null && !shouldExitMode
          ? "arming"
          : "idle";

      state.previousPalmX = palmX ?? null;
      state.previousPalmY = palmY ?? null;

      return {
        active: state.ready && (direction !== null || directionX !== null),
        mode,
        ready: state.ready,
        entered: !wasReady && state.ready,
        exited: shouldExitMode && (wasReady || wasArming),
        holdProgressMs: Math.round(holdProgressMs),
        direction,
        directionX,
        toTop,
        down,
        left,
        right,
        scrollSpeedPx,
        anchorX: roundValue(state.anchorPalmX, context.precision) ?? null,
        anchorY: roundValue(state.anchorPalmY, context.precision) ?? null,
        openPalm,
        palmQuality: {
          fingersExtended: palmAnalysis.fingersExtended,
          screenFacing: palmAnalysis.screenFacing,
          fingersSeparated: palmAnalysis.fingersSeparated,
          thumbSpread: palmAnalysis.thumbSpread,
        },
        x: roundValue(palmX, context.precision) ?? null,
        y: roundValue(palmY, context.precision) ?? null,
        deltaX: roundValue(palmDeltaX, context.precision) ?? null,
        deltaY: roundValue(palmDeltaY, context.precision) ?? null,
        movementX: roundValue(palmMovementX, context.precision) ?? null,
        movementY: roundValue(palmMovementY, context.precision) ?? null,
      };
    },
  };
}
