import type { GestureLibrary } from "./gestureLibrary";

export type HandKeypoint2D = {
  name?: string;
  x: number | null | undefined;
  y: number | null | undefined;
};

export type HandKeypoint3D = {
  name?: string;
  x: number | null | undefined;
  y: number | null | undefined;
  z?: number | null | undefined;
};

export interface TrackedHandKeypoint {
  name?: string;
  x: number | null;
  y: number | null;
}

export interface TrackedHandKeypoint3D {
  name?: string;
  x: number | null | undefined;
  y: number | null | undefined;
  z: number | null | undefined;
}

export interface TrackedPinchGesture {
  active: boolean;
  started: boolean;
  released: boolean;
  click: boolean;
  distance: number | null;
}

export interface TrackedScrollGesture {
  active: boolean;
  mode: "idle" | "arming" | "ready";
  ready: boolean;
  entered: boolean;
  exited: boolean;
  holdProgressMs: number;
  direction: "up" | "down" | null;
  directionX: "left" | "right" | null;
  toTop: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  scrollSpeedPx: number;
  anchorX: number | null;
  anchorY: number | null;
  openPalm: boolean;
  palmQuality: {
    fingersExtended: boolean;
    screenFacing: boolean;
    fingersSeparated: boolean;
    thumbSpread: boolean;
  };
  x: number | null;
  y: number | null;
  deltaX: number | null;
  deltaY: number | null;
  movementX: number | null;
  movementY: number | null;
}

export interface TrackedNavigationGesture {
  active: boolean;
  direction: "back" | "forward" | null;
  back: boolean;
  forward: boolean;
  holdProgressMs: number;
  pinkyExtensionX: number | null;
}

export interface TrackedZoomGesture {
  active: boolean;
  mode: "idle" | "arming" | "ready";
  waitingForPalms: boolean;
  ready: boolean;
  entered: boolean;
  exited: boolean;
  holdProgressMs: number;
  palmCount: number;
  direction: "in" | "out" | null;
  zoomIn: boolean;
  zoomOut: boolean;
  scale: number;
  anchorDistance: number | null;
  deadZone: number;
  distance: number | null;
  movement: number | null;
}

export interface TrackedHandGestures {
  pinch: TrackedPinchGesture;
  scroll: TrackedScrollGesture;
  navigation: TrackedNavigationGesture;
  zoom: TrackedZoomGesture;
}

export interface TrackedHand {
  hand?: string;
  score: number | null;
  gestures: TrackedHandGestures;
  keypoints: TrackedHandKeypoint[];
  keypoints3D?: TrackedHandKeypoint3D[];
}

export interface TrackerConfig {
  videoElement: HTMLVideoElement;
  onData: (hands: TrackedHand[]) => void;
  flipHorizontal?: boolean;
  normalize?: boolean;
  precision?: number;
  pinchCooldownMs?: number;
  pinchDistanceThreshold?: number;
  pinchClickHoldMs?: number;
  scrollSpeedPx?: number;
  scrollReadyHoldMs?: number;
  navigationHoldMs?: number;
  zoomDeadZone?: number;
  zoomReadyHoldMs?: number;
  gestureLibrary?: GestureLibrary;
}
