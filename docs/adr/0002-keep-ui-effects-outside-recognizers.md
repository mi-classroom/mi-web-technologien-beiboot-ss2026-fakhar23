# ADR 0002: Keep UI Effects Outside Gesture Recognizers

## Status

Accepted

## Context

Recognizing a gesture and deciding what it should do are different jobs. A pinch can mean “select this model area” in Gesture Model Studio, but the same pinch could mean “take a photo” or “confirm a form” in another application.

If recognizers directly called React, a toast library, browser scrolling, or the DOM, the Core code could no longer be reused outside this UI. It would also be harder to test because a simple recognition test would need a browser.

## Decision

Recognizers return plain data only. They report facts such as `pinch.click`, `scroll.down`, `navigation.forward`, or `zoom.scale`; they never perform UI or browser actions themselves.

The React application in `src/UI/` reads those results, usually through `getGestureEvents()`, and decides on the visible effect. For example, the UI can update the selected model area, rotate or zoom the viewer, change the current model, or show feedback to the user.

## Why this approach

Keeping Core “headless” gives the library one clear responsibility: turn hand landmarks into reliable gesture state. The UI keeps its own responsibility: turn gesture state into an experience for this particular application.

This separation also makes the same gesture result usable in different ways. One app can show a toast for a navigation gesture, while another can genuinely navigate to another page.

## Consequences

- The gesture library can be reused in React, another framework, or a non-visual application.
- Recognizers can be tested with landmark data and expected result objects, without rendering a component or mocking browser APIs.
- UI behavior remains explicit in the application, which makes it easier to understand what a gesture will do.
- The UI must contain a small mapping layer from gesture events to application actions. This is intentional: it is where product-specific decisions belong.
