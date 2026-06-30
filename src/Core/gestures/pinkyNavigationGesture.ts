import type { GestureRecognizer } from "../gestureLibrary";
import { roundValue } from "../mathUtils";
import type {
  TrackedNavigationGesture,
  TrackedScrollGesture,
} from "../types";
import { getPinkyExtensionX } from "../gestureUtils";

const NAVIGATION_EXTENSION_THRESHOLD = 0.12;
const NAVIGATION_HOLD_MS = 1000;
const PINKY_HORIZONTAL_RATIO = 2.5;

interface NavigationGestureState {
  holdDirection: "back" | "forward" | null;
  holdStartTimeMs: number | null;
}

function getPinkyNavigationDirection(
  context: Parameters<
    GestureRecognizer<
      TrackedNavigationGesture,
      NavigationGestureState
    >["recognize"]
  >[0],
): "back" | "forward" | null {
  const palmCenter = context.keypoints?.[9];
  const pinkyBase = context.keypoints?.[17];
  const pinkyTip = context.keypoints?.[20];
  const pinkyExtensionX = getPinkyExtensionX(
    context.keypoints,
    context.videoWidth,
  );

  if (
    pinkyExtensionX === null ||
    palmCenter?.x === null ||
    palmCenter?.x === undefined ||
    palmCenter?.y === null ||
    palmCenter?.y === undefined ||
    pinkyBase?.x === null ||
    pinkyBase?.x === undefined ||
    pinkyBase?.y === null ||
    pinkyBase?.y === undefined ||
    pinkyTip?.x === null ||
    pinkyTip?.x === undefined ||
    pinkyTip?.y === null ||
    pinkyTip?.y === undefined
  ) {
    return null;
  }

  const horizontalMovement = Math.abs(pinkyTip.x - palmCenter.x);
  const verticalMovement = Math.abs(pinkyTip.y - palmCenter.y);
  const pinkyBoneX = Math.abs(pinkyTip.x - pinkyBase.x);
  const pinkyBoneY = Math.abs(pinkyTip.y - pinkyBase.y);
  const isPointingSideways = horizontalMovement > verticalMovement * 1.25;
  const isPinkyHorizontal = pinkyBoneX > pinkyBoneY * PINKY_HORIZONTAL_RATIO;

  if (
    !isPointingSideways ||
    !isPinkyHorizontal ||
    Math.abs(pinkyExtensionX) < NAVIGATION_EXTENSION_THRESHOLD
  ) {
    return null;
  }

  return pinkyExtensionX < 0 ? "back" : "forward";
}

export function createPinkyNavigationGesture(): GestureRecognizer<
  TrackedNavigationGesture,
  NavigationGestureState
> {
  return {
    name: "navigation",
    createInitialState: () => ({
      holdDirection: null,
      holdStartTimeMs: null,
    }),
    recognize: (context, state) => {
      const scroll = context.recognizedGestures.scroll as
        | TrackedScrollGesture
        | undefined;
      if (scroll && scroll.mode !== "idle") {
        state.holdStartTimeMs = null;
        state.holdDirection = null;
        return {
          active: false,
          direction: null,
          back: false,
          forward: false,
          holdProgressMs: 0,
          pinkyExtensionX: null,
        };
      }

      const pinkyExtensionX = getPinkyExtensionX(
        context.keypoints,
        context.videoWidth,
      );
      const direction = getPinkyNavigationDirection(context);

      if (direction === null) {
        state.holdStartTimeMs = null;
        state.holdDirection = null;
      } else if (direction !== state.holdDirection) {
        state.holdStartTimeMs = context.currentTimeMs;
        state.holdDirection = direction;
      }

      const holdProgressMs =
        direction !== null && state.holdStartTimeMs !== null
          ? Math.min(
              context.currentTimeMs - state.holdStartTimeMs,
              NAVIGATION_HOLD_MS,
            )
          : 0;
      return {
        active: direction !== null,
        direction,
        back: false,
        forward: false,
        holdProgressMs: Math.round(holdProgressMs),
        pinkyExtensionX:
          roundValue(pinkyExtensionX, context.precision) ?? null,
      };
    },
  };
}
