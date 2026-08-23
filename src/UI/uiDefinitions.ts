
export type ModelRotation = { x: number; y: number };

export type ViewerHotspot = {
  id: string;
  label: string;
  target: string;
  color?: string;
};

export type ViewerObject = {
  name: string;
  kind: "cube" | "capsule" | "uploaded";
  accent: string;
  background: string;
  description: string;
  hotspots: ViewerHotspot[];
  url?: string;
};

export type VirtualEventKind =
  | "click"
  | "zoomReady"
  | "zoomExit"
  | "scrollReady"
  | "scrollExit"
  | "scrollTop"
  | "scrollDown"
  | "navigateBack"
  | "navigateForward";

export type VirtualEventConfig = {
  icon: string;
  label: string;
  color: string;
  background: string;
  className: string;
};

export type RecentVirtualEvent = VirtualEventConfig & {
  id: number;
  detail: string;
};

export const VIEWER_OBJECTS: ViewerObject[] = [
  {
    name: "Museum Cube",
    kind: "cube",
    accent: "#2563eb",
    background: "#eff8f4",
    description:
      "A simple artifact cube with highlighted inspection faces for testing rotation and selection.",
    hotspots: [
      { id: "face-1", label: "Face 1", target: "cube-front" },
      { id: "face-2", label: "Face 2", target: "cube-back" },
      { id: "face-3", label: "Face 3", target: "cube-right" },
      { id: "face-4", label: "Face 4", target: "cube-left" },
      { id: "top", label: "Top panel", target: "cube-top" },
      { id: "bottom", label: "Bottom panel", target: "cube-bottom" },
    ],
  },
  {
    name: "Orbital Capsule",
    kind: "capsule",
    accent: "#dc2626",
    background: "#f1faf6",
    description:
      "A rounded capsule model with rings and a central core for testing zoom and navigation.",
    hotspots: [
      {
        id: "core",
        label: "Core lens",
        target: "capsule-core",
        color: "#38bdf8",
      },
      {
        id: "ring-a",
        label: "Horizontal ring",
        target: "ring-a",
        color: "#f59e0b",
      },
      {
        id: "ring-b",
        label: "Vertical ring",
        target: "ring-b",
        color: "#22c55e",
      },
      {
        id: "stand",
        label: "Lower stand",
        target: "capsule-stand",
        color: "#a855f7",
      },
    ],
  },
];

export const VIEWER_CONTROL_GROUPS = [
  {
    icon: "🧭",
    title: "Rotate with Palm",
    text: "Hold one clear open palm for one second, then move your palm to orbit the model. Pinch to exit, or move your hand out of frame.",
    mouse: "Drag viewer",
    keyboard: "Arrow keys",
  },
  {
    icon: "🔎",
    title: "Zoom with Both Hands",
    text: "Hold two hands in frame for one second, then move them apart or together to scale the model.",
    mouse: "Mouse wheel",
    keyboard: "+ / -",
  },
  {
    icon: "✨",
    title: "Highlight Areas",
    text: "Pinch in normal mode to select the next highlighted hotspot on the current object.",
    mouse: "Click viewer",
    keyboard: "Enter / Space",
  },
  {
    icon: "🔁",
    title: "Change 3D Model",
    text: "Point pinky left or right for one second, then pinch with the other hand to switch objects.",
    keyboard: "A / D",
  },
];

export const VIRTUAL_EVENT_CONFIG: Record<
  VirtualEventKind,
  VirtualEventConfig
> = {
  click: {
    icon: "⌖",
    label: "Virtual Click",
    color: "#198754",
    background: "#e9f7ef",
    className: "click",
  },
  zoomReady: {
    icon: "⛶",
    label: "Zoom Ready",
    color: "#6610f2",
    background: "#f0e8ff",
    className: "zoom-ready",
  },
  zoomExit: {
    icon: "×",
    label: "Zoom Mode Off",
    color: "#6c757d",
    background: "#f1f3f5",
    className: "zoom-exit",
  },
  scrollReady: {
    icon: "✓",
    label: "Rotate Ready",
    color: "#20c997",
    background: "#e8fbf5",
    className: "scroll-ready",
  },
  scrollExit: {
    icon: "×",
    label: "Rotate Mode Off",
    color: "#6c757d",
    background: "#f1f3f5",
    className: "scroll-exit",
  },
  scrollTop: {
    icon: "↑",
    label: "Scroll Top",
    color: "#0d6efd",
    background: "#eaf2ff",
    className: "scroll-top",
  },
  scrollDown: {
    icon: "↓",
    label: "Scroll Down",
    color: "#0dcaf0",
    background: "#e7faff",
    className: "scroll-down",
  },
  navigateBack: {
    icon: "←",
    label: "Navigate Back",
    color: "#6f42c1",
    background: "#f1ecfb",
    className: "navigate-back",
  },
  navigateForward: {
    icon: "→",
    label: "Navigate Forward",
    color: "#fd7e14",
    background: "#fff1e5",
    className: "navigate-forward",
  },
};
