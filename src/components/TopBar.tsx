import { useRef } from 'react';
import { Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import type { DataSourceInfo } from '../types/employee';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSyncSheet: () => void;
  onUploadCsv: (file: File) => void;
  isLoading: boolean;
  sourceInfo: DataSourceInfo | null;
}

export function TopBar({
  isDark,
  onToggleTheme,
  onSyncSheet,
  onUploadCsv,
  isLoading,
  sourceInfo,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCsv(file);
      e.target.value = '';
    }
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Zone 1: Brand Mark + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFC800] text-[#111113] shrink-0"
            aria-hidden="true"
          >
            {/* Geometric Pecten Shell Emblem */}
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
              <path
                d="M16 4C8.8 4 3.5 9.2 3.5 16.2c0 3.4 1.3 6.2 3.5 8.1l2.8 2.4h12.4l2.8-2.4c2.2-1.9 3.5-4.7 3.5-8.1C28.5 9.2 23.2 4 16 4Z"
                fill="#F58220"
                stroke="#111113"
                strokeWidth="2"
              />
              <path
                d="M16 6.5v17M11 7.8l3.2 15.7M21 7.8l-3.2 15.7M7 11.2l5.2 12.3M25 11.2l-5.2 12.3"
                stroke="#FFC800"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[#111113] dark:text-[#FAFAFA] whitespace-nowrap shrink-0">
            Shell People Analytics
          </span>
        </div>

        {/* Zone 2: Quiet unboxed dataset context */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          <span>Shell UK Workforce</span>
          <span aria-hidden="true">·</span>
          {sourceInfo ? (
            <>
              <span>{sourceInfo.label}</span>
              <span aria-hidden="true">·</span>
              <span>{sourceInfo.rowCount} records</span>
              <span aria-hidden="true">·</span>
              <span>
                Synced{' '}
                {sourceInfo.lastSyncedAt.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </>
          ) : (
            <span>Connecting to Google Sheets</span>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload CSV fallback file"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1C1C22] px-3.5 py-2 text-xs font-semibold text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFC800] hover:bg-[#eab700] disabled:opacity-60 px-4 py-2 text-xs font-bold text-[#111113] transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isLoading ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1C1C22] p-2 text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-[#FFC800]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
