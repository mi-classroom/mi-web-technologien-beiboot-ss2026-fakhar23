# ADR 0005: Build a Progressive 3D Vision Application

## Status

Accepted

## Context

For Issue #5, we could either add more internal robustness work to the library (Path B) or build a focused application that demonstrates what the library enables (Path A). The library already had independent recognizers, gesture priority, cooldowns, persistent zoom, and tracking-loss handling.

## Decision

Choose Path A and build **Gesture Model Studio**, a browser-based 3D model inspector controlled by hand gestures, mouse, and keyboard. Users can inspect built-in or uploaded `.glb` models: an open palm rotates, two hands zoom, a pinch selects an area, and pinky navigation changes the active model.

The default is a normal workspace with the gallery, camera, controls, and status feedback. An optional Immersive view makes the model the main surface while retaining the camera as picture-in-picture. `F` enters this view and `Esc` exits it.

## Why this approach

A 3D inspector makes each gesture's effect immediately visible and tests the public API in a realistic consumer. The normal view helps new users understand setup and controls; the immersive view supports focused inspection and a stronger demo.

We rejected a gesture-only interface because webcam tracking can be unavailable or unreliable. Mouse and keyboard controls make the experience accessible and dependable. We also rejected starting in Immersive view because it hides useful setup and feedback from new users.

## Consequences

- The UI uses the Core library only through its public API.
- Gesture, mouse, and keyboard input must update the same viewer state.
- The project needs a static deployment and a short video demonstration.
- Uploaded models are limited to self-contained `.glb` files; selectable areas depend on the source model's mesh structure.
