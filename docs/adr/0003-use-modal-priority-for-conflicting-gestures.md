# ADR 0003: Modal Priority for Conflicting Gestures

## Status

Accepted

## Decision

Use simple priority rules in the tracker:

- Zoom is modal while `arming` or `ready`; scroll and navigation are muted.
- Armed pinky navigation has priority while waiting for the other-hand pinch;
  scroll and zoom arming are muted.
- Pinch remains available for click, confirmation, and mode exit.

## Reason

Some gestures overlap. For example, bringing in a second hand to confirm pinky
navigation can accidentally look like zoom or scroll. Priority rules prevent
multiple virtual events from firing for one physical movement.

## Consequences

- The demo emits one clearer virtual event at a time.
- Individual recognizers stay small.
- The tracker contains a little cross-hand coordination logic.
