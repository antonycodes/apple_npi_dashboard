/**
 * Quét mã bằng camera sau, kèm đường dự phòng chụp/chọn ảnh.
 *
 * **Vì sao có zxing-wasm** (2026-08-12): `BarcodeDetector` KHÔNG tồn tại trên
 * iOS — mọi trình duyệt ở đó đều chạy WebKit, kể cả Chrome/Firefox. Mà tem
 * IMEI trên máy là mã vạch 1D (Code 128), còn `jsQR` cũ chỉ đọc được QR ⇒ trên
 * iPhone việc quét IMEI KHÔNG BAO GIỜ chạy. zxing-wasm giải mã bằng WASM nên
 * đọc được cả QR lẫn 1D ở mọi thiết bị.
 *
 * Module WASM (~1MB) được `import()` ĐỘNG, chỉ tải khi NV thật sự mở máy quét —
 * bundle chính không phình. File .wasm tự host qua `?url` của Vite thay vì lấy
 * từ CDN mặc định của thư viện: hội trường có thể chặn CDN, và tải từ chính
 * domain của app thì chắc chắn hơn.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReadInputBarcodeFormat } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

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

/** Tên định dạng của `BarcodeDetector` → tên tương ứng bên zxing. */
const ZXING_FORMAT: Record<string, ReadInputBarcodeFormat> = {
  qr_code: 'QRCode',
  code_128: 'Code128',
  code_39: 'Code39',
  code_93: 'Code93',
  ean_13: 'EAN13',
  ean_8: 'EAN8',
  itf: 'ITF',
  upc_a: 'UPCA',
  upc_e: 'UPCE',
  codabar: 'Codabar',
  data_matrix: 'DataMatrix',
  pdf417: 'PDF417',
  aztec: 'Aztec',
};

/**
 * Đổi danh sách định dạng sang tên zxing, BỎ tên nào không có trong bảng —
 * đẩy tên lạ sang zxing là nó ném lỗi và hỏng cả lần quét. Rỗng thì zxing
 * hiểu là "tìm mọi định dạng", vẫn dùng được.
 */
function toZxingFormats(names: string[]): ReadInputBarcodeFormat[] {
  return names
    .map((n) => ZXING_FORMAT[n])
    .filter((n): n is ReadInputBarcodeFormat => Boolean(n));
}

/** Nạp zxing 1 lần/đời trang, và trỏ đúng file .wasm tự host. */
let zxingReader: Promise<typeof import('zxing-wasm/reader')> | null = null;
function loadZxing() {
  if (!zxingReader) {
    zxingReader = import('zxing-wasm/reader').then((mod) => {
      mod.prepareZXingModule({ overrides: { locateFile: () => wasmUrl } });
      return mod;
    });
  }
  return zxingReader;
}

interface QrScanButtonProps {
  onScan: (value: string) => void;
  /**
   * Định dạng mã cần tìm, đặt theo tên của `BarcodeDetector` (`qr_code`,
   * `code_128`…) và tự đổi sang tên zxing khi chạy đường WASM.
   *
   * Mặc định CHỈ `qr_code` — giữ nguyên hành vi màn Cài đặt (quét QR chứa URL
   * proxy), tránh máy vô tình bắt phải mã vạch nào đó trong khung hình. Ô IMEI
   * truyền thêm các mã 1D.
   */
  formats?: string[];
  /**
   * Nhãn nút + tiêu đề hộp thoại. Mặc định là câu của màn Cài đặt; màn hình
   * nhân viên truyền nhãn riêng ("Quét QR máy cũ" / "Quét IMEI") — để nguyên
   * mặc định thì NV quét máy lại thấy chữ "link proxy", không hiểu gì.
   */
  label?: string;
}

export default function QrScanButton({
  onScan,
  formats = ['qr_code'],
  label = 'Quét QR link proxy',
}: QrScanButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * `navigator.mediaDevices` CHỈ tồn tại trong secure context (HTTPS hoặc
   * localhost). Đây là lý do hay gây hiểu nhầm nhất: ô "chụp ảnh" là
   * `<input type="file" capture>` — nó chỉ nhờ hệ điều hành mở app camera nên
   * chạy ở mọi nơi, kể cả HTTP. Camera mở được ở đó KHÔNG có nghĩa là quét
   * được QR.
   */
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  /** Nói đúng nguyên nhân thay vì đổ cho "thiết bị" — 2 ca khác hẳn nhau. */
  const unsupportedReason =
    typeof window !== 'undefined' && !window.isSecureContext
      ? 'Trang đang mở qua HTTP nên trình duyệt khoá camera. Mở lại bằng link HTTPS (bản trên Vercel) là quét được.'
      : 'Trình duyệt trong ứng dụng (Lark, Zalo, Messenger…) không cho dùng camera. Bấm "Mở trong Safari/Chrome" rồi quét lại.';

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
        // `BarcodeDetector` (Android) nhanh hơn vì chạy native — ưu tiên dùng.
        // Không có (iOS, và mọi trình duyệt trên đó) thì rơi sang zxing-wasm.
        const detector = Detector ? new Detector({ formats }) : null;
        const zxing = detector ? null : await loadZxing();
        const zxingFormats = toZxingFormats(formats);
        if (cancelled) return;

        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            let value: string | null = null;
            if (detector) {
              value = (await detector.detect(videoRef.current))[0]?.rawValue ?? null;
            } else if (zxing && context && videoRef.current.videoWidth > 0) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              const found = await zxing.readBarcodes(image, { formats: zxingFormats, tryHarder: true });
              value = found.find((r) => r.isValid && r.text)?.text ?? null;
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

  /**
   * Đọc mã từ ảnh chụp/chọn. Đây là đường LUÔN CHẠY ĐƯỢC — kể cả khi camera bị
   * khoá (HTTP, webview trong Lark) — nên nó phải đọc được cả 1D, không chỉ QR.
   * zxing nhận thẳng `Blob` nên khỏi vẽ qua canvas như bản jsQR cũ.
   */
  const readImage = async (file: File) => {
    setError(null);
    try {
      const zxing = await loadZxing();
      const found = await zxing.readBarcodes(file, {
        formats: toZxingFormats(formats),
        tryHarder: true,
      });
      const value = found.find((r) => r.isValid && r.text)?.text;
      if (!value) throw new Error('Không tìm thấy mã trong ảnh.');
      onScan(value);
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
        title={label}
        aria-label={label}
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
              <h3 className="text-sm font-bold text-neutral-800">{label}</h3>
              <button type="button" onClick={close} aria-label="Đóng" className="text-lg leading-none text-neutral-400 hover:text-neutral-700">
                ×
              </button>
            </div>
            {!supported ? (
              <p className="text-sm text-red-600">
                {unsupportedReason} Hoặc chụp/chọn ảnh có mã ở nút bên dưới — cách này luôn chạy.
              </p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <video ref={videoRef} className="aspect-square w-full rounded-lg bg-black object-cover" muted playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              🖼️ Chụp / chọn ảnh có mã
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
            <p className="mt-2 text-xs text-neutral-400">
              Đưa mã vào khung hình, hoặc chụp/chọn ảnh có mã — ô nhập tự điền khi
              nhận diện được. Đường chụp ảnh đọc được QR, không đọc được mã vạch 1D.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
