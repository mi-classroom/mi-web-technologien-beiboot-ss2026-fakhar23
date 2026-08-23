# ADR 0004: Provide an App-Friendly Gesture Event Adapter

## Status

Accepted

## Context

The tracker exposes detailed hand data for debugging and advanced use. This is useful, but an application would otherwise have to repeatedly inspect nested properties such as `hands[].gestures.navigation.forward` or `hands[].gestures.scroll.down`.

That makes normal application code verbose and risks inconsistent handling of one-frame actions, gesture priority, and duplicate events.

## Decision

Expose `getGestureEvents(hands)` as part of the public Core API. It converts the detailed tracker output into a short list of app-level events, including:

- `click`
- `scrollReady`, `scrollExit`, `scrollUp`, and `scrollDown`
- `navigateBack` and `navigateForward`
- `zoomReady`, `zoomExit`, `zoomIn`, and `zoomOut`

Each event includes a readable detail message and, when useful, supporting values such as scroll speed or zoom scale. The original detailed hand state is still returned by the tracker and remains available for the debug UI.

## Why this approach

The adapter gives most consumers a simple interface: “what virtual actions happened in this frame?” Advanced consumers are not limited, because they can still inspect raw gesture state when they need anchors, distances, progress, or diagnostic values.

This keeps callbacks out of recognizers and avoids making every application write its own incomplete event-conversion code.

## Consequences

- UI code is shorter and expresses application behavior in terms of actions, rather than landmark-derived flags.
- Gesture logic stays free of React and browser side effects.
- Raw state remains available for telemetry, custom interfaces, and debugging.
- The adapter must be updated when a new public event type is introduced; this is a deliberate, visible API decision rather than hidden application logic.
