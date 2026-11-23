import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import {
  computeDeepDiveMetrics,
  formatGbp,
  formatNumber,
  formatPct,
  formatTravelLabel,
} from '../utils/analytics';
import { ChartCard, getChartThemeColors } from './ChartCard';
import { KpiCard } from './KpiCard';

interface DeepDiveTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
  onSelectEmployee: (emp: ScoredEmployee) => void;
}

type SortKey =
  | 'employeeId'
  | 'fullName'
  | 'department'
  | 'jobLevel'
  | 'location'
  | 'employmentType'
  | 'yearsAtCompany'
  | 'yearsSinceLastPromotion'
  | 'monthlyIncomeGbp'
  | 'flightRiskScore'
  | 'attrition';

export function DeepDiveTab({ employees, isDark, onSelectEmployee }: DeepDiveTabProps) {
  const metrics = useMemo(() => computeDeepDiveMetrics(employees), [employees]);
  const theme = useMemo(() => getChartThemeColors(isDark), [isDark]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('flightRiskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const makeComboConfig = (
    rows: ReturnType<typeof computeDeepDiveMetrics>['byAgeBand'],
    barColor: string
  ): ChartConfiguration | null => {
    if (rows.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.label),
        datasets: [
          {
            type: 'bar',
            label: 'Headcount',
            data: rows.map((r) => r.total),
            backgroundColor: barColor,
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Attrition Rate %',
            data: rows.map((r) => Number(r.attritionRate.toFixed(1))),
            borderColor: theme.orange,
            backgroundColor: theme.orange,
            borderWidth: 2.5,
            pointRadius: 4,
            tension: 0.2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: theme.textSecondary,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const r = rows[idx];
                return `Active: ${r.active} · Attrited: ${r.attrited} · Avg Pay: ${formatGbp(r.avgIncome)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            position: 'left',
            grid: { color: theme.gridColor },
            ticks: { color: theme.textSecondary, font: { size: 11 }, precision: 0 },
          },
          y1: {
            beginAtZero: true,
            suggestedMax: 40,
            position: 'right',
            grid: { display: false },
            ticks: {
              color: theme.orange,
              font: { size: 11 },
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    };
  };

  const ageConfig = useMemo(
    () => makeComboConfig(metrics.byAgeBand, theme.yellow),
    [metrics.byAgeBand, theme]
  );

  const tenureConfig = useMemo(
    () => makeComboConfig(metrics.byTenureBand, isDark ? '#E4E4E7' : '#18181B'),
    [metrics.byTenureBand, theme, isDark]
  );

  const incomeLevelConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byLevel.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: metrics.byLevel.map((l) => l.label),
        datasets: [
          {
            label: 'Avg Monthly Income (GBP)',
            data: metrics.byLevel.map((l) => Math.round(l.avgIncome)),
            backgroundColor: theme.yellow,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => {
                const row = metrics.byLevel[item.dataIndex];
                return ` Avg Income: ${formatGbp(row.avgIncome)}/mo (${row.total} staff)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textPrimary, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textSecondary,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [metrics.byLevel, theme]);

  const incomeDeptConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byDepartmentIncome.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: metrics.byDepartmentIncome.map((d) => d.label),
        datasets: [
          {
            label: 'Avg Monthly Income (GBP)',
            data: metrics.byDepartmentIncome.map((d) => Math.round(d.avgIncome)),
            backgroundColor: isDark ? '#FAFAFA' : '#18181B',
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => {
                const row = metrics.byDepartmentIncome[item.dataIndex];
                return ` Avg Income: ${formatGbp(row.avgIncome)}/mo (${row.total} staff)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textSecondary,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: theme.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [metrics.byDepartmentIncome, theme, isDark]);

  const eduConfig = useMemo(
    () => makeComboConfig(metrics.byEducation, theme.yellow),
    [metrics.byEducation, theme]
  );

  const travelConfig = useMemo(
    () => makeComboConfig(metrics.byTravel, isDark ? '#E4E4E7' : '#18181B'),
    [metrics.byTravel, theme, isDark]
  );

  const scatterConfig = useMemo<ChartConfiguration | null>(() => {
    if (employees.length === 0) return null;
    const activePts = employees
      .filter((e) => e.attrition === 'No')
      .map((e) => ({
        x: e.yearsAtCompany,
        y: e.monthlyIncomeGbp,
        emp: e,
      }));
    const attritedPts = employees
      .filter((e) => e.attrition === 'Yes')
      .map((e) => ({
        x: e.yearsAtCompany,
        y: e.monthlyIncomeGbp,
        emp: e,
      }));

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Active',
            data: activePts,
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.72)' : 'rgba(255, 200, 0, 0.85)',
            borderColor: isDark ? '#FFC800' : '#111113',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Attrited',
            data: attritedPts,
            backgroundColor: 'rgba(245, 130, 32, 0.88)',
            borderColor: '#9A3412',
            borderWidth: 1,
            pointRadius: 5.5,
            pointHoverRadius: 7.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: theme.textSecondary,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as { x: number; y: number; emp: ScoredEmployee };
                const e = raw.emp;
                return `${e.fullName} (${e.employeeId}) · L${e.jobLevel} ${e.department} · ${e.yearsAtCompany}y · ${formatGbp(e.monthlyIncomeGbp)}/mo`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Tenure (Years at Company)',
              color: theme.textSecondary,
              font: { size: 11 },
            },
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.textSecondary, font: { size: 11 } },
          },
          y: {
            title: {
              display: true,
              text: 'Monthly Income (GBP)',
              color: theme.textSecondary,
              font: { size: 11 },
            },
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textSecondary,
              font: { size: 11 },
              callback: (v) => `£${Number(v).toLocaleString('en-GB')}`,
            },
          },
        },
      },
    };
  }, [employees, theme, isDark]);

  // Table search & sort
  const tableRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? employees.filter(
          (e) =>
            e.employeeId.toLowerCase().includes(q) ||
            e.fullName.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q)
        )
      : employees;

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [employees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = tableRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'monthlyIncomeGbp' ||
          key === 'flightRiskScore' ||
          key === 'yearsAtCompany' ||
          key === 'yearsSinceLastPromotion' ||
          key === 'jobLevel'
          ? 'desc'
          : 'asc'
      );
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#F58220]" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-6">
      {/* 5 Deep Dive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Average Tenure"
          value={`${metrics.avgTenure.toFixed(1)} yrs`}
          detail={`Median ${metrics.medianTenure.toFixed(1)} yrs at Shell`}
        />
        <KpiCard
          label="Female Share"
          value={formatPct(metrics.femaleShare)}
          detail={`${formatNumber(metrics.femaleCount)} of ${employees.length} employees`}
          accent="yellow"
        />
        <KpiCard
          label="Non-Full-Time Share"
          value={formatPct(metrics.nonFullTimeShare)}
          detail={`${formatNumber(metrics.nonFullTimeCount)} Part-Time & Contract`}
        />
        <KpiCard
          label="Years Since Promotion"
          value={`${metrics.avgYearsSincePromo.toFixed(1)} yrs`}
          detail={`${metrics.overduePromoCount} staff at 4+ yrs since promo`}
        />
        <KpiCard
          label="High Flight-Risk Count"
          value={formatNumber(metrics.highRiskActiveCount)}
          detail={`${formatPct(metrics.highRiskShareOfActive)} of active staff (score >= 60)`}
          accent="orange"
        />
      </div>

      {/* Age & Tenure Bands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Age Bands & Attrition Rate"
          subtitle="Headcount bars vs attrition rate percentage"
          config={ageConfig}
          heightClass="h-[280px]"
          isEmpty={employees.length === 0}
        />
        <ChartCard
          title="Tenure Bands & Attrition Rate"
          subtitle="Retention profile across service-year cohorts"
          config={tenureConfig}
          heightClass="h-[280px]"
          isEmpty={employees.length === 0}
        />
      </div>

      {/* Income by Level & Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Average Monthly Income by Job Level"
          subtitle="Mean GBP compensation from Level 1 to Level 5"
          config={incomeLevelConfig}
          heightClass="h-[310px]"
          isEmpty={employees.length === 0}
        />
        <ChartCard
          title="Average Monthly Income by Department"
          subtitle="Departmental compensation benchmark (GBP/month)"
          config={incomeDeptConfig}
          heightClass="h-[310px]"
          isEmpty={employees.length === 0}
        />
      </div>

      {/* Education & Business Travel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Education & Attrition"
          subtitle="Headcount and attrition rate across qualification levels"
          config={eduConfig}
          heightClass="h-[270px]"
          isEmpty={employees.length === 0}
        />
        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Impact of travel frequency on employee departures"
          config={travelConfig}
          heightClass="h-[270px]"
          isEmpty={employees.length === 0}
        />
      </div>

      {/* Income vs Tenure Scatter */}
      <ChartCard
        title="Monthly Income vs Tenure Scatter"
        subtitle="Individual compensation trajectory (Active vs Attrited)"
        config={scatterConfig}
        heightClass="h-[320px]"
        isEmpty={employees.length === 0}
      />

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
              Employee Directory & Risk Register
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Click any row to inspect transparent flight-risk scoring drivers ({tableRows.length}{' '}
              matching records)
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, name, role, site..."
              aria-label="Search employee directory"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1C1C22] pl-9 pr-3 py-2 text-xs text-[#111113] dark:text-[#FAFAFA] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FFC800] min-h-[40px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1A1A20] text-zinc-600 dark:text-zinc-300">
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('employeeId')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    ID {renderSortIcon('employeeId')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('fullName')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Employee {renderSortIcon('fullName')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('department')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Department {renderSortIcon('department')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('location')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Location {renderSortIcon('location')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('employmentType')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Type {renderSortIcon('employmentType')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('jobLevel')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Lvl {renderSortIcon('jobLevel')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('yearsAtCompany')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Tenure {renderSortIcon('yearsAtCompany')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('yearsSinceLastPromotion')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Promo Gap {renderSortIcon('yearsSinceLastPromotion')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('monthlyIncomeGbp')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Income {renderSortIcon('monthlyIncomeGbp')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('flightRiskScore')}
                    className="inline-flex items-center justify-end gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Risk {renderSortIcon('flightRiskScore')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('attrition')}
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-[#111113] dark:hover:text-white"
                  >
                    Attrition {renderSortIcon('attrition')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-10 px-4 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No employees match your current filter or search query.
                  </td>
                </tr>
              ) : (
                pagedRows.map((emp) => {
                  const riskColor =
                    emp.riskTier === 'High'
                      ? 'text-[#D95D00] dark:text-[#F58220] font-semibold'
                      : emp.riskTier === 'Elevated'
                      ? 'text-amber-700 dark:text-[#FFC800] font-semibold'
                      : 'text-zinc-600 dark:text-zinc-300';

                  return (
                    <tr
                      key={emp.employeeId}
                      onClick={() => onSelectEmployee(emp)}
                      className="h-[42px] hover:bg-zinc-50 dark:hover:bg-[#1C1C22] transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {emp.employeeId}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-medium text-[#111113] dark:text-[#FAFAFA]">
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {emp.jobTitle} · {formatTravelLabel(emp.businessTravel)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {emp.department}
                      </td>
                      <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {emp.location}
                      </td>
                      <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {emp.employmentType}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                        L{emp.jobLevel}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[#111113] dark:text-[#FAFAFA] whitespace-nowrap">
                        {emp.yearsAtCompany}y
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {emp.yearsSinceLastPromotion}y
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-[#111113] dark:text-[#FAFAFA] whitespace-nowrap">
                        {formatGbp(emp.monthlyIncomeGbp)}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${riskColor}`}>
                        {emp.flightRiskScore} · {emp.riskTier}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={
                            emp.attrition === 'Yes'
                              ? 'font-semibold text-[#D95D00] dark:text-[#F58220]'
                              : 'text-zinc-600 dark:text-zinc-400'
                          }
                        >
                          {emp.attrition === 'Yes' ? 'Yes (Left)' : 'No (Active)'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          <span>
            Page {safePage} of {totalPages} · Showing {pagedRows.length} of {tableRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
