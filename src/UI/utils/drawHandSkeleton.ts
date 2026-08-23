import type { TrackedHand, TrackedHandKeypoint } from "../../Core";

const SKELETON_RENDER_CONFIG = {
  thumb: { path: [0, 1, 2, 3, 4], color: "red" },
  indexFinger: { path: [0, 5, 6, 7, 8], color: "blue" },
  middleFinger: { path: [0, 9, 10, 11, 12], color: "yellow" },
  ringFinger: { path: [0, 13, 14, 15, 16], color: "green" },
  pinky: { path: [0, 17, 18, 19, 20], color: "pink" },
};

/** Draw the tracker output on the transparent camera overlay. */
export function renderHandSkeleton(
  canvas: HTMLCanvasElement | null,
  hands: TrackedHand[],
  normalize: boolean,
): void {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);

  hands.forEach((hand) => {
    Object.values(SKELETON_RENDER_CONFIG).forEach(({ path, color }) => {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 4;

      for (let index = 0; index < path.length - 1; index += 1) {
        const firstPoint = hand.keypoints[path[index]];
        const secondPoint = hand.keypoints[path[index + 1]];
        if (!firstPoint || !secondPoint || firstPoint.x === null || firstPoint.y === null || secondPoint.x === null || secondPoint.y === null) continue;

        context.moveTo(normalize ? firstPoint.x * width : firstPoint.x, normalize ? firstPoint.y * height : firstPoint.y);
        context.lineTo(normalize ? secondPoint.x * width : secondPoint.x, normalize ? secondPoint.y * height : secondPoint.y);
      }
      context.stroke();
    });

    hand.keypoints.forEach((keypoint: TrackedHandKeypoint) => {
      if (keypoint.x === null || keypoint.y === null) return;
      context.beginPath();
      context.arc(normalize ? keypoint.x * width : keypoint.x, normalize ? keypoint.y * height : keypoint.y, 5, 0, 2 * Math.PI);
      context.fillStyle = "white";
      context.fill();
      context.strokeStyle = "black";
      context.lineWidth = 1.5;
      context.stroke();
    });
  });
}
