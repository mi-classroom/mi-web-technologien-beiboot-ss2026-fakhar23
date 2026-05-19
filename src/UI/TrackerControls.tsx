// DUMP COMPONENT: Has no state of its own, jsut for UI

// Types defining the state properties passed down from App.tsx
interface TrackerControlsProps {
  normalize: boolean;
  setNormalize: (val: boolean) => void;
  precision: number;
  setPrecision: (val: number) => void;
}

export default function TrackerControls({
  normalize,
  setNormalize,
  precision,
  setPrecision,
}: TrackerControlsProps) {
  return (
    <div className="controls-panel">
      {/* Normalization Checkbox Control Option */}
      <label className="control-label">
        <input
          type="checkbox"
          checked={normalize}
          onChange={(e) => setNormalize(e.target.checked)}
        />
        Normalize Data (0.0 - 1.0)
        <span className="info-icon">
          i
          <span className="tooltip-text">
            <strong>Normalization:</strong>
            <p>
              Scales the 2D pixel values down to a universal 0.0 - 1.0 map based
              on your camera window width/height. Helpful for responsive
              displays!
            </p>
          </span>
        </span>
      </label>

      <label className="control-label">
        Decimal Precision:
        <select
          value={precision}
          onChange={(e) => setPrecision(Number(e.target.value))}
          className="control-select"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
          <option value={6}>6</option>
        </select>
        <span className="info-icon">
          i
          <span className="tooltip-text align-right">
            <strong>Precision:</strong> Dictates the maximum number of decimal
            values allowed after the dot. Reduces the textual size of data
            packets and removes coordinate jitter noise.
          </span>
        </span>
      </label>
    </div>
  );
}
