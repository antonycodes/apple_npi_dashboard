/**
 * popoverPlacement — định vị chung cho mọi popup neo theo 1 node trên màn hình
 * (bàn/nhân viên, chấm STT ở bàn, chấm STT ở vùng chờ).
 *
 * Quy tắc bất di bất dịch (yêu cầu user): popup KHÔNG BAO GIỜ đè lên chính node
 * đã bấm — kể cả badge "STT tiếp theo" và hàng chấm STT của bàn đó. Vì vậy
 * `placeOutside` nhận vào hình bao (union) của cả cụm node rồi thử lần lượt:
 * dưới → trên → phải → trái, và chỉ chấp nhận vị trí nào nằm trọn ngoài hình
 * bao đó. Khi không cạnh nào đủ chỗ cho card (màn hình thấp, vd 1024×600), card
 * bị GIỚI HẠN CHIỀU CAO cho vừa khoảng trống rộng nhất và tự cuộn bên trong —
 * thà cuộn còn hơn che node.
 */
import { useLayoutEffect, useRef, useState } from 'react';

/** Chừa mép viewport để card không dính sát cạnh màn hình. */
export const VIEWPORT_INSET = 16;
/** Khe hở nhìn thấy được giữa node và popup. */
export const ANCHOR_GAP = 12;
/** Lề/khe hở rút gọn, chỉ dùng khi phải đặt card sang bên vì hết chỗ trên/dưới. */
const TIGHT_INSET = 8;

export interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Placement {
  left: number;
  top: number;
  /**
   * Trần chiều cao cho card — CHỈ đặt khi khoảng trống thật sự không đủ (card
   * phải cuộn). Đủ chỗ thì để `undefined` để card hiện nguyên vẹn, không bao
   * giờ cắt mất nội dung chỉ vì sai số đo vài px.
   */
  maxHeight?: number;
}

/** Canh ngang khi popup nằm trên/dưới node: giữa node, hoặc phải node. */
export type Align = 'center' | 'right';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Hình bao của các phần tử tạo nên 1 node (bỏ qua phần tử không tồn tại). */
export function unionRect(elements: (Element | null | undefined)[]): AnchorRect | null {
  let rect: AnchorRect | null = null;
  for (const el of elements) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    rect = rect
      ? {
          left: Math.min(rect.left, r.left),
          top: Math.min(rect.top, r.top),
          right: Math.max(rect.right, r.right),
          bottom: Math.max(rect.bottom, r.bottom),
        }
      : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }
  return rect;
}

/**
 * Toạ độ viewport cho card rộng `width`, cao tự nhiên `height`, luôn nằm ngoài
 * `anchor`. `maxHeight` trả về là trần chiều cao card phải tuân theo.
 */
export function placeOutside(
  anchor: AnchorRect,
  size: { width: number; height: number },
  align: Align = 'right',
  gap: number = ANCHOR_GAP,
): Placement {
  const { width, height } = size;
  const maxLeft = window.innerWidth - width - VIEWPORT_INSET;
  // Mọi phương án đều kẹp trong vùng ĐANG NHÌN THẤY, kể cả khi node bị cuộn ra
  // ngoài màn hình (sidebar xuống dưới bảng ở tablet dọc) — card luôn hiện đủ.
  const visibleTop = VIEWPORT_INSET;
  const visibleBottom = window.innerHeight - VIEWPORT_INSET;
  const fullHeight = Math.max(visibleBottom - visibleTop, 0);

  // Canh ngang cho 2 phương án trên/dưới, kẹp lại trong viewport.
  const desiredLeft =
    align === 'center' ? (anchor.left + anchor.right) / 2 - width / 2 : anchor.right - width;
  const left = clamp(desiredLeft, VIEWPORT_INSET, maxLeft);

  const belowTop = Math.max(anchor.bottom + gap, visibleTop);
  const spaceBelow = visibleBottom - belowTop;
  if (height <= spaceBelow) return { left, top: belowTop };

  const aboveBottom = Math.min(anchor.top - gap, visibleBottom);
  const spaceAbove = aboveBottom - visibleTop;
  if (height <= spaceAbove) return { left, top: aboveBottom - height };

  // Không đủ chỗ trên/dưới → đặt sang bên cạnh, vẫn không che node. Ở thế bí
  // này khe hở và lề được nới hẹp lại (8px): thà sát mép một chút còn hơn ép
  // card cuộn — nhiều màn hình thấp chỉ thiếu vài px là đặt được nguyên card.
  const sideHeight = Math.min(height, fullHeight);
  const sideTop = clamp(anchor.top, visibleTop, Math.max(visibleBottom - sideHeight, visibleTop));
  const sideMaxHeight = height <= fullHeight ? undefined : fullHeight;
  const tightGap = Math.min(gap, TIGHT_INSET);
  const tightMaxLeft = window.innerWidth - width - TIGHT_INSET;
  const rightLeft = anchor.right + tightGap;
  if (rightLeft <= tightMaxLeft) return { left: rightLeft, top: sideTop, maxHeight: sideMaxHeight };
  const leftLeft = anchor.left - tightGap - width;
  if (leftLeft >= TIGHT_INSET) return { left: leftLeft, top: sideTop, maxHeight: sideMaxHeight };

  // Hai bên cũng chật → thử lại trên/dưới với khe hở + lề rút gọn. Nhiều màn
  // hình chỉ thiếu vài px, nới ra là card hiện đủ, khỏi phải cuộn.
  const tightBelowTop = Math.max(anchor.bottom + tightGap, TIGHT_INSET);
  const tightSpaceBelow = window.innerHeight - TIGHT_INSET - tightBelowTop;
  if (height <= tightSpaceBelow) return { left, top: tightBelowTop };

  const tightAboveBottom = Math.min(anchor.top - tightGap, window.innerHeight - TIGHT_INSET);
  const tightSpaceAbove = tightAboveBottom - TIGHT_INSET;
  if (height <= tightSpaceAbove) return { left, top: tightAboveBottom - height };

  // Hết cách (màn hình quá thấp + node ở giữa) → chọn cạnh còn nhiều chỗ nhất
  // và ép card cao đúng bằng khoảng đó; card cuộn bên trong, node vẫn hở.
  if (tightSpaceBelow >= tightSpaceAbove) {
    return { left, top: tightBelowTop, maxHeight: Math.max(tightSpaceBelow, 0) };
  }
  return { left, top: TIGHT_INSET, maxHeight: Math.max(tightSpaceAbove, 0) };
}

