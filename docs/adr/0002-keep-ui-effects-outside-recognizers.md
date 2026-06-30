# ADR 0002: Keep UI Effects Outside Recognizers

## Status

Accepted

## Decision

Recognizers return plain gesture result objects only. They do not call React,
toast APIs, browser history, scrolling APIs, or DOM methods.

The demo UI maps results to effects:

- `pinch.click` increments the preview click counter.
- `scroll.toTop` / `scroll.down` scroll the preview panel.
- `navigation.back` / `navigation.forward` change preview pages.
- `zoom.scale` changes preview font size.

## Reason

The core should be reusable outside this React demo. Keeping effects in
`src/UI/` makes `src/Core/` a portable gesture library.

## Consequences

- Gesture logic can be tested as data.
- Another app can reuse the core and choose different UI behavior.
- The demo must explicitly map gesture results to visual effects.
