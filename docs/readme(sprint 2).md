# Sprint 2: Vom Rohsignal zur Geste: Vokabular & Abstraktion

## 1. Gestenvokabular & Abstraktion (Mapping-Tabelle)

Die Tabelle dokumentiert das damals geplante Gestenvokabular. In diesem Sprint
wurde zunächst nur die Pinch-Geste implementiert; Scroll-, Navigations- und
Zoom-Gesten wurden in späteren Sprints ergänzt. Die Fern-Gesten waren eine
Idee für mögliche Erweiterungen und sind keine aktuell verwendete
Pose-Detection-Implementierung.

> 💡 **Distanz-Strategie:** Für Entfernungen unter 1 Meter verwenden wir das Hand-Pose-Modell (`@tensorflow-models/hand-pose-detection`) zur Erkennung feiner Fingerbewegungen (Mikro-Gesten). Ab 1 Meter sinkt die Pixeldichte drastisch. Für diese Distanz würde für Makro-Bewegungen (ganze Arme) eine separate **Pose-Detection-Bibliothek** (Ganzkörper-Tracking) benötigt. 
> *Ausnahme:* Für unseren Prototypen (Klicken) nutzen wir einen Exploit, der es uns erlaubt, das bestehende Hand-Modell auch aus der Distanz zweckzuentfremden, ohne eine zweite, rechenintensive Bibliothek laden zu müssen.

| Interaktion | Nah-Geste (< 1m) | Technische Logik (Nah / Hand-Modell) | Fern-Geste (> 1m) | Technische Logik (Fern / Pose-Detection) |
| :--- | :--- | :--- | :--- | :--- |
| **Klicken / Auswählen** | **Pinch (Kneifen)** | Berechnet die 3D-Distanz zwischen Daumen- und Zeigefingerspitze. | **Geschlossene Faust** | **Hand-Modell Exploit:** Die Finger verschwimmen. Daumen und Zeigefinger überlappen sich mathematisch und lösen den Pinch zuverlässig im bestehenden Hand-Modell aus. |
| **Nach oben scrollen** | **Offene Handfläche nach oben** | Vertikales Y-Achsen-Tracking der Handflächenmitte. | **Ganzer Arm nach oben** | Ein Pose-Modell verfolgt die Y-Achsen-Bewegung des Handgelenks (Wrist-Node) im Raum. |
| **Nach unten scrollen** | **Offene Handfläche nach unten** | Vertikales Y-Achsen-Tracking der Handflächenmitte. | **Ganzer Arm nach unten** | Ein Pose-Modell verfolgt das Handgelenk bei der Abwärtsbewegung auf der Y-Achse. |
| **Zurück navigieren** | **Kleiner Finger zeigt nach links** | Horizontale X-Achsen-Erweiterung der kleinen Fingerspitze. | **Armschwung nach links** | Ein Pose-Modell registriert einen schnellen Geschwindigkeitsanstieg des Handgelenks auf der X-Achse nach links. |
| **Vorwärts navigieren** | **Kleiner Finger zeigt nach rechts** | Horizontale X-Achsen-Erweiterung der kleinen Fingerspitze. | **Armschwung nach rechts** | Ein Pose-Modell registriert einen schnellen Geschwindigkeitsanstieg des Handgelenks auf der X-Achse nach rechts. |
| **Hineinzoomen (Zoom In)** | **Finger spreizen** | Verfolgt die zunehmende Distanz zwischen Daumen und kleinem Finger. | **Hände auseinander** | Ein Pose-Modell misst, wie sich die Distanz zwischen linkem und rechtem Handgelenk vergrößert. |
| **Herauszoomen (Zoom Out)**| **Finger zusammenziehen** | Verfolgt die abnehmende Distanz zwischen Daumen und kleinem Finger. | **Hände kreuzen** | Ein Pose-Modell misst, wie die Distanz zwischen linkem und rechtem Handgelenk unter einen Mindestwert fällt. |
| **Drag & Drop** | **Pinch & Halten** | Anhaltender boolescher `true`-Zustand des Pinch-Schwellenwerts. | **Faust & Halten** |Hand-Modell Exploit: Anhaltender Zustand, da die Faust die Daumen- und Zeigefingerkoordinaten kontinuierlich zusammenhält. |

---

## 2. Gewählte Implementierung & Begründung

Für die prototypische Implementierung habe ich mich vollständig auf die **Pinch-Geste (Klicken/Auswählen)** konzentriert.

**Begründung:** Der Pinch (das Zusammenführen von Daumen und Zeigefinger) ist die grundlegendste Interaktion im Spatial Computing. Er dient als direktes Äquivalent zu einem physischen Mausklick und ist damit der elementare Baustein für alle zukünftigen UI-Interaktionen (Buttons, Dragging, Toggles). Durch die Isolierung dieser einzelnen Mikro-Geste konnte ich deren Stabilität, Kantenerkennung (Edge Detection) und Performance tiefgehend optimieren, bevor kontinuierliche Datenströme (wie Scrollen) eingeführt werden.

---

## 3. Algorithmische Erkennungslogik & Modell-Performance

Die Geste wird rein in einer Headless-Tracking-Engine (`tracker.ts`) mit folgender Logik verarbeitet:

* **Die Heuristik:** Die Engine berechnet für jeden aktiven Frame die **euklidische 3D-Distanz** zwischen den Landmarken der Daumen- und Zeigefingerspitze.
* **Der Schwellenwert (Threshold):** Fällt die berechnete 3D-Distanz unter das konfigurierbare Limit (`PINCH_DISTANCE_THRESHOLD`), wird `active: true` gemeldet.
* **Kantenerkennung (Edge Detection):** Die Engine verfolgt den Beginn und das Ende eines Pinches. Nach einem kurzen stabilen Halt wird `click: true` als einmaliges Ereignis gemeldet; dadurch wird ein gehaltenes Pinch nicht in jedem Frame als neuer Klick ausgegeben.

🚀 **Performance vs. Präzision (Lite vs. Full Modell):**
Aktuell verwenden wir standardmäßig das **"lite"**-Modell der ML-Bibliothek, um eine optimale, ruckelfreie Performance im Browser zu gewährleisten. Wenn die Anwendung jedoch auf leistungsstärkerer Hardware ausgeführt wird, kann die Erkennungsgenauigkeit (insbesondere auf Distanz und bei leichten Verdeckungen) drastisch verbessert werden, indem wir auf das **"full"**-Modell wechseln. Dies ist in der Architektur bereits vorbereitet:
```typescript
async function initialize(modelType: "lite" | "full" = "lite") { ... }
```

---

## Tatsächlicher Zeitaufwand

**12 Stunden** für Gestenvokabular, Pinch-Erkennung, Tests und Dokumentation.
