# Gesture Library API

This project separates the reusable gesture logic from the React demo UI. The
UI only receives gesture results and decides what to do with them, such as
showing a toast or scrolling the page.

## Design influences

- Fingerpose separates landmark detection from gesture classification. A user
  supplies hand landmarks and registered gesture descriptions, then receives
  scored gesture results.
- ZingTouch exposes configurable gestures that can be bound to application
  behavior.
- Hammer.js uses a manager/recognizer model: recognizers are added to a manager,
  the manager evaluates input, and users listen for high-level events.

Our library uses the same broad idea in a smaller form:

- `GestureLibrary` is the manager.
- `GestureRecognizer` is the extension point.
- `createDefaultGestureLibrary()` registers the built-in recognizers.
- `createHandTracker()` is the camera/model adapter used by the demo.

## File structure

The public API is exported from `src/Core/index.ts`. The demo should import
from `../Core`, not from internal gesture files.

```txt
src/Core/
  index.ts                 public API barrel
  tracker.ts               TensorFlow/camera adapter
  gestureLibrary.ts        manager and recognizer contract
  gestureDetector.ts       default library factory
  gestureUtils.ts          shared internal landmark helpers
  gestures/
    pinchGesture.ts
    palmScrollGesture.ts
    pinkyNavigationGesture.ts
    index.ts
```

Each built-in gesture lives in its own file. This keeps recognition logic,
state, thresholds, and helper functions local to the gesture that needs them.

## Public API

### `createDefaultGestureLibrary(options?)`

Creates a library instance with the built-in gestures:

- `pinch`
- `scroll`
- `navigation`

```ts
import { createDefaultGestureLibrary } from "../Core";

const gestureLibrary = createDefaultGestureLibrary({
  pinchCooldownMs: 350,
  scrollSpeedPx: 18,
  scrollDeadZone: 0.08,
});
```

Options:

- `pinchCooldownMs`: minimum time between virtual click events.
- `scrollSpeedPx`: pixels per detection frame while infinite scroll is active.
- `scrollDeadZone`: normalized distance above/below the scroll anchor where no
  scrolling happens.

### `new GestureLibrary()`

Creates an empty library. Use this when you want full control over registered
gestures.

```ts
import { GestureLibrary } from "../Core";

const gestureLibrary = new GestureLibrary();
```

### `registerGesture(recognizer)`

Adds a gesture recognizer. A recognizer owns its private per-hand state and
returns a high-level result object.

```ts
gestureLibrary.registerGesture({
  name: "exampleGesture",
  createInitialState: () => ({ wasActive: false }),
  recognize: (context, state) => {
    const active =
      context.hasStableHistory && (context.keypoints?.length ?? 0) > 0;

    state.wasActive = active;

    return {
      active,
    };
  },
});
```

The recognizer receives a `GestureRecognizerContext`:

```ts
type GestureRecognizerContext = {
  handId: string;
  keypoints: HandKeypoint2D[] | undefined;
  keypoints3D: HandKeypoint3D[] | undefined;
  videoWidth: number;
  videoHeight: number;
  currentTimeMs: number;
  precision: number | undefined;
  observedFrameCount: number;
  hasStableHistory: boolean;
};
```

The recognizer should return plain JSON-compatible data. The demo can then
display it in debug mode or map it to UI behavior.

### `evaluateHand(context)`

Runs every registered recognizer for one hand and returns results keyed by
gesture name.

```ts
const gestures = gestureLibrary.evaluateHand({
  handId: "Left-0",
  keypoints,
  keypoints3D,
  videoWidth: 640,
  videoHeight: 480,
  currentTimeMs: performance.now(),
  precision: 3,
});
```

Example result:

```json
{
  "pinch": {
    "active": false,
    "click": false,
    "distance": 0.084
  },
  "scroll": {
    "active": true,
    "direction": "down",
    "down": true
  },
  "navigation": {
    "active": false,
    "direction": null
  }
}
```

### `pruneInactiveHands(activeHandIds)`

Removes state for hands that disappeared from the camera frame.

```ts
gestureLibrary.pruneInactiveHands(new Set(["Left-0"]));
```

### `reset()`

Clears all per-hand recognizer state.

```ts
gestureLibrary.reset();
```

## Built-in gestures

### Pinch

Uses the 3D distance between thumb tip and index fingertip. It emits:

