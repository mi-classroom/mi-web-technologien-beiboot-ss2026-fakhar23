# ADR 0001: Use a Gesture Library Manager with Registered Recognizers

## Status

Accepted

## Context

The first prototype placed pinch, scroll, and navigation logic in one detector
function. That worked for the demo, but it made the code harder to extend:
adding a new gesture meant editing the same central function and shared state
object.

Existing gesture libraries point toward a more systematic structure:

- Fingerpose separates hand landmark input from gesture descriptions and
  estimation.
- ZingTouch exposes gestures as configurable units that application code binds
  to behavior.
- Hammer.js uses a manager that owns recognizers and exposes methods such as
  add, remove, and event handling.

## Decision

Use a `GestureLibrary` class as the manager for registered recognizers.

Each recognizer implements:

- `name`
- `createInitialState()`
- `recognize(context, state)`

The tracker owns the camera and TensorFlow model loop. The gesture library owns
gesture recognition and per-hand recognizer state.

Built-in recognizers are stored as one file per gesture under
`src/Core/gestures/`:

- `pinchGesture.ts`
- `palmScrollGesture.ts`
- `pinkyNavigationGesture.ts`

The folder also exposes `gestures/index.ts` as an internal barrel. This keeps
each gesture's thresholds, private state shape, and recognition helpers scoped
to that gesture.

## Consequences

Positive:

- New gestures can be registered without changing existing recognizers.
- Gesture state is isolated per recognizer and per hand.
- The React demo consumes high-level gesture results instead of raw recognition
  internals.
- The API is easier to document and test.

Negative:

- There is a little more structure than the prototype needed.
- The built-in typed gesture result still needs a cast at the tracker boundary
  because dynamic registration can return arbitrary gesture names.
