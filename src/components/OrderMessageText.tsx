import { warehouseOrderTypeTone } from '@/utils/warehouseOrderType';

const ORDER_HEADER_TONES = {
  '#Lấy hàng cho khách': warehouseOrderTypeTone('#Lấy hàng cho khách'),
  '#Trả hàng về kho': warehouseOrderTypeTone('#Trả hàng về kho'),
} as const;

type OrderHeader = keyof typeof ORDER_HEADER_TONES;

function splitOrderMessage(rawText: string): { header: OrderHeader | null; body: string } {
  const match = rawText.match(/^(#Lấy hàng cho khách|#Trả hàng về kho)(?:\r?\n|$)/);
  if (!match) return { header: null, body: rawText };

  return {
    header: match[1] as OrderHeader,
    body: rawText.slice(match[0].length).replace(/^(?:\r?\n)+/, ''),
  };
}

export default function OrderMessageText({
  rawText,
  className = '',
}: {
  rawText: string;
  className?: string;
}) {
  const { header, body } = splitOrderMessage(rawText);

  return (
    <div className={className}>
      {header ? <p className={`font-black ${ORDER_HEADER_TONES[header]}`}>{header}</p> : null}
      {header ? <pre className="mt-2 whitespace-pre-wrap font-sans text-inherit">{body}</pre> : <pre className="whitespace-pre-wrap font-sans text-inherit">{rawText}</pre>}
    </div>
  );
}