- `active`: pinch is currently held
- `started`: pinch became active this frame
- `released`: pinch ended this frame
- `click`: one-frame virtual click event
- `distance`: measured thumb-index distance

### Palm scroll

Uses a strict screen-facing open palm check plus normalized 2D palm-center Y
movement. The scroll gesture intentionally requires a clearer pose than the
generic open-palm helper: fingers must be extended, visibly separated on the
camera image, the thumb must be spread, and the palm silhouette must appear
wide enough to suggest the palm is facing the screen.

To avoid accidental scrolling, scroll has an explicit mode:

1. Hold an open palm in frame for about one second.
2. The result changes from `mode: "arming"` to `mode: "ready"`.
3. The palm position at that moment becomes the scroll anchor.
4. After ready mode starts, the strict palm check is no longer required; the
   palm center is tracked until pinch exits or the hand disappears.
5. Only in ready mode can vertical palm movement emit scroll events.
6. Moving above the anchor plus dead zone starts continuous upward scrolling.
7. Moving below the anchor plus dead zone starts continuous downward scrolling.
8. Moving back into the dead zone stops scrolling.
9. A pinch exits scroll mode and returns the application to normal gesture
   handling.

While scroll is arming or ready, navigation gestures are ignored by the default
library so little-finger movement cannot accidentally trigger navigation.

It emits:

- `toTop`: continuous upward scroll state outside the upper dead zone
- `down`: continuous downward scroll state outside the lower dead zone
- `mode`: `idle`, `arming`, or `ready`
- `entered`: one-frame event when scroll mode becomes ready
- `exited`: one-frame event when pinch exits scroll mode
- `holdProgressMs`: progress toward the one-second ready threshold
- `anchorY`: normalized palm position where scroll mode became ready
- `deadZone`: normalized no-scroll boundary around the anchor
- `scrollSpeedPx`: configured scroll speed for app/UI behavior
- `palmQuality`: diagnostic booleans for the strict palm gate
  (`fingersExtended`, `screenFacing`, `fingersSeparated`, `thumbSpread`)
- `movementY`: accumulated vertical movement from the current gesture anchor

### Pinky navigation

Uses horizontal X-axis extension of the little fingertip from the palm center.
It must be held for about one second to arm a direction. A pinch from another
hand confirms the armed direction and emits:

- `back`: one-frame virtual navigate-back event
- `forward`: one-frame virtual navigate-forward event
- `holdProgressMs`: hold progress toward the event
- `pinkyExtensionX`: normalized horizontal extension

## What stays internal

Library users do not need to know:

- which landmark indexes represent thumb/index/pinky
- how cooldown timers are stored
- how per-hand state is cleaned up
- how jitter warmup is handled

They only need to provide landmark input and read gesture results.

## Adding a new gesture

1. Create a gesture file in `src/Core/gestures/`.
2. Export a recognizer factory with `name`, `createInitialState`, and
   `recognize`.
3. Register it with `gestureLibrary.registerGesture()`.
4. Consume the returned result in the UI or another application.

Existing gestures do not need to be changed.

Example:

```ts
// src/Core/gestures/exampleGesture.ts
import type { GestureRecognizer } from "../gestureLibrary";

type ExampleGestureState = {
  wasActive: boolean;
};

type ExampleGestureResult = {
  active: boolean;
  triggered: boolean;
};

export function createExampleGesture(): GestureRecognizer<
  ExampleGestureResult,
  ExampleGestureState
> {
  return {
    name: "exampleGesture",
    createInitialState: () => ({
      wasActive: false,
    }),
    recognize: (context, state) => {
      const active =
        context.hasStableHistory && (context.keypoints?.length ?? 0) > 0;
      const triggered = active && !state.wasActive;

      state.wasActive = active;

      return {
        active,
        triggered,
      };
    },
  };
}
```

You can also combine built-in gestures with custom gestures and pass that
library into the tracker:

```ts
import {
  GestureLibrary,
  createPinchGesture,
  createPalmScrollGesture,
} from "../Core";

const customLibrary = new GestureLibrary()
  .registerGesture(createPinchGesture())
  .registerGesture(createPalmScrollGesture())
  .registerGesture(createExampleGesture());

tracker.start({
  videoElement,
  gestureLibrary: customLibrary,
  onData: (hands) => {
    console.log(hands);
  },
});
```
