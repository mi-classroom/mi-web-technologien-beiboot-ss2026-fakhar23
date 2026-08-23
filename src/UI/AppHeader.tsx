import ClickCounter from "./ClickCounter";

type AppHeaderProps = {
  debugMode: boolean;
  onDebugModeChange: (debugMode: boolean) => void;
  previewClickCount: number;
};

export default function AppHeader({
  debugMode,
  onDebugModeChange,
  previewClickCount,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <div className="brand-title-row">
          <h1>Gesture 3D-Model Studio</h1>
        </div>
        <p>
          A hands-on space for exploring 3D objects.
          {!debugMode && (
            <a className="instructions-link" href="#instructions">
              Instructions <span aria-hidden="true">↓</span>
            </a>
          )}
        </p>
      </div>
      <div className="header-actions">
        {!debugMode && (
          <div className="viewer-header-meta">
            <ClickCounter count={previewClickCount} />
          </div>
        )}
        <div
          className={`mode-toggle${debugMode ? " debug-active" : ""}`}
          role="group"
          aria-label="View mode"
        >
          <button
            className={!debugMode ? "active" : ""}
            type="button"
            onClick={() => onDebugModeChange(false)}
          >
            Preview
          </button>
          <button
            className={debugMode ? "active" : ""}
            type="button"
            onClick={() => onDebugModeChange(true)}
          >
            Debug
          </button>
        </div>
      </div>
    </header>
  );
}
