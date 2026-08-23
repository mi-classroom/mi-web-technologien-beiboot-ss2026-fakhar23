# Gesture Model Studio

Gesture Model Studio is a browser-based 3D model inspector controlled by a webcam gesture library. It combines hand tracking with familiar mouse and keyboard controls, so models remain usable when a camera is unavailable.

The project is the **Vision Application** path for Issue #5. It demonstrates the library through a polished 3D inspection experience rather than a raw gesture test surface.

This repository is project work for the **Web Technologies** module (SS 2026).

> **Live demo:** add the public deployment URL after deployment.
>
> **Video demo:** add the video URL after upload.

## Features

- Inspect built-in CSS models and uploaded `.glb` models.
- Rotate with an open palm, mouse drag, or arrow keys.
- Zoom with two hands, the mouse wheel, or `+` / `-`.
- Cycle selectable model areas with pinch, click, or `Enter` / `Space`.
- Switch models using pinky navigation, `A` / `D`, or the gallery.
- Open Immersive view with `F`; exit with `Esc`.
- Use Debug view to inspect the public hand-tracking result.

## Project rationale

The existing library already supported rotate, zoom, selection, and navigation. A 3D inspector gives those capabilities a coherent purpose: users can see their hand, the resulting mode, and the model response in one place.

Path B (further library robustness work) was considered. Earlier work had already addressed gesture priority, accidental pinches, zoom persistence, and brief tracking dropouts, so Path A was the higher-value next step. See [ADR 0005](./docs/adr/0005-choose-vision-application.md).

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- A modern browser with WebGL support and webcam permission for hand controls

Mouse and keyboard controls work without a camera. Camera access requires `localhost` or HTTPS.

## Run locally

```bash
pnpm install
pnpm run dev
```

Open the local Vite URL shown in the terminal. To create a production build:

```bash
pnpm run build
pnpm run preview
```

The build command type-checks the app and produces the static deployment bundle in `dist/`.

## Controls

| Action         | Hand gesture                                                    | Mouse / keyboard fallback   |
| -------------- | --------------------------------------------------------------- | --------------------------- |
| Rotate model   | Hold one open palm for one second, then move it                 | Drag / arrow keys           |
| Zoom model     | Hold two hands for one second, then move them apart or together | Wheel / `+` / `-`           |
| Select area    | Pinch in normal mode                                            | Click / `Enter` / `Space`   |
| Change model   | Hold pinky left or right, then pinch with the other hand        | `A` / `D` / Gallery         |
| Immersive view | —                                                               | `F` to enter, `Esc` to exit |

## Models and selection

The gallery includes two built-in models and models uploaded during the current browser session. Uploads must be self-contained binary `.glb` files. The viewer exposes mesh/node boundaries as selectable areas when the source model contains separate meshes. A single-mesh GLB is selected as a whole; this is a property of the source model, not a generated semantic hotspot.

## Repository structure

```txt
src/
  Core/                  reusable gesture library and public API
    index.ts             supported import boundary
  UI/                    React application and focused UI components
    App.tsx              interaction orchestration
    LiveCameraPanel.tsx  camera surface and telemetry states
    ThreeModelViewer.tsx GLB loading, framing, selection, and thumbnails
    uiDefinitions.ts     UI model data and event definitions
docs/adr/                Architecture Decision Records
```

## Library boundary

The application consumes the gesture library only through the public API in [`src/Core/index.ts`](./src/Core/index.ts). It uses `createHandTracker()` and `getGestureEvents()` rather than importing recognizers or landmark helpers from internal files.

## Deploy

This is a standard Vite application. Any static host can serve the output of `pnpm run build` from the generated `dist/` directory. For GitHub Pages, set the Vite `base` option to the repository path when necessary, build the app, and publish `dist/` with GitHub Pages or a Pages deployment workflow.

Use an HTTPS host for deployed camera access. After deploying, verify that the page can request camera permission and add the real URL below.

- Public deployment URL: **add after deployment**
- Demo video URL: **add after upload**

## Troubleshooting

- **No camera image:** check browser permission, another app using the camera, and that the page runs on `localhost` or HTTPS.
- **Gestures are unreliable:** use even lighting, keep hands within the frame, and avoid fast motion blur. Mouse and keyboard alternatives are always available.
- **The selected area says “Whole model”:** the uploaded GLB contains one mesh. Export separate meshes to expose independently selectable parts.
- **A model does not load:** upload a self-contained `.glb`; the upload flow does not support `.gltf` files with external texture files.

## Reflection

By using heuristic rules, the hand-tracking library can recognize many
different gestures. These rules help compensate for image noise and small
camera movements. Although a camera is not a perfect sensor, this makes
gesture recognition reliable in everyday use.

Multiple gestures that may overlap also work well overall. The biggest
challenge was finding simple and clear rules that reliably distinguish between
the gestures. Holding a gesture briefly before activating it helps prevent
accidental actions, and visual feedback makes it easier to understand when a
gesture has been recognized.

The main trade-off is that stricter detection reduces false positives but can
make gestures harder to trigger. Conventional keyboard and mouse controls
provide a dependable fallback when hand tracking is temporarily unavailable.

## Project documentation

- [Gesture library API](./docs/gesture-library.md)
- [Sprint 1: hand-tracking foundation](<./docs/readme(sprint%201).md>)
- [Sprint 2: gesture vocabulary and pinch recognition](<./docs/readme(sprint%202).md>)
- [Sprint 3: reusable gesture library](<./docs/readme(sprint%203).md>)
- [Sprint 4: library application test](<./docs/readme(sprint%204).md>)
- [Sprint 5: Vision Application](<./docs/readme(sprint%205).md>)
- [Architecture Decision Records](./docs/adr/)