/**
 * Đo node + card rồi trả về toạ độ (tương đối với phần tử cha của popup) để gán
 * vào `style`. Trả `null` ở lần render đầu (chưa đo được) — popup nên ẩn tạm.
 *
 * `resolveAnchor` được gọi lại mỗi lần đo nên node có thể di chuyển (resize,
 * scroll, layout đổi) mà popup vẫn bám đúng.
 */
export function useAnchoredPlacement(
  popoverRef: React.RefObject<HTMLElement | null>,
  resolveAnchor: (parent: HTMLElement) => AnchorRect | null,
  align: Align,
  deps: React.DependencyList,
): Placement | null {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const resolveRef = useRef(resolveAnchor);
  resolveRef.current = resolveAnchor;

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const parent = popover?.parentElement;
    const card = popover?.firstElementChild as HTMLElement | null;
    if (!popover || !parent || !card) return;

    function place() {
      const parentElement = parent as HTMLElement;
      const cardElement = card as HTMLElement;
      const anchor = resolveRef.current(parentElement);
      if (!anchor) return;
      const parentRect = parentElement.getBoundingClientRect();
      // Đo chiều cao TỰ NHIÊN bằng cách tạm gỡ trần đang áp: nếu đo chiều cao
      // hiển thị thì card vừa bị thu nhỏ lại thấy "đủ chỗ" rồi phình ra, nhấp
      // nháy vô tận; còn `scrollHeight` thì Chrome bỏ qua padding dưới nên đo
      // hụt vài px và card bị cắt mất phần đuôi. Gỡ–đo–trả lại đều nằm gọn
      // trong 1 layout effect (trước khi trình duyệt vẽ) nên không thấy giật.
      const cappedMaxHeight = cardElement.style.maxHeight;
      cardElement.style.maxHeight = 'none';
      const { width, height } = cardElement.getBoundingClientRect();
      cardElement.style.maxHeight = cappedMaxHeight;
      const spot = placeOutside(anchor, { width, height }, align);
      const next = {
        left: spot.left - parentRect.left,
        top: spot.top - parentRect.top,
        maxHeight: spot.maxHeight,
      };
      setPlacement((prev) =>
        prev && prev.left === next.left && prev.top === next.top && prev.maxHeight === next.maxHeight
          ? prev
          : next,
      );
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(parent);
    observer.observe(card);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return placement;
}

/**
 * Hình bao của 1 bàn trên sơ đồ: nút bàn + badge "STT tiếp theo" (tràn ra ngoài
 * nút) + hàng chấm STT khách ngay dưới bàn. Dùng chung cho `DeskPopover` và
 * `CustomerPopover` để cả hai đều không che bàn lẫn chấm STT của bàn đó.
 */
export function deskAnchorRect(board: HTMLElement, deskId: string): AnchorRect | null {
  const desk = board.querySelector<HTMLElement>(`[data-desk-id="${deskId}"]`);
  return unionRect([
    desk,
    desk?.querySelector<HTMLElement>('[data-desk-badge]'),
    board.querySelector<HTMLElement>(`[data-customer-dot-row="${deskId}"]`),
  ]);
}
