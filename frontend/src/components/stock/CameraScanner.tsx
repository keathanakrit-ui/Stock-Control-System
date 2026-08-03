import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

export type CameraScanKind = "barcode" | "qr";

type CameraScannerProps = {
  open: boolean;
  onScan: (value: string, kind: CameraScanKind) => void;
  onClose: () => void;
};

type ScannerSession = {
  cancelled: boolean;
  deliverScan: boolean;
  handledScan: boolean;
  video: HTMLVideoElement;
  controls: IScannerControls | null;
  initialization: Promise<IScannerControls> | null;
  cleanup: Promise<void> | null;
};

function getCameraErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return "Camera access requires HTTPS or localhost.";
  }

  if (
    error instanceof Error
    && error.message === "MediaDevices camera API is unavailable"
  ) {
    return "This browser does not support camera scanning.";
  }

  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError"
      || error.name === "SecurityError"
    ) {
      return "Camera permission was denied. Allow camera access and try again.";
    }

    if (
      error.name === "NotFoundError"
      || error.name === "DevicesNotFoundError"
    ) {
      return "No camera is available on this device.";
    }

    if (
      error.name === "NotReadableError"
      || error.name === "TrackStartError"
      || error.name === "AbortError"
    ) {
      return "The camera could not start. It may already be in use by another application.";
    }

    if (
      error.name === "OverconstrainedError"
      || error.name === "ConstraintNotSatisfiedError"
    ) {
      return "The available camera does not support the requested video settings.";
    }
  }

  return "Cannot start the camera scanner. Please close it and try again.";
}

function stopVideo(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;

  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  if (video) {
    video.srcObject = null;
  }
}

function stopSession(session: ScannerSession): Promise<void> {
  session.cancelled = true;

  if (session.cleanup) {
    return session.cleanup;
  }

  session.cleanup = (async () => {
    let controls = session.controls;

    if (!controls && session.initialization) {
      try {
        controls = await session.initialization;
      } catch {
        // Initialization failures do not provide scanner controls.
      }
    }

    controls?.stop();
    session.controls = null;
    stopVideo(session.video);
  })();

  return session.cleanup;
}

function CameraScanner({
  open,
  onScan,
  onClose,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScannerSession | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const video = videoRef.current;
    const previousSession = sessionRef.current;

    if (!video) return;

    const session: ScannerSession = {
      cancelled: false,
      deliverScan: true,
      handledScan: false,
      video,
      controls: null,
      initialization: null,
      cleanup: null,
    };

    sessionRef.current = session;

    async function startScannerSession() {
      try {
        // Yield once so StrictMode can clean up its first effect before any
        // camera permission request or ZXing decoder initialization begins.
        await Promise.resolve();

        if (previousSession) {
          await stopSession(previousSession);
        }

        if (session.cancelled || sessionRef.current !== session) return;

        if (!window.isSecureContext) {
          throw new Error("Camera requires a secure context");
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("MediaDevices camera API is unavailable");
        }

        const reader = new BrowserMultiFormatReader();

        session.initialization = reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          session.video,
          (result) => {
            if (
              !result
              || session.handledScan
              || session.cancelled
              || sessionRef.current !== session
            ) {
              return;
            }

            const value = result.getText().trim();

            if (!value) return;

            session.handledScan = true;
            const kind = result.getBarcodeFormat() === BarcodeFormat.QR_CODE
              ? "qr"
              : "barcode";

            void stopSession(session).then(() => {
              if (
                session.deliverScan
                && sessionRef.current === session
              ) {
                onScan(value, kind);
              }
            });
          },
        );

        const controls = await session.initialization;
        session.controls = controls;

        if (session.cancelled || sessionRef.current !== session) {
          await stopSession(session);
          return;
        }

        setIsStarting(false);
      } catch (error: unknown) {
        if (session.cancelled || sessionRef.current !== session) return;

        console.error(error);
        setErrorMessage(getCameraErrorMessage(error));
        setIsStarting(false);
        await stopSession(session);
      }
    }

    void startScannerSession();

    return () => {
      session.deliverScan = false;
      void stopSession(session);
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-scanner-title"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="camera-scanner-title"
              className="text-xl font-bold text-slate-800"
            >
              Scan Camera
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Point the camera at a barcode or QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          {isStarting && !errorMessage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              Starting camera...
            </div>
          )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-5 py-2 text-white hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraScanner;
