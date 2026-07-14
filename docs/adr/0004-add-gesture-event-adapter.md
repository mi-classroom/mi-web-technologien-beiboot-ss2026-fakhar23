# ADR 0004: Add Gesture Event Adapter

## Status

Accepted

## Problem

The preview app used the public tracker API, but still had to inspect nested
gesture state such as `hands[].gestures.navigation.forward`. That worked, but
it was too low-level for an application that only wants virtual actions.

## Decision

Add `getGestureEvents(hands)` to the public Core API.

It converts tracked hand state into app-friendly events:

- `click`
- `scrollUp`
- `scrollDown`
- `navigateBack`
- `navigateForward`
- `zoomReady`
- `zoomExit`
- `zoomIn`
- `zoomOut`

## Alternatives Rejected

- Keep parsing `hands[].gestures` in every app: too repetitive and easy to get
  wrong.
- Put callbacks inside recognizers: rejected because recognizers should remain
  UI-free and reusable.

## Consequences

- The demo app can use a simpler public API.
- Raw gesture state is still available for debugging.
- The adapter is optional, so advanced apps can still read the full result.
