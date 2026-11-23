import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { DeepDiveTab } from './components/DeepDiveTab';
import { EmployeeModal } from './components/EmployeeModal';
import { FilterBar } from './components/FilterBar';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import { TopBar } from './components/TopBar';
import type {
  DataSourceInfo,
  FilterState,
  ScoredEmployee,
  TabKey,
} from './types/employee';
import { applyFilters, getFilterOptions, scoreEmployees } from './utils/analytics';
import {
  fetchGoogleSheetEmployees,
  GOOGLE_SHEET_EDIT_URL,
  parseEmployeeCsv,
} from './utils/csvParser';

const DEFAULT_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('shell_pa_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return false;
    } catch {
      return false;
    }
  });

  const [allEmployees, setAllEmployees] = useState<ScoredEmployee[]>([]);
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<ScoredEmployee | null>(null);

  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('shell_pa_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage failure
    }
  }, [isDark]);

  const handleSyncSheet = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsed = await fetchGoogleSheetEmployees();
      const scored = scoreEmployees(parsed);
      setAllEmployees(scored);
      setSourceInfo({
        source: 'google-sheets',
        label: 'Google Sheets (gviz CSV)',
        lastSyncedAt: new Date(),
        rowCount: scored.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to read the Google Sheet. Please check sharing permissions or upload a CSV file.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void handleSyncSheet();
  }, [handleSyncSheet]);

  const handleUploadCsv = useCallback((file: File) => {
    setErrorMessage(null);
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = parseEmployeeCsv(text);
        const scored = scoreEmployees(parsed);
        setAllEmployees(scored);
        setFilters(DEFAULT_FILTERS);
        setSourceInfo({
          source: 'csv-upload',
          label: file.name,
          lastSyncedAt: new Date(),
          rowCount: scored.length,
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not parse uploaded CSV file. Ensure it matches the Shell People dataset columns.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected CSV file from disk.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const filterOptions = useMemo(() => getFilterOptions(allEmployees), [allEmployees]);
  const filteredEmployees = useMemo(
    () => applyFilters(allEmployees, filters),
    [allEmployees, filters]
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'deep-dive', label: 'Deep Dive' },
    { key: 'insights', label: 'Insights' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F8] dark:bg-[#0B0B0E] text-[#111113] dark:text-[#FAFAFA] transition-colors">
      <TopBar
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSyncSheet={handleSyncSheet}
        onUploadCsv={handleUploadCsv}
        isLoading={isLoading}
        sourceInfo={sourceInfo}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-[#F58220] bg-orange-50 dark:bg-[#1E140E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="h-5 w-5 text-[#D95D00] dark:text-[#F58220] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  Unable to sync Google Sheet
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{errorMessage}</p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Export the sheet as CSV from{' '}
                  <a
                    href={GOOGLE_SHEET_EDIT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium text-[#111113] dark:text-[#FFC800]"
                  >
                    Google Sheets
                  </a>{' '}
                  and upload it manually, or retry syncing once public access is enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fallbackInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadCsv(file);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1C1C22] px-3 py-2 text-xs font-semibold text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload CSV</span>
              </button>
              <button
                type="button"
                onClick={handleSyncSheet}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFC800] hover:bg-[#eab700] px-3.5 py-2 text-xs font-bold text-[#111113] cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile sync context line */}
        {sourceInfo && (
          <div className="flex lg:hidden flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums px-0.5">
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
          </div>
        )}

        {/* Shared Filters above the 3 Tabs */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          options={filterOptions}
          filteredCount={filteredEmployees.length}
          totalCount={allEmployees.length}
        />

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Analytics Views"
          className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                  isActive
                    ? 'text-[#111113] dark:text-[#FFC800]'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-[#111113] dark:hover:text-[#FAFAFA]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[3px] bg-[#FFC800] rounded-t-sm"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {isLoading && allEmployees.length === 0 ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading workforce dataset">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[108px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5 animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[340px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] animate-pulse" />
              <div className="h-[340px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] animate-pulse" />
            </div>
          </div>
        ) : allEmployees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#141418] p-10 text-center space-y-3">
            <h2 className="font-display text-base font-bold text-[#111113] dark:text-[#FAFAFA]">
              No workforce data loaded
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Use Sync Sheet to fetch the live Shell UK Google Sheet via gviz, or upload a CSV export
              using the Upload CSV button.
            </p>
          </div>
        ) : (
          <div role="tabpanel">
            {activeTab === 'overview' && (
              <OverviewTab employees={filteredEmployees} isDark={isDark} />
            )}
            {activeTab === 'deep-dive' && (
              <DeepDiveTab
                employees={filteredEmployees}
                isDark={isDark}
                onSelectEmployee={setSelectedEmployee}
              />
            )}
            {activeTab === 'insights' && (
              <InsightsTab
                employees={filteredEmployees}
                onSelectEmployee={setSelectedEmployee}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Shell People Analytics · UK Workforce Intelligence</span>
          <span>
            Source:{' '}
            <a
              href={GOOGLE_SHEET_EDIT_URL}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[#111113] dark:hover:text-[#FFC800]"
            >
              Google Sheets (gviz CSV)
            </a>{' '}
            · Currency in GBP
          </span>
        </div>
      </footer>

      <EmployeeModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}
