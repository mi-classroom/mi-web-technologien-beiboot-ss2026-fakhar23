# ADR 0001: Use a Gesture Library Manager

## Status

Accepted

## Context

The first version of the project detected every gesture inside one large function. That was fine for a prototype, but it made the code difficult to read and risky to change: adding one gesture could accidentally affect another. It also meant that the gesture code was tightly tied to this particular demo.

The assignment requires a reusable and extensible library. A developer using the library should be able to add a gesture without editing the recognizers that already exist.

## Decision

We use `GestureLibrary` as a manager for independently registered gesture recognizers. A recognizer has three responsibilities:

- Provide a unique `name`.
- Create its own initial state with `createInitialState()`.
- Inspect one hand through `recognize(context, state)` and return a result.

The manager stores state separately for every hand and every registered gesture, then runs all recognizers once for each tracking frame. Built-in per-hand recognizers live in `src/Core/gestures/`, while shared landmark maths is kept in internal helper files.

## Why this approach

This follows a familiar pattern from established gesture libraries: a manager owns a set of recognizers, while each recognizer owns the rules for one gesture. It creates a small public extension point without exposing the details of MediaPipe landmarks, thresholds, cooldowns, or frame history.

For example, a new one-hand gesture can be added by creating a recognizer and calling `gestureLibrary.registerGesture(newGesture)`. Existing recognizers do not need to be changed.

## Consequences

- Gesture code is easier to find, test, and change in isolation.
- New per-hand gestures can be registered without modifying existing ones.
- State such as a pinch cooldown or a one-second hold is isolated per hand, which avoids one person's hand affecting another hand.
- Applications receive named result objects and do not need to know how the recognizer calculated them.
- Two-hand zoom remains a small separate controller because it needs to compare both hands in the same frame; forcing it into a one-hand recognizer would make the interface less clear.
- The tracker performs a narrow type conversion when it combines built-in and custom recognizer results. This is the trade-off for allowing custom gesture result shapes.
