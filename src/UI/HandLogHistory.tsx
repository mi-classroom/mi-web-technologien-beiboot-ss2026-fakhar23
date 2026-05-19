import React, { useState } from "react";

// Blueprint for a recorded snapshot log entry
interface HandLogEntry {
  id: number;
  timestamp: string;
  screenshotUrl: string;
  serializedData: string;
}

// Props needed from App.tsx to create and size snapshots
interface HandLogHistoryProps {
  handsData: any[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  trackingWidth: number;
  trackingHeight: number;
}

export default function HandLogHistory({
  handsData,
  videoRef,
  canvasRef,
  trackingWidth,
  trackingHeight,
}: HandLogHistoryProps) {
  // The history state is now safely encapsulated inside this component
  const [logEntries, setLogEntries] = useState<HandLogEntry[]>([]);

  // Combines the current video frame and skeleton graphics canvas into an image object
  const triggerLogCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Create an isolated canvas buffer to stitch frames together
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = trackingWidth;
    captureCanvas.height = trackingHeight;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return;

    // Mirror image the video drawing pass to match our visual webcam layout styling
    ctx.translate(trackingWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, trackingWidth, trackingHeight);

    // Reset transformations completely before painting the vector graphics cleanly on top
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvasRef.current, 0, 0, trackingWidth, trackingHeight);

    // Export layout states into a base64 string image asset and serialize tracking object data
    const mergedImageData = captureCanvas.toDataURL("image/png");
    const currentJson = JSON.stringify(handsData, null, 2);

    const newLog: HandLogEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      screenshotUrl: mergedImageData,
      serializedData: currentJson,
    };

    // Append the new entry to our localized component list state
    setLogEntries((prev) => [...prev, newLog]);
  };

  return (
    <div className="history-section">
      {/* The capture controls are rendered right alongside the history content */}
      <div className="controls-row" style={{ marginBottom: "20px" }}>
        <button onClick={triggerLogCapture} className="btn btn-primary">
          📸 Take Snapshot Dump
        </button>
        {logEntries.length > 0 && (
          <button onClick={() => setLogEntries([])} className="btn btn-danger">
            Clear History
          </button>
        )}
      </div>

      <h3 className="history-title">Snapshot History ({logEntries.length})</h3>
      {logEntries.length === 0 && (
        <p className="empty-history-text">
          No snapshots taken yet. Click "Take Snapshot Dump" to append
          historical entries.
        </p>
      )}

      <div className="history-list">
        {logEntries.map((log) => (
          <div key={log.id} className="log-card">
            {/* Image snapshot column preview */}
            <div className="log-preview-pane">
              <h4 className="log-preview-title">View - {log.timestamp}</h4>
              <img
                src={log.screenshotUrl}
                alt={`Tracking capture record timestamped at ${log.timestamp}`}
                className="log-screenshot"
                style={{ width: trackingWidth / 2, height: trackingHeight / 2 }}
              />
            </div>

            {/* Structured text data view pane */}
            <div className="log-data-pane">
              <div className="log-data-header">
                <h4 className="log-data-title">Data State</h4>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(log.serializedData)
                  }
                  className="btn-secondary"
                >
                  📋 Copy JSON
                </button>
              </div>
              <pre
                className="log-data-block"
                style={{ maxHeight: trackingHeight / 2 }}
              >
                {log.serializedData}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
