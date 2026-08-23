import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { createHandTracker, type TrackedHand } from "../../Core";

const MAX_CAMERA_WIDTH = 640;
const DEFAULT_TRACKER_OUTPUT_SETTINGS = {
  isCoordinateDataNormalized: true,
  decimalPlaces: 3,
};

type UseCameraTrackerOptions = {
  onDataRef: MutableRefObject<(hands: TrackedHand[]) => void>;
  videoRef: RefObject<HTMLVideoElement | null>;
};

/**
 * Connects the browser camera to the Core hand tracker.
 * It asks for camera permission, starts tracking, and stops the camera when
 * the component is unmounted.
 */
export function useCameraTracker({
  onDataRef,
  videoRef,
}: UseCameraTrackerOptions) {
  const trackerRef = useRef<ReturnType<typeof createHandTracker> | null>(null);
  const trackerOutputSettingsRef = useRef(DEFAULT_TRACKER_OUTPUT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [trackerOutputSettings, setTrackerOutputSettings] = useState(
    DEFAULT_TRACKER_OUTPUT_SETTINGS,
  );
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  const updateDataDisplaySettings = useCallback(
    (isCoordinateDataNormalized: boolean, decimalPlaces: number) => {
      const nextSettings = { isCoordinateDataNormalized, decimalPlaces };
      trackerOutputSettingsRef.current = nextSettings;
      setTrackerOutputSettings(nextSettings);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const videoElement = videoRef.current;

    const initialize = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoElement) {
          videoElement.srcObject = stream;
          await new Promise<void>((resolve) => {
            videoElement.onloadedmetadata = () => {
              const scale = Math.min(
                1,
                MAX_CAMERA_WIDTH / videoElement.videoWidth,
              );
              setVideoSize({
                width: videoElement.videoWidth * scale,
                height: videoElement.videoHeight * scale,
              });
              resolve();
            };
          });
          await videoElement.play();
        }

        const tracker = createHandTracker();
        await tracker.initialize("lite");
        trackerRef.current = tracker;
      } catch (error) {
        console.error("Camera or tracker initialization failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    initialize();

    return () => {
      active = false;
      trackerRef.current?.stop();
      const stream = videoElement?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const tracker = trackerRef.current;
    if (loading || !videoElement || !tracker) return;

    tracker.start({
      videoElement,
      flipHorizontal: true,
      normalize: trackerOutputSettings.isCoordinateDataNormalized,
      precision: trackerOutputSettings.decimalPlaces,
      pinchDistanceThreshold: 0.06,
      pinchClickHoldMs: 120,
      scrollReadyHoldMs: 1000,
      scrollSpeedPx: 18,
      navigationHoldMs: 1000,
      zoomReadyHoldMs: 1000,
      onData: (hands) => onDataRef.current(hands),
    });

    return () => tracker.stop();
  }, [loading, onDataRef, trackerOutputSettings, videoRef]);

  return {
    loading,
    trackerOutputSettingsRef,
    updateDataDisplaySettings,
    videoSize,
  };
}
