import { getDistance3D, roundValue } from "./mathUtils";
import type { HandKeypoint3D, TrackedHandGestures } from "./types";

const PINCH_DISTANCE_THRESHOLD = 0.06;
const MIN_STABLE_HAND_FRAMES = 3;
export const DEFAULT_PINCH_COOLDOWN_MS = 350;

export interface GestureDetectorState {
  observedFrameCountByHand: Record<string, number>;
  previousPalmYByHand: Record<string, number | null>;
  previousPinchStateByHand: Record<string, boolean>;
  lastPinchClickTimeByHand: Record<string, number>;
}

interface DetectHandGesturesParams {
  handId: string;
  keypoints3D: HandKeypoint3D[] | undefined;
  currentTimeMs: number;
  precision: number | undefined;
  pinchCooldownMs: number;
  state: GestureDetectorState;
}

export function createGestureDetectorState(): GestureDetectorState {
  return {
    observedFrameCountByHand: {},
    previousPalmYByHand: {},
    previousPinchStateByHand: {},
    lastPinchClickTimeByHand: {},
  };
}

export function detectHandGestures({
  handId,
  keypoints3D,
  currentTimeMs,
  precision,
  pinchCooldownMs,
  state,
}: DetectHandGesturesParams): TrackedHandGestures {
  const pinchDistance = getDistance3D(keypoints3D?.[4], keypoints3D?.[8]);
  const isPinching =
    pinchDistance !== null && pinchDistance < PINCH_DISTANCE_THRESHOLD;
  const observedFrameCount =
    (state.observedFrameCountByHand[handId] ?? 0) + 1;
  const hasStableHistory = observedFrameCount >= MIN_STABLE_HAND_FRAMES;

  const wasPinching = state.previousPinchStateByHand[handId] ?? false;
  const detectedPinchStarted = isPinching && !wasPinching;
  const detectedPinchReleased = !isPinching && wasPinching;
  const pinchStarted = hasStableHistory && detectedPinchStarted;
  const pinchReleased = hasStableHistory && detectedPinchReleased;
  const lastPinchClickTime =
    state.lastPinchClickTimeByHand[handId] ?? -Infinity;

  // Edge detection turns a sustained distance threshold into a one-frame event.
  // New hands need a short warmup so entering the frame cannot masquerade as intent.
  // The cooldown bounds event frequency, so one physical pinch cannot become many clicks.
  const pinchClick =
    pinchStarted &&
    currentTimeMs - lastPinchClickTime >= Math.max(0, pinchCooldownMs);

  state.observedFrameCountByHand[handId] = observedFrameCount;
  state.previousPinchStateByHand[handId] = isPinching;
  if (pinchClick) {
    state.lastPinchClickTimeByHand[handId] = currentTimeMs;
  }

  const palmY = keypoints3D?.[9]?.y ?? null;
  const previousPalmY = state.previousPalmYByHand[handId] ?? null;
  const palmDeltaY =
    palmY !== null && palmY !== undefined && previousPalmY !== null
      ? palmY - previousPalmY
      : null;
  const formattedPalmDeltaY = roundValue(palmDeltaY, precision) ?? null;

  state.previousPalmYByHand[handId] = palmY ?? null;

  return {
    pinch: {
      active: isPinching,
      started: pinchStarted,
      released: pinchReleased,
      click: pinchClick,
      distance: roundValue(pinchDistance, precision) ?? null,
    },
    scroll: {
      active:
        formattedPalmDeltaY !== null && Math.abs(formattedPalmDeltaY) > 0,
      y: roundValue(palmY, precision) ?? null,
      deltaY: formattedPalmDeltaY,
    },
  };
}

export function pruneGestureDetectorState(
  state: GestureDetectorState,
  activeHandIds: Set<string>,
): void {
  Object.keys(state.previousPalmYByHand).forEach((handId) => {
    if (activeHandIds.has(handId)) return;

    delete state.observedFrameCountByHand[handId];
    delete state.previousPalmYByHand[handId];
    delete state.previousPinchStateByHand[handId];
    delete state.lastPinchClickTimeByHand[handId];
  });
}
