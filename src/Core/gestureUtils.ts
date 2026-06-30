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
): boolean {
  const palmCenter = keypoints3D?.[9];
  const tipDistance = getDistance3D(palmCenter, keypoints3D?.[tipIndex]);
  const pipDistance = getDistance3D(palmCenter, keypoints3D?.[pipIndex]);

  if (tipDistance === null || pipDistance === null) {
    return false;
  }

  return tipDistance > pipDistance * 1.15;
}

export function isOpenPalm(
  keypoints3D: HandKeypoint3D[] | undefined,
): boolean {
  const extendedFingerCount = [
    isFingerExtendedFromPalm(keypoints3D, 8, 6),
    isFingerExtendedFromPalm(keypoints3D, 12, 10),
    isFingerExtendedFromPalm(keypoints3D, 16, 14),
    isFingerExtendedFromPalm(keypoints3D, 20, 18),
  ].filter(Boolean).length;

  return extendedFingerCount >= 3;
}

export interface ScreenFacingOpenPalmAnalysis {
  active: boolean;
  fingersExtended: boolean;
  screenFacing: boolean;
  fingersSeparated: boolean;
  thumbSpread: boolean;
}

export function analyzeScreenFacingOpenPalm(
  keypoints: HandKeypoint2D[] | undefined,
  keypoints3D: HandKeypoint3D[] | undefined,
): ScreenFacingOpenPalmAnalysis {
  const rejectedAnalysis: ScreenFacingOpenPalmAnalysis = {
    active: false,
    fingersExtended: false,
    screenFacing: false,
    fingersSeparated: false,
    thumbSpread: false,
  };
  const fingersExtended = isOpenPalm(keypoints3D);

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
  const screenFacing = palmHeight > 0 && knuckleWidth / palmHeight >= 0.8;

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
    separatedFingerGaps >= 2 && tipSpread >= palmHeight * 0.9;
  const thumbIsSpread = thumbSpread >= palmHeight * 0.35;

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
