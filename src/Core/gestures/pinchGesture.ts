import type { GestureRecognizer } from "../gestureLibrary";
import { getDistance3D, roundValue } from "../mathUtils";
import type { TrackedPinchGesture } from "../types";

export const DEFAULT_PINCH_COOLDOWN_MS = 350;

const PINCH_DISTANCE_THRESHOLD = 0.06;
const PINCH_CLICK_HOLD_MS = 120;

export interface PinchGestureOptions {
  clickHoldMs?: number;
  cooldownMs?: number;
  distanceThreshold?: number;
}

interface PinchGestureState {
  previousQualifiedPinchActive: boolean;
  pinchStartTimeMs: number | null;
  lastClickTimeMs: number;
}

export function createPinchGesture(
  options: PinchGestureOptions = {},
): GestureRecognizer<TrackedPinchGesture, PinchGestureState> {
  const cooldownMs = options.cooldownMs ?? DEFAULT_PINCH_COOLDOWN_MS;
  const distanceThreshold =
    options.distanceThreshold ?? PINCH_DISTANCE_THRESHOLD;
  const clickHoldMs = options.clickHoldMs ?? PINCH_CLICK_HOLD_MS;

  return {
    name: "pinch",
    createInitialState: () => ({
      previousQualifiedPinchActive: false,
      pinchStartTimeMs: null,
      lastClickTimeMs: -Infinity,
    }),
    recognize: (context, state) => {
      const pinchDistance = getDistance3D(
        context.keypoints3D?.[4],
        context.keypoints3D?.[8],
      );
      const active =
        pinchDistance !== null && pinchDistance < distanceThreshold;

      if (active && state.pinchStartTimeMs === null) {
        state.pinchStartTimeMs = context.currentTimeMs;
      } else if (!active) {
        state.pinchStartTimeMs = null;
      }

      // New/vanishing hands can produce one noisy close-distance frame. The
      // click event only fires after a short stable pinch hold.
      const qualifiedActive =
        active &&
        context.hasStableHistory &&
        state.pinchStartTimeMs !== null &&
        context.currentTimeMs - state.pinchStartTimeMs >= clickHoldMs;
      const started = qualifiedActive && !state.previousQualifiedPinchActive;
      const released = !qualifiedActive && state.previousQualifiedPinchActive;
      const click =
        started &&
        context.currentTimeMs - state.lastClickTimeMs >=
          Math.max(0, cooldownMs);

      state.previousQualifiedPinchActive = qualifiedActive;
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
