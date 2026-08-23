import { useState } from "react";

import type { TrackedHand } from "../Core";

import { formatDebugHands } from "./utils/formatDebugHands";

type HandTrackingDebugPanelProps = {
  hands: TrackedHand[];
  maxHeight: number;
  onDataDisplaySettingsChange: (
    isCoordinateDataNormalized: boolean,
    decimalPlaces: number,
  ) => void;
};

/**
 * Shows the live hand-tracking data in Debug mode.
 * The controls here change how the tracker sends and displays coordinates.
 */
export default function HandTrackingDebugPanel({
  hands,
  maxHeight,
  onDataDisplaySettingsChange,
}: HandTrackingDebugPanelProps) {
  const [isCoordinateDataNormalized, setIsCoordinateDataNormalized] =
    useState(true);
  const [decimalPlaces, setDecimalPlaces] = useState(3);

  const changeCoordinateNormalization = (shouldNormalize: boolean) => {
    setIsCoordinateDataNormalized(shouldNormalize);
    onDataDisplaySettingsChange(shouldNormalize, decimalPlaces);
  };

  const changeDecimalPlaces = (nextDecimalPlaces: number) => {
    setDecimalPlaces(nextDecimalPlaces);
    onDataDisplaySettingsChange(isCoordinateDataNormalized, nextDecimalPlaces);
  };

  return (
    <aside className="live-monitor" style={{ maxHeight }}>
      <div className="controls-panel">
        <label className="control-label">
          <input
            type="checkbox"
            checked={isCoordinateDataNormalized}
            onChange={(event) =>
              changeCoordinateNormalization(event.target.checked)
            }
          />
          Normalize Data (0.0 - 1.0)
          <span className="info-icon">
            i
            <span className="tooltip-text">
              <strong>Normalization:</strong>
              <p>
                Scales 2D pixel values to a universal 0.0–1.0 range using the
                camera width and height.
              </p>
            </span>
          </span>
        </label>

        <label className="control-label">
          Decimal Precision:
          <select
            value={decimalPlaces}
            onChange={(event) => changeDecimalPlaces(Number(event.target.value))}
            className="control-select"
          >
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className="info-icon">
            i
            <span className="tooltip-text align-right">
              <strong>Precision:</strong> Sets the number of digits after each
              decimal point in the displayed tracker data.
            </span>
          </span>
        </label>
      </div>

      <h3 style={{ marginTop: 0 }}>Live API Data ({hands.length} hands):</h3>
      <pre className="code-block">{formatDebugHands(hands)}</pre>
    </aside>
  );
}
