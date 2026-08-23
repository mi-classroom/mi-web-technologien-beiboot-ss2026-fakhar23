# ADR 0003: Use Gesture Priority for Conflicting Gestures

## Status

Accepted

## Context

Hand gestures can overlap. For example, two raised hands may look like zoom and open-palm scroll at the same time. A confirming pinch for pinky navigation could also accidentally start zoom. If every recognizer fired freely, one movement could trigger several actions.

## Decision

The tracker applies gesture-priority rules after recognizers have reported their state:

1. Zoom has highest priority while it is being armed or is ready. Scroll and pinky navigation are muted during that time.
2. Once pinky navigation has been held long enough and is waiting for the confirming pinch, it has priority over scroll and zoom arming.
3. Pinch remains available because it is used for normal selection, navigation confirmation, and leaving active modes.

The individual recognizers still only describe their own gesture. The tracker is the one place that resolves conflicts between them.

## Why this approach

The word *modal* describes how priority works here: zoom and scroll have an active mode, so they temporarily take control. The actual decision is about **gesture priority**, which is clearer in the title.

Keeping this logic in the tracker prevents recognizers from becoming coupled. A scroll recognizer does not need to know how zoom works.

## Consequences

- The application emits one clear virtual action at a time.
- Deliberate holds make accidental mode changes less likely.
- The tracker has a small amount of coordination logic, while recognizers remain independent.
- The UI needs to show when a gesture is arming or active.
