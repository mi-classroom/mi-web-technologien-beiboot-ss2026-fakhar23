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
  y: number | null;
  deltaY: number | null;
}

export interface TrackedHandGestures {
  pinch: TrackedPinchGesture;
  scroll: TrackedScrollGesture;
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
}
