# Sprint 5: Vision-Anwendung „Gesture Model Studio"

## Gewählter Weg

**Weg A — Vision-Anwendung**

Das Projekt entwickelt die Gestenbibliothek zu einer 3D-Modell-Inspektion
weiter. Nutzende können eingebaute oder hochgeladene GLB-Modelle mit Händen,
Maus und Tastatur untersuchen. Weg B wurde geprüft, aber die Bibliothek hatte
in früheren Sprints bereits mehrere Robustheitsverbesserungen erhalten. Eine
fokussierte Anwendung zeigt besser, was die Bibliothek praktisch ermöglicht.

Decision Record: [ADR 0005](./adr/0005-choose-vision-application.md).

## Mehr als eine Funktionsdemo

- Eine gestaltete Galerie verbindet zwei eingebaute Inspektionsmodelle mit
  hochgeladenen GLB-Modellen und Live-Vorschaubildern.
- Die bewusste Immersive-Ansicht macht das Modell zur Hauptfläche, während die
  Live-Kamera als Bild-in-Bild erhalten bleibt.
- Gesten, Maus und Tastatur steuern denselben Viewer-Zustand.
- Hochgeladene GLBs werden automatisch passend eingerahmt. Wenn das Modell
  getrennte Meshes enthält, werden diese als auswählbare Bereiche verwendet.

## Nutzung der öffentlichen Bibliothek

Die UI verwendet die Bibliothek nur über `../Core`, den öffentlichen
Einstiegspunkt der Bibliothek. `useCameraTracker.ts` erstellt den Tracker und
`App.tsx` verarbeitet die öffentlichen Gesten-Events. Die Anwendung importiert
keine Erkenner, Tracker-Interna oder Landmark-Hilfsfunktionen aus `src/Core`.

## Zentrale Entscheidung

- [ADR 0005](./adr/0005-choose-vision-application.md): Weg A wählen und für
  den Inspector progressive Offenlegung sowie zugängliche Eingabealternativen
  verwenden.

## Lokal starten

```bash
pnpm install
pnpm run dev
```

Mit `pnpm run build` wird der Produktions-Build geprüft.

## Abgabe-Checkliste

- [x] Vision-Anwendung implementiert und lokal startbar.
- [x] Anwendung verwendet die Bibliothek über die öffentliche Core-API.
- [x] README erklärt Installation, Steuerung und Deployment.
- [x] Decision Records dokumentieren Weg und Interaktionsdesign.
- [x] Öffentliche Deployment-URL in der Root-README ergänzen.
- [x] Video von höchstens zehn Minuten aufgenommen und hochgeladen:
  `BeiBoot-Vid-Fakhar-23-08-2026.mp4` (professor's submission folder).
- [x] Finale Änderungen in `main` committen und pushen.

## Reflexion

Heuristische Regeln ermöglichen es der Hand-Tracking-Library, viele
verschiedene Gesten zu erkennen. Sie helfen dabei, Bildrauschen und kleine
Kamerabewegungen auszugleichen. Obwohl eine Kamera kein perfekter Sensor ist,
funktioniert die Gestenerkennung dadurch im Alltag zuverlässig.

Auch Gesten, die sich überschneiden können, funktionieren insgesamt gut. Die
größte Herausforderung war, einfache und klare Regeln zu finden, die zuverlässig
zwischen den Gesten unterscheiden. Ein kurzer Halt vor der Aktivierung hilft,
versehentliche Aktionen zu vermeiden. Visuelles Feedback zeigt außerdem, wann
eine Geste erkannt wurde.

Strengere Erkennung reduziert Fehlaktivierungen, kann Gesten aber schwieriger
auslösbar machen. Maus- und Tastatursteuerung bieten deshalb eine zuverlässige
Alternative, wenn das Hand-Tracking vorübergehend nicht verfügbar ist.

## Zeitaufwand

**24 Stunden**.
