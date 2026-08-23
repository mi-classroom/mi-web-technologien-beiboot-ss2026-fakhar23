import type { GestureRecognizer } from "../gestureLibrary";
import { roundValue } from "../mathUtils";
import type { TrackedNavigationGesture, TrackedScrollGesture } from "../types";
import {
  getPinkyExtensionX,
} from "../gestureUtils";

const NAVIGATION_EXTENSION_THRESHOLD = 0.12;
const NAVIGATION_HOLD_MS = 1000;

interface NavigationGestureState {
  holdDirection: "back" | "forward" | null;
  holdStartTimeMs: number | null;
}

function isPoint(
  point: { x: number | null | undefined; y: number | null | undefined } | undefined,
): point is { x: number; y: number } {
  return (
    point?.x !== null &&
    point?.x !== undefined &&
    point?.y !== null &&
    point?.y !== undefined &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function hasFoldedFingers(
  keypoints: Parameters<typeof getPinkyExtensionX>[0],
  pinkyTip: { x: number; y: number },
): boolean {
  const palmCenter = keypoints?.[9];

  if (!isPoint(palmCenter)) {
    return false;
  }

  const pinkyReach = Math.hypot(
    pinkyTip.x - palmCenter.x,
    pinkyTip.y - palmCenter.y,
  );
  if (pinkyReach === 0) return false;

  const foldedFingerChains = [
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ];

  // The folded fingers must form a compact group near the palm. Their joint
  // chains are measured against the extended pinky's reach, so an open palm
  // fails because its other fingertips reach almost as far as the pinky.
  return foldedFingerChains.every((jointIndexes) => {
    const joints = jointIndexes.map((index) => keypoints?.[index]);
    if (!joints.every(isPoint)) return false;

    const farthestJointDistance = Math.max(
      ...joints.map((joint) =>
        Math.hypot(joint.x - palmCenter.x, joint.y - palmCenter.y),
      ),
    );
    const baseToTipDistance = Math.hypot(
      joints[3].x - joints[0].x,
      joints[3].y - joints[0].y,
    );

    return (
      farthestJointDistance <= pinkyReach * 0.72 &&
      baseToTipDistance <= pinkyReach * 0.6
    );
  });
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
  const pinkyExtensionX = getPinkyExtensionX(
    context.keypoints,
    context.videoWidth,
  );

  if (
    pinkyExtensionX === null ||
    !isPoint(palmCenter)
  ) {
    return null;
  }

  const pinkyTip = context.keypoints?.[20];
  if (!isPoint(pinkyTip)) return null;
  if (!hasFoldedFingers(context.keypoints, pinkyTip)) return null;
  const horizontalMovement = Math.abs(pinkyTip.x - palmCenter.x);
  const verticalMovement = Math.abs(pinkyTip.y - palmCenter.y);
  // The pinky must point sideways from the palm, rather than simply upwards.
  const isPointingSideways = horizontalMovement > verticalMovement * 1.25;

  if (
    !isPointingSideways ||
    Math.abs(pinkyExtensionX) < NAVIGATION_EXTENSION_THRESHOLD
  ) {
    return null;
  }

  return pinkyExtensionX < 0 ? "back" : "forward";
}

export function createPinkyNavigationGesture(
  holdMs = NAVIGATION_HOLD_MS,
): GestureRecognizer<
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
            holdMs,
            )
          : 0;
      return {
        active: direction !== null,
        direction,
        back: false,
        forward: false,
        holdProgressMs: Math.round(holdProgressMs),
        pinkyExtensionX: roundValue(pinkyExtensionX, context.precision) ?? null,
      };
    },
  };
}
