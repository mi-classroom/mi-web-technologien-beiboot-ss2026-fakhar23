import type { HandKeypoint2D, HandKeypoint3D } from "./types";

export function getDistance3D(
  pointA: HandKeypoint3D | undefined,
  pointB: HandKeypoint3D | undefined,
): number | null {
  if (
    !pointA ||
    !pointB ||
    pointA.x === null ||
    pointA.x === undefined ||
    pointA.y === null ||
    pointA.y === undefined ||
    pointA.z === null ||
    pointA.z === undefined ||
    pointB.x === null ||
    pointB.x === undefined ||
    pointB.y === null ||
    pointB.y === undefined ||
    pointB.z === null ||
    pointB.z === undefined
  ) {
    return null;
  }

  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  const dz = pointA.z - pointB.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getDistance2D(
  pointA: HandKeypoint2D | undefined,
  pointB: HandKeypoint2D | undefined,
): number | null {
  if (
    !pointA ||
    !pointB ||
    pointA.x === null ||
    pointA.x === undefined ||
    pointA.y === null ||
    pointA.y === undefined ||
    pointB.x === null ||
    pointB.x === undefined ||
    pointB.y === null ||
    pointB.y === undefined
  ) {
    return null;
  }

  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function roundValue(
  value: number | null | undefined,
  precision: number | undefined,
): number | null | undefined {
  if (value === null || value === undefined || precision === undefined) {
    return value;
  }

  return Number(value.toFixed(precision));
}

export function formatCoordinate(
  value: number | null | undefined,
  maxPixelDimension: number,
  normalize: boolean,
  precision: number | undefined,
): number | null {
  if (value === null || value === undefined) return null;

  const processedValue = normalize ? value / maxPixelDimension : value;
  return roundValue(processedValue, precision) ?? null;
}
