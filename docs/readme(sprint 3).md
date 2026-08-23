# Sprint 3: Wiederverwendbare Gestenbibliothek

## Ziel

In Sprint 3 wurde aus dem Hand-Tracking-Prototypen eine wiederverwendbare
Core-Bibliothek. Andere Anwendungen sollen Gesten über eine kleine öffentliche
API nutzen können, ohne React-Code zu importieren oder Gestenlogik zu kopieren.

## Änderungen

- `GestureLibrary` hinzugefügt: Sie registriert und führt Gestenerkenner aus.
- Gemeinsames `GestureRecognizer`-Interface definiert: Name, Anfangszustand
  und eine `recognize`-Funktion.
- Pinch, offene Handfläche, Pinky-Navigation und Zwei-Hand-Zoom in eigene
  Gestendateien ausgelagert.
- Öffentliche API in `src/Core/index.ts` ergänzt.
- Browser- und UI-Verhalten aus Core herausgehalten. Core liefert Tracking-
  und Gestendaten; die Anwendung entscheidet über Scrollen, Rotieren,
  Auswählen oder Navigation.
- Gestenpriorität ergänzt, damit sich überlappende Gesten nicht gleichzeitig
  auslösen.

## Wichtige Architekturentscheidung

Die meisten Gesten werden pro Hand ausgewertet. Die Bibliothek speichert ihren
Zustand deshalb pro Hand. So kann eine Hand nicht den Pinch-Timer, Palm-Anker
oder Navigations-Hold der anderen Hand verändern.

Der Zwei-Hand-Zoom ist anders: Er vergleicht beide Handflächen und kann kurz
aktiv bleiben, wenn eine Hand das Bild verlässt. Deshalb ist er ein kleiner
Controller für mehrere Hände und kein normaler Erkenner pro Hand.

## Relevante Dateien

```txt
src/Core/index.ts            öffentliche Bibliotheks-API
src/Core/tracker.ts          MediaPipe-/TensorFlow-Frame-Schleife
src/Core/gestureLibrary.ts   Gestenmanager und Zustand pro Hand
src/Core/gestureDetector.ts  erstellt die Standard-Gestensammlung
src/Core/gestures/           eine Implementierung pro Geste
docs/adr/                    Begründungen für Architekturentscheidungen
```

## Ergebnis

Die Bibliothek kann unabhängig von der React-Demo verwendet werden. Eine
Anwendung erstellt einen Tracker, startet ihn mit Videoelement und Callback
und erhält typisierte `TrackedHand`-Ergebnisse mit Landmarken und Gestenzustand.

## Tatsächlicher Zeitaufwand

**16 Stunden**

## Dokumentation

- [Gesture Library API](./gesture-library.md)
- [ADR 0001: Gestenbibliotheks-Manager](./adr/0001-gesture-library-manager.md)
- [ADR 0002: UI-Effekte außerhalb der Erkenner](./adr/0002-keep-ui-effects-outside-recognizers.md)
- [ADR 0003: Gestenpriorität](./adr/0003-use-gesture-priority-for-conflicting-gestures.md)
