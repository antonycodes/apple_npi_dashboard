import { useEffect, useRef, useState } from 'react';

type OcrWorker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>;

let workerPromise: Promise<OcrWorker> | null = null;

function loadWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker('eng', undefined, { logger: () => undefined }));
  }
  return workerPromise;
}

function extractSerial(text: string): string | null {
  const ignored = new Set(['SERIAL', 'SERIALNUMBER', 'NUMBER', 'MODEL', 'MODELNUMBER', 'IMEI', 'EID', 'ICCID']);
  const normalized = text.toUpperCase();
  const serialLine = normalized.split(/\r?\n/).find((line) => /SERIAL|SERIALNUMBER/.test(line));
  const candidates = (serialLine ?? normalized).match(/[A-Z0-9]{8,20}/g)?.filter((candidate) => !ignored.has(candidate));
  return candidates?.at(-1) ?? null;
}

interface SerialScanButtonProps {
  onScan: (value: string) => void;
  label?: string;
}

export default function SerialScanButton({ onScan, label = 'Quét Serial Number' }: SerialScanButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const close = () => {
    stop();
    setOpen(false);
    setBusy(false);
    setError(null);
    setManualValue('');
  };

  const submitManualValue = () => {
    const value = manualValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length < 8 || value.length > 20) {
      setError('Serial Number cần có từ 8 đến 20 ký tự chữ và số.');
      return;
    }
    onScan(value);
    close();
  };

  const readImage = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const worker = await loadWorker();
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      });
      const result = await worker.recognize(file);
      const serial = extractSerial(result.data.text);
      if (!serial) throw new Error('Không nhận diện được Serial Number. Hãy chụp rõ dòng Số sê-ri.');
      onScan(serial);
      close();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không đọc được Serial Number.');
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    const cropWidth = Math.round(video.videoWidth * 0.9);
    const cropHeight = Math.round(video.videoHeight * 0.3);
    const cropX = Math.round(video.videoWidth * 0.05);
    const cropY = Math.round(video.videoHeight * 0.35);
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    canvas.getContext('2d')?.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (blob) await readImage(new File([blob], 'serial-number.jpg', { type: 'image/jpeg' }));
  };

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Thiết bị không hỗ trợ camera. Hãy nhập Serial Number bằng tay.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
        if (track && capabilities.focusMode?.includes('continuous')) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            } as unknown as MediaTrackConstraints);
          } catch {
            // Some Safari/iOS versions expose focusMode but reject the constraint.
          }
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (exception) {
        if (!cancelled) {
          setError(exception instanceof Error && exception.name === 'NotAllowedError'
            ? 'Bạn cần cho phép quyền camera để nhận diện.'
            : 'Không mở được camera. Hãy nhập Serial Number bằng tay.');
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={label} aria-label={label} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 active:scale-[0.98]">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10" />
          <path d="M9 15h6M9 9h6" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={label}>
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-800">{label}</h3>
                <p className="mt-1 text-xs text-neutral-500">Đưa dòng Số sê-ri trên màn hình iPhone vào khung.</p>
              </div>
              <button type="button" onClick={close} aria-label="Đóng" className="text-lg leading-none text-neutral-400 hover:text-neutral-700">×</button>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/30" />
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[30%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded border-2 border-emerald-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
              <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">Đưa dòng Số sê-ri vào khung</p>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
            {busy && <p className="mt-2 text-sm font-semibold text-neutral-700" aria-live="polite">Đang nhận diện. Lần đầu có thể mất vài giây.</p>}
            <button type="button" onClick={() => void capture()} disabled={busy} className="mt-3 min-h-11 w-full rounded-lg bg-neutral-800 px-3 text-sm font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50">{busy ? 'Đang nhận diện…' : 'Chụp và nhận diện S/N'}</button>
            {error && !busy && (
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <label htmlFor="manual-serial-number" className="text-xs font-semibold text-neutral-700">Nhập Serial Number thủ công</label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="manual-serial-number"
                    value={manualValue}
                    onChange={(event) => setManualValue(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitManualValue();
                    }}
                    maxLength={20}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Nhập 8–20 ký tự"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 text-base uppercase text-neutral-800 outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-200"
                  />
                  <button type="button" onClick={submitManualValue} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm font-bold text-neutral-800 transition hover:bg-neutral-50 active:scale-[0.98]">Dùng mã này</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
