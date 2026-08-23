import React, { useState } from "react";
import type { TrackedHand } from "../Core";

// One saved camera snapshot and its hand-tracking data.
interface HandLogEntry {
  id: number;
  timestamp: string;
  screenshotUrl: string;
  serializedData: string;
}

// Camera data needed to create a snapshot.
interface HandLogHistoryProps {
  handsData: TrackedHand[];
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
  // Saved snapshots are kept only in this panel.
  const [logEntries, setLogEntries] = useState<HandLogEntry[]>([]);

  // Combines the camera image and hand skeleton into one snapshot.
  const triggerLogCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Draw into a temporary canvas before saving the image.
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = trackingWidth;
    captureCanvas.height = trackingHeight;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return;

    // Mirror the camera image to match the on-screen camera view.
    ctx.translate(trackingWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, trackingWidth, trackingHeight);

    // Reset the mirror before drawing the skeleton on top.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvasRef.current, 0, 0, trackingWidth, trackingHeight);

    // Save the image and the matching tracking data together.
    const mergedImageData = captureCanvas.toDataURL("image/png");
    const currentJson = JSON.stringify(handsData, null, 2);

    const newLog: HandLogEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      screenshotUrl: mergedImageData,
      serializedData: currentJson,
    };

    // Add the new snapshot to this panel's list.
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
