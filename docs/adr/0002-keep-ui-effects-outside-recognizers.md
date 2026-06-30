# ADR 0002: Keep UI Effects Outside Gesture Recognizers

## Status

Accepted

## Context

The demo reacts to gestures with browser actions and visual feedback, for
example scrolling the page or showing a toast. If recognizers performed those
effects directly, the gesture code would only be useful for this specific React
application.

The issue asks for a library that can be used by others without reading or
rewriting the demo application.

## Decision

Gesture recognizers return plain result objects only. They do not call React,
toast APIs, browser history, or DOM methods.

The demo application maps gesture results to UI behavior:

- `pinch.click` becomes a virtual click toast.
- `scroll.toTop` and `scroll.down` scroll the page and show a toast.
- `navigation.back` and `navigation.forward` show a toast only.

## Consequences

Positive:

- The library can be reused in another UI, test, or application.
- Gesture tests can assert returned data without needing a browser UI.
- Application behavior can change without changing recognition logic.

Negative:

- The UI has to map gesture results to effects explicitly.
- A new app must decide what each recognized gesture should do.
