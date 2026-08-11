/**
 * Scans the proxy URL QR code with the rear camera, with a jsQR fallback for
 * browsers without BarcodeDetector and an image-picker fallback for all users.
 */
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

declare global {
  interface DetectedBarcode {
    rawValue: string;
  }
  interface BarcodeDetector {
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
  }
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetector;
  }
}

interface QrScanButtonProps {
  onScan: (value: string) => void;
}

export default function QrScanButton({ onScan }: QrScanButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const supported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  const stop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const close = () => {
    stop();
    setOpen(false);
    setError(null);
  };

  useEffect(() => {
    if (!open || !supported) return;
    let cancelled = false;
    const Detector = window.BarcodeDetector;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            let value: string | null = null;
            if (detector) {
              value = (await detector.detect(videoRef.current))[0]?.rawValue ?? null;
            } else if (context && videoRef.current.videoWidth > 0) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              value = jsQR(image.data, image.width, image.height)?.data ?? null;
            }
            if (value) {
              onScan(value);
              close();
              return;
            }
          } catch {
            // Camera frame is not ready yet; continue scanning on the next frame.
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (exception) {
        if (!cancelled) {
          setError(
            exception instanceof Error && exception.name === 'NotAllowedError'
              ? 'Bạn cần cho phép quyền camera để quét QR.'
              : 'Không mở được camera trên thiết bị này.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // `stop` is intentionally stable for the camera lifecycle of one dialog opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const readImage = async (file: File) => {
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Không đọc được ảnh QR.');
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height);
      if (!result?.data) throw new Error('Không tìm thấy mã QR trong ảnh.');
      onScan(result.data);
      close();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không đọc được ảnh QR.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Quét QR link proxy"
        aria-label="Quét QR link proxy"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Quét mã QR">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-800">Quét QR link proxy</h3>
              <button type="button" onClick={close} aria-label="Đóng" className="text-lg leading-none text-neutral-400 hover:text-neutral-700">
                ×
              </button>
            </div>
            {!supported ? (
              <p className="text-sm text-red-600">Thiết bị không cho phép camera. Bạn có thể chọn ảnh QR bên dưới.</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <video ref={videoRef} className="aspect-square w-full rounded-lg bg-black object-cover" muted playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              🖼️ Chọn ảnh QR từ thiết bị
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readImage(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <p className="mt-2 text-xs text-neutral-400">Đưa mã QR vào khung hình hoặc chọn ảnh QR — link sẽ tự điền khi nhận diện được.</p>
          </div>
        </div>
      )}
    </>
  );
}
