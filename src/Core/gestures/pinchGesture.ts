import type { GestureRecognizer } from "../gestureLibrary";
import { getDistance3D, roundValue } from "../mathUtils";
import type { TrackedPinchGesture } from "../types";

export const DEFAULT_PINCH_COOLDOWN_MS = 350;

const PINCH_DISTANCE_THRESHOLD = 0.06;

interface PinchGestureState {
  previousPinchActive: boolean;
  lastClickTimeMs: number;
}

export function createPinchGesture(
  cooldownMs = DEFAULT_PINCH_COOLDOWN_MS,
): GestureRecognizer<TrackedPinchGesture, PinchGestureState> {
  return {
    name: "pinch",
    createInitialState: () => ({
      previousPinchActive: false,
      lastClickTimeMs: -Infinity,
    }),
    recognize: (context, state) => {
      const pinchDistance = getDistance3D(
        context.keypoints3D?.[4],
        context.keypoints3D?.[8],
      );
      const active =
        pinchDistance !== null && pinchDistance < PINCH_DISTANCE_THRESHOLD;
      const detectedStarted = active && !state.previousPinchActive;
      const detectedReleased = !active && state.previousPinchActive;
      const started = context.hasStableHistory && detectedStarted;
      const released = context.hasStableHistory && detectedReleased;
      const click =
        started &&
        context.currentTimeMs - state.lastClickTimeMs >=
          Math.max(0, cooldownMs);

      state.previousPinchActive = active;
      if (click) {
        state.lastClickTimeMs = context.currentTimeMs;
      }

      return {
        active,
        started,
        released,
        click,
        distance: roundValue(pinchDistance, context.precision) ?? null,
      };
    },
  };
}
