# ADR 0001: Gesture Library Manager

## Status

Accepted

## Decision

Use `GestureLibrary` as a manager for registered gesture recognizers.

Each recognizer provides:

- `name`
- `createInitialState()`
- `recognize(context, state)`

Built-in gesture logic lives in separate files under `src/Core/gestures/`.

## Reason

The prototype had too much gesture logic in one detector function. A manager
plus recognizers makes the core easier to extend and closer to libraries such
as Fingerpose, ZingTouch, and Hammer.js.

## Consequences

- New per-hand gestures can be registered without changing existing ones.
- Recognizer state is isolated per hand and per gesture.
- Zoom stays separate as a multi-hand controller because it compares two hands.
- The tracker still needs a small cast because custom recognizers can return
  dynamic result objects.
