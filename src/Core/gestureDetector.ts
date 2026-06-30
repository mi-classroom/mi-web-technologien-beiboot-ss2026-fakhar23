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
  pinchCooldownMs?: number;
  scrollSpeedPx?: number;
  scrollDeadZone?: number;
}

export function createDefaultGestureLibrary(
  options: DefaultGestureLibraryOptions = {},
): GestureLibrary {
  return new GestureLibrary()
    .registerGesture(
      createPinchGesture(options.pinchCooldownMs ?? DEFAULT_PINCH_COOLDOWN_MS),
    )
    .registerGesture(
      createPalmScrollGesture({
        deadZone: options.scrollDeadZone,
        scrollSpeedPx: options.scrollSpeedPx,
      }),
    )
    .registerGesture(createPinkyNavigationGesture());
}
