interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  accent?: 'default' | 'yellow' | 'orange';
}

export function KpiCard({ label, value, detail, accent = 'default' }: KpiCardProps) {
  const valueColor =
    accent === 'orange'
      ? 'text-[#D95D00] dark:text-[#F58220]'
      : accent === 'yellow'
      ? 'text-[#111113] dark:text-[#FFC800]'
      : 'text-[#111113] dark:text-[#FAFAFA]';

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-4 sm:p-5 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        {accent === 'yellow' && (
          <span className="h-2 w-2 rounded-sm bg-[#FFC800] shrink-0" aria-hidden="true" />
        )}
        {accent === 'orange' && (
          <span className="h-2 w-2 rounded-sm bg-[#F58220] shrink-0" aria-hidden="true" />
        )}
      </div>
      <div className={`font-display text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{detail}</div>
    </div>
  );
}
