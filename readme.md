# Sprint 4: Gesture Library

# Sprint 4: Library Application Test

## Goal

Issue #4 asks us to use the gesture library as if it were an external
dependency. The app should communicate with the library only through the public
API and should reveal what is missing or awkward in that API.

## Demo Application

Topic: **Accessible UI controls for a static page**

The existing preview mode is now used as the standalone demo application. It
imports from the public API only:

```ts
import { createHandTracker, getGestureEvents, type TrackedHand } from "../Core";
```

It does not import from internal files such as `src/Core/gestures/`,
`gestureUtils`, or `gestureLibrary`.

## How To Start

```bash
pnpm install
pnpm run dev
```

Open the app in the browser and use **Preview mode**. Debug mode can still be
enabled to inspect raw tracking data.

## Gesture Controls In The Demo

| User action   | Gesture                                                       | App behavior                                     |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Click         | Pinch thumb and index finger                                  | Increments the click counter                     |
| Scroll        | Hold one open palm for one second, then move palm up/down     | Infinite scroll in the preview page              |
| Exit scroll   | Pinch while in scroll mode                                    | Leaves scroll mode                               |
| Next page     | Point pinky right for one second, then pinch with other hand  | Moves to the next letter page                    |
| Previous page | Point pinky left for one second, then pinch with other hand   | Moves to the previous letter page                |
| Zoom text     | Hold two hands for one second, then move hands apart/together | Resizes the preview text                         |
| Exit zoom     | Short deliberate pinch while in zoom mode                     | Leaves zoom mode but keeps the current text size |

The pages are labeled `A` through `Z`. Navigation wraps from `Z` back to `A`
and from `A` back to `Z`.

## API Problem Found

The first version of the app used the public tracker result, but the app code
still had to inspect nested low-level state:

```ts
hands[].gestures.navigation.forward
hands[].gestures.scroll.down
hands[].gestures.zoom.zoomIn
```

This was technically public, but not ergonomic. A normal app wants virtual
events such as `navigateForward`, `scrollDown`, or `click`, not detailed
recognizer state.

## API Fix

Added a public helper:

```ts
getGestureEvents(hands);
```

This converts tracked hand data into simple event objects:

- `click`
- `scrollUp`
- `scrollDown`
- `navigateBack`
- `navigateForward`
- `zoomReady`
- `zoomExit`
- `zoomIn`
- `zoomOut`

The preview app now uses this helper for its main virtual actions.

Decision record: [`ADR 0004`](./adr/0004-add-gesture-event-adapter.md)

## Other Improvements Made While Testing The App

- Improved the interactive preview into a clearer static-page demo.
- Added A-Z page navigation with wraparound.
- Added light background colors for each page letter.
- Added sticky mode instructions inside the preview page:
  - scroll mode explains palm up/down and pinch-to-exit
  - zoom mode explains hand distance and pinch-to-exit
  - pinky navigation explains pinch-to-confirm
- Fixed zoom scale persistence:
  - exiting zoom no longer resets preview zoom to `1.00`
  - re-entering zoom starts from the current preview zoom level
  - hands leaving and re-entering during zoom no longer reset zoom
- Fixed the zoom number mismatch between the camera overlay and preview toolbar.

## Acceptance Criteria Check

| Criterion                                 | Status                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| Demo app is functional                    | Done: preview mode controls a static page with gestures |
| Uses only public library API              | Done: app imports from `../Core`                        |
| At least one API problem found and fixed  | Done: added `getGestureEvents(hands)`                   |
| API change explained in a Decision Record | Done: ADR 0004                                          |
| Application can be started locally        | Done: `pnpm run dev`                                    |
| Application is checked into repository    | Done when committed                                     |

## Effort

Timebox / effort: **8-10 hours**.
