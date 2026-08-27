const PRODUCT_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
];

function ProductIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" aria-hidden="true">
      <path d="M280-40q-33 0-56.5-23.5T200-120v-720q0-33 23.5-56.5T280-920h400q33 0 56.5 23.5T760-840v124q18 7 29 22t11 34v80q0 19-11 34t-29 22v404q0 33-23.5 56.5T680-40H280Zm0-80h400v-720H280v720Zm0 0v-720 720Zm120-40h160q17 0 28.5-11.5T600-200q0-17-11.5-28.5T560-240H400q-17 0-28.5 11.5T360-200q0 17 11.5 28.5T400-160Z" />
    </svg>
  );
}

export default function ProductList({ value }: { value: string | null | undefined }) {
  if (!value?.trim()) return <span>—</span>;
  return (
    <span className="flex w-full flex-col gap-1 text-left">
      {value.split('\n').map((line, index) => {
        const match = line.match(/^•\s*(SP[1-4]):\s*(.*)$/i);
        if (!match) return <span key={`${line}-${index}`}>{line}</span>;
        const number = Number(match[1].slice(2)) - 1;
        return (
          <span key={line} className="flex min-w-0 w-full items-center gap-1.5">
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black ${PRODUCT_COLORS[number]}`}>
              <ProductIcon /> {match[1].toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{match[2]}</span>
          </span>
        );
      })}
    </span>
  );
}
