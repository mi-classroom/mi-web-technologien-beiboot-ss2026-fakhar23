import type { HandKeypoint2D, HandKeypoint3D } from "./types";
import { getDistance3D } from "./mathUtils";

function hasPoint2D(
  point: HandKeypoint2D | undefined,
): point is HandKeypoint2D & { x: number; y: number } {
  return (
    point?.x !== null &&
    point?.x !== undefined &&
    point?.y !== null &&
    point?.y !== undefined &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

export function isFingerExtendedFromPalm(
  keypoints3D: HandKeypoint3D[] | undefined,
  tipIndex: number,
  pipIndex: number,
  minimumExtensionRatio = 1.15,
): boolean {
  const palmCenter = keypoints3D?.[9];
  const tipDistance = getDistance3D(palmCenter, keypoints3D?.[tipIndex]);
  const pipDistance = getDistance3D(palmCenter, keypoints3D?.[pipIndex]);

  if (tipDistance === null || pipDistance === null) {
    return false;
  }

  return tipDistance > pipDistance * minimumExtensionRatio;
}

function isFingerStraightAndOrdered(
  keypoints: HandKeypoint2D[] | undefined,
  [baseIndex, firstJointIndex, secondJointIndex, tipIndex]: [
    number,
    number,
    number,
    number,
  ],
  minimumAlignment: number,
): boolean {
  const base = keypoints?.[baseIndex];
  const firstJoint = keypoints?.[firstJointIndex];
  const secondJoint = keypoints?.[secondJointIndex];
  const tip = keypoints?.[tipIndex];

  if (
    !hasPoint2D(base) ||
    !hasPoint2D(firstJoint) ||
    !hasPoint2D(secondJoint) ||
    !hasPoint2D(tip)
  ) {
    return false;
  }

  const segments = [
    { x: firstJoint.x - base.x, y: firstJoint.y - base.y },
    { x: secondJoint.x - firstJoint.x, y: secondJoint.y - firstJoint.y },
    { x: tip.x - secondJoint.x, y: tip.y - secondJoint.y },
  ];
  const segmentLengths = segments.map((segment) => Math.hypot(segment.x, segment.y));
  if (segmentLengths.some((length) => length === 0)) return false;

  const alignment = (first: number, second: number) =>
    (segments[first].x * segments[second].x +
      segments[first].y * segments[second].y) /
    (segmentLengths[first] * segmentLengths[second]);
  const distanceFromBase = (point: { x: number; y: number }) =>
    Math.hypot(point.x - base.x, point.y - base.y);

  // Every joint must move outward from the base and the three finger segments
  // must point in roughly the same direction. The thumb gets a lower
  // alignment threshold because a natural open thumb is angled.
  return (
    distanceFromBase(firstJoint) < distanceFromBase(secondJoint) &&
    distanceFromBase(secondJoint) < distanceFromBase(tip) &&
    alignment(0, 1) >= minimumAlignment &&
    alignment(1, 2) >= minimumAlignment
  );
}

export interface ScreenFacingOpenPalmAnalysis {
  active: boolean;
  fingersExtended: boolean;
  screenFacing: boolean;
  fingersSeparated: boolean;
  thumbSpread: boolean;
}

export type OpenPalmRequirements = {
  fingerExtensionRatio?: number;
  longFingerAlignment?: number;
  thumbAlignment?: number;
  screenFacingRatio?: number;
  minimumSeparatedFingerGaps?: number;
  minimumTipSpread?: number;
  minimumThumbSpread?: number;
};

const DEFAULT_OPEN_PALM_REQUIREMENTS = {
  fingerExtensionRatio: 1.1,
  longFingerAlignment: 0.45,
  thumbAlignment: 0.05,
  screenFacingRatio: 0.72,
  minimumSeparatedFingerGaps: 2,
  minimumTipSpread: 0.8,
  minimumThumbSpread: 0.3,
};

export function analyzeScreenFacingOpenPalm(
  keypoints: HandKeypoint2D[] | undefined,
  keypoints3D: HandKeypoint3D[] | undefined,
  overrides: OpenPalmRequirements = {},
): ScreenFacingOpenPalmAnalysis {
  const requirements = { ...DEFAULT_OPEN_PALM_REQUIREMENTS, ...overrides };
  const rejectedAnalysis: ScreenFacingOpenPalmAnalysis = {
    active: false,
    fingersExtended: false,
    screenFacing: false,
    fingersSeparated: false,
    thumbSpread: false,
  };
  const longFingers = [
    { joints: [5, 6, 7, 8] as [number, number, number, number], tip: 8, pip: 6 },
    { joints: [9, 10, 11, 12] as [number, number, number, number], tip: 12, pip: 10 },
    { joints: [13, 14, 15, 16] as [number, number, number, number], tip: 16, pip: 14 },
    { joints: [17, 18, 19, 20] as [number, number, number, number], tip: 20, pip: 18 },
  ];
  const fingersExtended =
    longFingers.every(({ joints, tip, pip }) =>
      isFingerExtendedFromPalm(
        keypoints3D,
        tip,
        pip,
        requirements.fingerExtensionRatio,
      ) &&
      isFingerStraightAndOrdered(
        keypoints,
        joints,
        requirements.longFingerAlignment,
      ),
    ) &&
    isFingerStraightAndOrdered(
      keypoints,
      [1, 2, 3, 4],
      requirements.thumbAlignment,
    );

  if (!fingersExtended) {
    return rejectedAnalysis;
  }

  const wrist = keypoints?.[0];
  const indexMcp = keypoints?.[5];
  const middleMcp = keypoints?.[9];
  const ringMcp = keypoints?.[13];
  const pinkyMcp = keypoints?.[17];
  const thumbTip = keypoints?.[4];
  const fingerTips = [
    keypoints?.[8],
    keypoints?.[12],
    keypoints?.[16],
    keypoints?.[20],
  ];

  if (
    !hasPoint2D(wrist) ||
    !hasPoint2D(indexMcp) ||
    !hasPoint2D(middleMcp) ||
    !hasPoint2D(ringMcp) ||
    !hasPoint2D(pinkyMcp) ||
    !hasPoint2D(thumbTip) ||
    fingerTips.some((tip) => !hasPoint2D(tip))
  ) {
    return {
      ...rejectedAnalysis,
      fingersExtended,
    };
  }

  const palmHeight = Math.abs(middleMcp.y - wrist.y);
  const knuckleWidth = Math.abs(pinkyMcp.x - indexMcp.x);
  const screenFacing =
    palmHeight > 0 &&
    knuckleWidth / palmHeight >= requirements.screenFacingRatio;

  const sortedTips = [...fingerTips].sort((a, b) => a!.x! - b!.x!);
  const tipGaps = sortedTips
    .slice(1)
    .map((tip, index) => Math.abs(tip!.x! - sortedTips[index]!.x!));
  const separatedFingerGaps = tipGaps.filter(
    (gap) => gap >= palmHeight * 0.22,
  ).length;
  const tipSpread = Math.abs(sortedTips[3]!.x! - sortedTips[0]!.x!);
  const thumbSpread = Math.min(
    Math.abs(thumbTip.x - indexMcp.x),
    Math.abs(thumbTip.x - pinkyMcp.x),
  );
  const fingersSeparated =
    separatedFingerGaps >= requirements.minimumSeparatedFingerGaps &&
    tipSpread >= palmHeight * requirements.minimumTipSpread;
  const thumbIsSpread =
    thumbSpread >= palmHeight * requirements.minimumThumbSpread;

  return {
    active: fingersExtended && screenFacing && fingersSeparated && thumbIsSpread,
    fingersExtended,
    screenFacing,
    fingersSeparated,
    thumbSpread: thumbIsSpread,
  };
}

export function isScreenFacingOpenPalm(
  keypoints: HandKeypoint2D[] | undefined,
  keypoints3D: HandKeypoint3D[] | undefined,
): boolean {
  return analyzeScreenFacingOpenPalm(keypoints, keypoints3D).active;
}

export function getNormalizedPalmY(
  keypoints: HandKeypoint2D[] | undefined,
  videoHeight: number,
): number | null {
  const palmY = keypoints?.[9]?.y;

  if (
    palmY === null ||
    palmY === undefined ||
    !Number.isFinite(palmY) ||
    videoHeight <= 0
  ) {
    return null;
  }

  return palmY / videoHeight;
}

export function getNormalizedPalmX(
  keypoints: HandKeypoint2D[] | undefined,
  videoWidth: number,
): number | null {
  const palmX = keypoints?.[9]?.x;

  if (
    palmX === null ||
    palmX === undefined ||
    !Number.isFinite(palmX) ||
    videoWidth <= 0
  ) {
    return null;
  }

  return palmX / videoWidth;
}

export function getPinkyExtensionX(
  keypoints: HandKeypoint2D[] | undefined,
  videoWidth: number,
): number | null {
  const palmCenter = keypoints?.[9];
  const pinkyTip = keypoints?.[20];

  if (
    palmCenter?.x === null ||
    palmCenter?.x === undefined ||
    pinkyTip?.x === null ||
    pinkyTip?.x === undefined ||
    !Number.isFinite(palmCenter.x) ||
    !Number.isFinite(pinkyTip.x) ||
    videoWidth <= 0
  ) {
    return null;
  }

  return (pinkyTip.x - palmCenter.x) / videoWidth;
}
