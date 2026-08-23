import type { TrackedHand } from "../../Core";

/** Render tracker JSON while making important true/false gesture flags visible. */
export function formatDebugHands(hands: TrackedHand[]) {
  return JSON.stringify(hands, null, 2)
    .split(
      /("(?:active|click|toTop|down|openPalm|ready|entered|exited|back|forward|zoomIn|zoomOut)":\s*)(true|false)/g,
    )
    .map((part, index) =>
      part === "true" || part === "false" ? (
        <span
          className={part === "true" ? "pinch-true" : "pinch-false"}
          key={`${part}-${index}`}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
}
