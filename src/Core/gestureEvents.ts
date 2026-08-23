import type { TrackedHand } from "./types";

export type GestureEventKind =
  | "click"
  | "scrollReady"
  | "scrollExit"
  | "palmMove"
  | "scrollUp"
  | "scrollDown"
  | "navigateBack"
  | "navigateForward"
  | "zoomReady"
  | "zoomExit"
  | "zoomIn"
  | "zoomOut";

export interface GestureEvent {
  kind: GestureEventKind;
  hand?: string;
  detail: string;
  scrollSpeedPx?: number;
  zoomScale?: number;
  movementX?: number | null;
  movementY?: number | null;
}

export function getGestureEvents(hands: TrackedHand[]): GestureEvent[] {
  const events: GestureEvent[] = [];
  const navigationConfirmed = hands.some(
    (hand) => hand.gestures.navigation.back || hand.gestures.navigation.forward,
  );
  const zoomActiveOrExited = hands.some(
    (hand) => hand.gestures.zoom.mode !== "idle" || hand.gestures.zoom.exited,
  );
  const scrollActive = hands.some((hand) => hand.gestures.scroll.mode !== "idle");

  hands.forEach((hand) => {
    if (
      hand.gestures.pinch.click &&
      !navigationConfirmed &&
      !zoomActiveOrExited &&
      !hand.gestures.scroll.exited
    ) {
      events.push({
        kind: "click",
        hand: hand.hand,
        detail: "Pinch gesture emitted a virtual click.",
      });
    }

    if (hand.gestures.zoom.entered) {
      events.push({
        kind: "zoomReady",
        hand: hand.hand,
        detail: "Both palms held for one second. Pinch to exit.",
        zoomScale: hand.gestures.zoom.scale,
      });
    }

    if (hand.gestures.zoom.exited) {
      events.push({
        kind: "zoomExit",
        hand: hand.hand,
        detail: "Pinch returned control to normal gesture mode. Zoom level is kept.",
        zoomScale: hand.gestures.zoom.scale,
      });
    }

    if (hand.gestures.zoom.zoomIn) {
      events.push({
        kind: "zoomIn",
        hand: hand.hand,
        detail: "Hands moved apart.",
        zoomScale: hand.gestures.zoom.scale,
      });
    }

    if (hand.gestures.zoom.zoomOut) {
      events.push({
        kind: "zoomOut",
        hand: hand.hand,
        detail: "Hands moved together.",
        zoomScale: hand.gestures.zoom.scale,
      });
    }

    if (hand.gestures.scroll.exited) {
      events.push({
        kind: "scrollExit",
        hand: hand.hand,
        detail: "Pinch returned control to normal gesture mode.",
      });
    }

    if (hand.gestures.scroll.entered) {
      events.push({
        kind: "scrollReady",
        hand: hand.hand,
        detail: "Open palm held for one second. Pinch to exit, or move hand out of frame.",
      });
    }

    if (hand.gestures.scroll.ready) {
      events.push({
        kind: "palmMove",
        hand: hand.hand,
        detail: "Open palm moved relative to the scroll-mode anchor.",
        movementX: hand.gestures.scroll.movementX,
        movementY: hand.gestures.scroll.movementY,
      });
    }

    if (hand.gestures.scroll.toTop) {
      events.push({
        kind: "scrollUp",
        hand: hand.hand,
        detail: "Palm above anchor. Infinite scroll up started.",
        scrollSpeedPx: hand.gestures.scroll.scrollSpeedPx,
      });
    }

    if (hand.gestures.scroll.down) {
      events.push({
        kind: "scrollDown",
        hand: hand.hand,
        detail: "Palm below anchor. Infinite scroll down started.",
        scrollSpeedPx: hand.gestures.scroll.scrollSpeedPx,
      });
    }

    if (!scrollActive && !zoomActiveOrExited && hand.gestures.navigation.back) {
      events.push({
        kind: "navigateBack",
        hand: hand.hand,
        detail: "Little finger held pointing left.",
      });
    }

    if (!scrollActive && !zoomActiveOrExited && hand.gestures.navigation.forward) {
      events.push({
        kind: "navigateForward",
        hand: hand.hand,
        detail: "Little finger held pointing right.",
      });
    }
  });

  return events;
}
