import {
  DEFAULT_PINCH_COOLDOWN_MS,
  createPalmScrollGesture,
  createPinchGesture,
  createPinkyNavigationGesture,
} from "./gestures";
import { GestureLibrary } from "./gestureLibrary";

export { DEFAULT_PINCH_COOLDOWN_MS };
export type {
  GestureRecognizer,
  GestureRecognizerContext,
} from "./gestureLibrary";
export { GestureLibrary } from "./gestureLibrary";

export interface DefaultGestureLibraryOptions {
  navigationHoldMs?: number;
  pinchClickHoldMs?: number;
  pinchCooldownMs?: number;
  pinchDistanceThreshold?: number;
  scrollReadyHoldMs?: number;
  scrollSpeedPx?: number;
}

export function createDefaultGestureLibrary(
  options: DefaultGestureLibraryOptions = {},
): GestureLibrary {
  return new GestureLibrary()
    .registerGesture(
      createPinchGesture({
        clickHoldMs: options.pinchClickHoldMs,
        cooldownMs: options.pinchCooldownMs ?? DEFAULT_PINCH_COOLDOWN_MS,
        distanceThreshold: options.pinchDistanceThreshold,
      }),
    )
    .registerGesture(
      createPalmScrollGesture({
        readyHoldMs: options.scrollReadyHoldMs,
        scrollSpeedPx: options.scrollSpeedPx,
      }),
    )
    .registerGesture(createPinkyNavigationGesture(options.navigationHoldMs));
}
