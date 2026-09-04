import { useEffect, useMemo } from 'react';
import type { PrevImage } from '@/services/staffMapper';

export type PhotoSlot = { kind: 'existing'; image: PrevImage } | { kind: 'new'; file: File } | null;

function ExistingImage({ image, mediaUrl }: { image: PrevImage; mediaUrl: (image: PrevImage) => string }) {
  return <img src={mediaUrl(image)} alt={image.name ?? 'Ảnh nghiệm thu'} className="h-full w-full object-cover" />;
}

export default function PhotoSlotPicker({
  slots,
  max = 3,
  mediaUrl,
  onPreview,
  onPick,
  onRemove,
}: {
  slots: PhotoSlot[];
  max?: number;
  mediaUrl?: (image: PrevImage) => string;
  onPreview?: (image: PrevImage) => void;
  onPick: (slot: number, file: File) => void;
  onRemove: (slot: number) => void;
}) {
  const objectUrls = useMemo(
    () => slots.flatMap((slot) => (slot?.kind === 'new' ? [URL.createObjectURL(slot.file)] : [])),
    [slots],
  );
  useEffect(() => () => objectUrls.forEach((url) => URL.revokeObjectURL(url)), [objectUrls]);

  let newUrlIndex = 0;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {Array.from({ length: max }, (_, slotIndex) => {
        const slot = slots[slotIndex] ?? null;
        const newUrl = slot?.kind === 'new' ? objectUrls[newUrlIndex++] : null;
        return (
          <div key={slotIndex} className="relative">
            {slot ? (
              <div className="relative aspect-square overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                {slot.kind === 'existing' && mediaUrl ? (
                  onPreview ? (
                    <button type="button" className="h-full w-full" onClick={() => onPreview(slot.image)} aria-label={`Xem ảnh nghiệm thu ${slotIndex + 1}`}>
                      <ExistingImage image={slot.image} mediaUrl={mediaUrl} />
                    </button>
                  ) : <ExistingImage image={slot.image} mediaUrl={mediaUrl} />
                ) : newUrl ? (
                  <img src={newUrl} alt={`Ảnh nghiệm thu ${slotIndex + 1}`} className="h-full w-full object-cover" />
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(slotIndex)}
                  aria-label={`Xóa ảnh nghiệm thu ${slotIndex + 1}`}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900/85 text-base leading-none text-white"
                >
                  ×
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-neutral-900/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Ảnh {slotIndex + 1}
                </span>
              </div>
            ) : (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center text-xs font-semibold text-neutral-700 transition hover:border-emerald-500 hover:bg-emerald-50">
                <span className="text-2xl leading-none text-neutral-500">+</span>
                <span>Ảnh {slotIndex + 1}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPick(slotIndex, file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
