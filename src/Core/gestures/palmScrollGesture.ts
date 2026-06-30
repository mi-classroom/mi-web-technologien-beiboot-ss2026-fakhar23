import type { GestureRecognizer } from "../gestureLibrary";
import { roundValue } from "../mathUtils";
import type {
  TrackedPinchGesture,
  TrackedScrollGesture,
} from "../types";
import {
  analyzeScreenFacingOpenPalm,
  getNormalizedPalmY,
} from "../gestureUtils";

const DEFAULT_SCROLL_DEAD_ZONE = 0.08;
const DEFAULT_SCROLL_SPEED_PX = 18;
const SCROLL_READY_HOLD_MS = 1000;

interface ScrollGestureState {
  previousPalmY: number | null;
  anchorPalmY: number | null;
  openPalmStartTimeMs: number | null;
  ready: boolean;
}

export interface PalmScrollGestureOptions {
  deadZone?: number;
  scrollSpeedPx?: number;
}

export function createPalmScrollGesture(
  options: PalmScrollGestureOptions = {},
): GestureRecognizer<TrackedScrollGesture, ScrollGestureState> {
  const deadZone = Math.max(0, options.deadZone ?? DEFAULT_SCROLL_DEAD_ZONE);
  const scrollSpeedPx = Math.max(
    0,
    options.scrollSpeedPx ?? DEFAULT_SCROLL_SPEED_PX,
  );

  return {
    name: "scroll",
    createInitialState: () => ({
      previousPalmY: null,
      anchorPalmY: null,
      openPalmStartTimeMs: null,
      ready: false,
    }),
    recognize: (context, state) => {
      const pinch = context.recognizedGestures.pinch as
        | TrackedPinchGesture
        | undefined;
      const palmY = getNormalizedPalmY(context.keypoints, context.videoHeight);
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

      if (shouldExitMode || palmY === null || (!state.ready && !openPalm)) {
        state.openPalmStartTimeMs = null;
        state.anchorPalmY = null;
        state.ready = false;
      } else if (!state.ready) {
        if (state.openPalmStartTimeMs === null) {
          state.openPalmStartTimeMs = context.currentTimeMs;
        }

        if (
          context.currentTimeMs - state.openPalmStartTimeMs >=
          SCROLL_READY_HOLD_MS
        ) {
          state.ready = true;
          state.anchorPalmY = palmY;
        }
      } else if (state.anchorPalmY === null) {
        state.anchorPalmY = palmY;
      }

      const holdProgressMs =
        openPalm && state.openPalmStartTimeMs !== null && !state.ready
          ? Math.min(
              context.currentTimeMs - state.openPalmStartTimeMs,
              SCROLL_READY_HOLD_MS,
            )
          : state.ready
            ? SCROLL_READY_HOLD_MS
            : 0;
      const palmMovementY =
        state.ready && palmY !== null && state.anchorPalmY !== null
          ? palmY - state.anchorPalmY
          : null;
      const direction =
        palmMovementY !== null && Math.abs(palmMovementY) >= deadZone
          ? palmMovementY < 0
            ? "up"
            : "down"
          : null;
      const toTop =
        context.hasStableHistory && state.ready && direction === "up";
      const down =
        context.hasStableHistory && state.ready && direction === "down";
      const mode =
        state.ready
          ? "ready"
          : openPalm && palmY !== null && !shouldExitMode
            ? "arming"
            : "idle";

      state.previousPalmY = palmY ?? null;

      return {
        active: state.ready && direction !== null,
        mode,
        ready: state.ready,
        entered: !wasReady && state.ready,
        exited: shouldExitMode && (wasReady || wasArming),
        holdProgressMs: Math.round(holdProgressMs),
        direction,
        toTop,
        down,
        scrollSpeedPx,
        anchorY: roundValue(state.anchorPalmY, context.precision) ?? null,
        deadZone: roundValue(deadZone, context.precision) ?? deadZone,
        openPalm,
        palmQuality: {
          fingersExtended: palmAnalysis.fingersExtended,
          screenFacing: palmAnalysis.screenFacing,
          fingersSeparated: palmAnalysis.fingersSeparated,
          thumbSpread: palmAnalysis.thumbSpread,
        },
        y: roundValue(palmY, context.precision) ?? null,
        deltaY: roundValue(palmDeltaY, context.precision) ?? null,
        movementY: roundValue(palmMovementY, context.precision) ?? null,
      };
    },
  };
}
