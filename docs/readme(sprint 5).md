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

`src/UI/App.tsx` importiert nur aus `../Core`, dem öffentlichen Einstiegspunkt
der Bibliothek. Die Anwendung verwendet `createHandTracker()` und
`getGestureEvents()` und importiert keine Erkenner, Tracker-Interna oder
Landmark-Hilfsfunktionen aus `src/Core`.

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
- [ ] Öffentliche Deployment-URL in der Root-README ergänzen.
- [ ] Video von höchstens zehn Minuten aufnehmen, hochladen und URL in
  Root-README und Miro Board eintragen.
- [ ] Finale Änderungen in `main` committen und pushen.

## Reflexion

Die größte Stärke der Anwendung ist die direkte Verbindung zwischen Hand in
der Kamera, erkanntem Modus und Reaktion des 3D-Modells. Die größte
Herausforderung war, überlappende Gesten und unvollständiges Tracking in eine
vorhersehbare Bedienung zu übersetzen. Gestenpriorität, ein kurzer Puffer bei
Tracking-Aussetzern sowie Maus- und Tastaturalternativen machen die Interaktion
verlässlicher.

## Zeitaufwand

**24 Stunden**.
