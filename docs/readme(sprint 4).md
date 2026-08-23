# Sprint 4: Event-API und barriereärmere Demo

## Ziel

Sprint 4 macht die Gestenbibliothek für Anwendungen einfacher nutzbar.
Frühere Versionen lieferten in jedem Frame ausführlichen Gestenzustand. Dieser
Sprint ergänzt eine kleine Event-API für einmalige Aktionen, ohne die
detaillierten Daten für UI-Feedback und Debugging zu entfernen.

## Änderungen

- `getGestureEvents(hands)` zur öffentlichen Core-API hinzugefügt.
- Die Typen `GestureEvent` und `GestureEventKind` ergänzt.
- Gestenzustände auf Events wie `click`, `scrollReady`, `navigateBack`,
  `zoomReady` und `zoomExit` abgebildet.
- Gestenerkennung bleibt in Core. Die UI entscheidet, was ein Event in der
  Anwendung bedeutet, zum Beispiel Auswahl oder Modellwechsel.
- Maus- und Tastaturalternativen in der Demo ergänzt, damit sie ohne Kamera
  oder bei unzuverlässigem Tracking weiterhin nutzbar bleibt.

## Warum eine Event-API?

Gestenzustand und Anwendungsereignisse haben verschiedene Aufgaben:

- Zustand ist beim Rendern nützlich: Die UI kann zeigen, ob eine Geste gerade
  vorbereitet, bereit, aktiv oder beendet ist.
- Events sind für einmalige Aktionen nützlich: Ein Pinch-Klick soll einmal
  auswählen und nicht in jedem Tracking-Frame erneut auslösen.

Der Event-Adapter liest das öffentliche `TrackedHand`-Ergebnis und erzeugt
diese einmaligen Events. Er enthält keine Landmark-Berechnungen oder
Gestenregeln. Damit bleiben die Erkenner wiederverwendbar und das
Anwendungsverhalten bleibt außerhalb der Bibliothek.

## Relevante Dateien

```txt
src/Core/gestureEvents.ts             wandelt Gestenzustand in Events um
src/Core/index.ts                     exportiert die Event-API öffentlich
src/Core/gestures/zoomGesture.ts      ergänzt Zoom-Start- und Endzustände
src/UI/App.tsx                        nutzt Events für die Demo
docs/adr/0004-add-gesture-event-adapter.md
```

## Ergebnis

Anwendungen können die Bibliothek jetzt auf zwei Ebenen nutzen: detaillierten
Gestenzustand für kontinuierliches Feedback lesen oder `getGestureEvents()`
für einzelne Aktionen aufrufen. Die Demo nutzt beide Varianten, ohne interne
Core-Dateien zu importieren.

## Tatsächlicher Zeitaufwand

**10 Stunden**

## Dokumentation

- [Gesture Library API](./gesture-library.md)
- [ADR 0004: Gesture Event Adapter](./adr/0004-add-gesture-event-adapter.md)
