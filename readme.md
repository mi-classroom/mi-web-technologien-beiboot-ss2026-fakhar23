# Sprint 3: Gesture Library

## Goal

Issue #3 asks to turn the prototype gestures from Issue #2 into a structured
gesture library that is reusable, extensible, documented, and separated from
the React demo application.

The implementation now keeps reusable gesture logic in `src/Core/` and demo UI
behavior in `src/UI/`.

## Implemented Gestures

| Gesture          | Action                       | Core file                                     | Notes                                                                                                   |
| ---------------- | ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Pinch            | Virtual click / confirmation | `src/Core/gestures/pinchGesture.ts`           | Uses 3D thumb-index distance and a short hold gate to avoid noisy clicks.                               |
| Palm scroll      | Continuous scroll up/down    | `src/Core/gestures/palmScrollGesture.ts`      | Requires a clear screen-facing open palm, then tracks movement from an anchor with a dead zone.         |
| Pinky navigation | Navigate back/forward        | `src/Core/gestures/pinkyNavigationGesture.ts` | Requires a mostly horizontal pinky hold for one second, then confirmation by pinch from the other hand. |
| Two-hand zoom    | Zoom in/out                  | `src/Core/gestures/zoomGesture.ts`            | Uses two palm centers, a one-second ready timer, anchor distance, and a dead zone.                      |

## Implemented Virtual Actions

The demo exposes seven concrete virtual actions. Some actions share the same
mode gesture, for example scroll up/down both happen inside scroll mode.

| Virtual action   | How to perform it                                                                                                                     | What happens in preview mode                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Click            | Pinch thumb and index finger together briefly.                                                                                        | The click counter increases and a virtual click toast appears.               |
| Scroll up        | Hold one clear open palm toward the camera for about one second to enter scroll mode. Then move the palm above the anchor position.   | The preview document scrolls upward continuously.                            |
| Scroll down      | Hold one clear open palm toward the camera for about one second to enter scroll mode. Then move the palm below the anchor position.   | The preview document scrolls downward continuously.                          |
| Navigate back    | Point the little finger mostly horizontally to the left and hold it for about one second. Then pinch with the other hand to confirm.  | The preview changes to the previous page.                                    |
| Navigate forward | Point the little finger mostly horizontally to the right and hold it for about one second. Then pinch with the other hand to confirm. | The preview changes to the next page.                                        |
| Zoom in          | Hold two visible hands in frame for about one second to enter zoom mode. Then move the hands farther apart.                           | The preview text becomes larger and the zoom number increases above `1.00`.  |
| Zoom out         | Hold two visible hands in frame for about one second to enter zoom mode. Then move the hands closer together.                         | The preview text becomes smaller and the zoom number decreases below `1.00`. |

Mode exits:

- Scroll mode exits with a pinch.
- Zoom mode exits with a short deliberate pinch hold and resets the preview zoom
  value to `1.00`.
- Pinky navigation does not execute until the other hand confirms with a pinch.

## Library Structure

```txt
src/Core/
  index.ts                 public API barrel
  tracker.ts               TensorFlow/camera adapter and multi-hand coordination
  gestureLibrary.ts        manager, recognizer contract, per-hand state
  gestureDetector.ts       default library factory
  gestureUtils.ts          shared landmark helpers
  gestures/
    pinchGesture.ts
    palmScrollGesture.ts
    pinkyNavigationGesture.ts
    zoomGesture.ts
    index.ts

src/UI/
  App.tsx                  demo application and preview/debug UI
```

The reusable library code does not call React, `window.history`, toast APIs, or
DOM methods. It returns plain gesture result objects. The UI decides how those
results are shown or used.

## Public API

The public API is exported from `src/Core/index.ts`.

Main entry points:

- `createHandTracker()`: creates the TensorFlow camera tracker used by the demo.
- `createDefaultGestureLibrary(options?)`: creates a library with built-in
  per-hand recognizers.
- `new GestureLibrary()`: creates an empty gesture library.
- `registerGesture(recognizer)`: adds a custom gesture recognizer.
- `evaluateHand(context)`: evaluates all registered recognizers for one hand.
- `pruneInactiveHands(activeHandIds)`: removes state for hands that left frame.
- `reset()`: clears internal recognizer state.

More detail and examples are documented in
[`docs/gesture-library.md`](./docs/gesture-library.md).

## Extensibility

New per-hand gestures can be added without changing the existing recognizers:

1. Create a new file in `src/Core/gestures/`.
2. Export a recognizer with `name`, `createInitialState`, and `recognize`.
3. Register it using `gestureLibrary.registerGesture()`.
4. Consume the returned result object in the UI or another application.

Multi-hand gestures can use a small controller like `zoomGesture.ts` when they
need to compare multiple hands or coordinate modal state.

## Demo Behavior

The demo has two modes:

- Debug mode: shows live gesture JSON and controls.
- Preview mode: provides a scrollable preview document.

Virtual events are visible in the preview:

- Pinch increments the preview click counter.
- Palm scroll scrolls the preview window.
- Pinky navigation changes preview pages.
- Zoom changes the preview font size.

## Design Decisions

Decision records are stored in `docs/adr/`:

- [`ADR 0001`](./docs/adr/0001-gesture-library-manager.md): use a gesture library manager with registered recognizers.
- [`ADR 0002`](./docs/adr/0002-keep-ui-effects-outside-recognizers.md): keep UI effects outside recognizers.
- [`ADR 0003`](./docs/adr/0003-use-modal-priority-for-conflicting-gestures.md): use modal priority for conflicting gestures.

## Effort / Time

Timebox / effort: **16 hours**.
