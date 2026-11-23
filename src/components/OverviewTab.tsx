import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { ScoredEmployee } from '../types/employee';
import {
  computeOverviewMetrics,
  formatGbp,
  formatNumber,
  formatPct,
} from '../utils/analytics';
import { ChartCard, getChartThemeColors } from './ChartCard';
import { KpiCard } from './KpiCard';

interface OverviewTabProps {
  employees: ScoredEmployee[];
  isDark: boolean;
}

export function OverviewTab({ employees, isDark }: OverviewTabProps) {
  const metrics = useMemo(() => computeOverviewMetrics(employees), [employees]);
  const theme = useMemo(() => getChartThemeColors(isDark), [isDark]);

  const deptConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byDepartment.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: metrics.byDepartment.map((d) => d.label),
        datasets: [
          {
            label: 'Active',
            data: metrics.byDepartment.map((d) => d.active),
            backgroundColor: theme.yellow,
            borderRadius: 3,
          },
          {
            label: 'Attrited',
            data: metrics.byDepartment.map((d) => d.attrited),
            backgroundColor: theme.orange,
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
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
                const row = metrics.byDepartment[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.textSecondary, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textPrimary, font: { size: 11 } },
          },
        },
      },
    };
  }, [metrics.byDepartment, theme]);

  const locationConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byLocation.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: metrics.byLocation.map((d) => d.label),
        datasets: [
          {
            label: 'Active',
            data: metrics.byLocation.map((d) => d.active),
            backgroundColor: isDark ? '#FAFAFA' : '#18181B',
            borderRadius: 3,
          },
          {
            label: 'Attrited',
            data: metrics.byLocation.map((d) => d.attrited),
            backgroundColor: theme.orange,
            borderRadius: 3,
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
                const row = metrics.byLocation[idx];
                return `Total: ${row.total} · Attrition: ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.textSecondary, font: { size: 11 }, maxRotation: 30 },
          },
          y: {
            stacked: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.textSecondary, font: { size: 11 }, precision: 0 },
          },
        },
      },
    };
  }, [metrics.byLocation, theme, isDark]);

  const genderConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byGender.length === 0) return null;
    const palette = [theme.yellow, isDark ? '#FAFAFA' : '#18181B', theme.orange];
    return {
      type: 'doughnut',
      data: {
        labels: metrics.byGender.map((g) => g.label),
        datasets: [
          {
            data: metrics.byGender.map((g) => g.total),
            backgroundColor: metrics.byGender.map((_, idx) => palette[idx % palette.length]),
            borderColor: theme.surfaceBg,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.textPrimary,
              padding: 16,
              boxWidth: 12,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => {
                const row = metrics.byGender[item.dataIndex];
                const share =
                  metrics.headcount > 0 ? ((row.total / metrics.headcount) * 100).toFixed(1) : '0.0';
                return ` ${row.label}: ${row.total} (${share}%) · Attrition ${row.attritionRate.toFixed(1)}%`;
              },
            },
          },
        },
      },
    };
  }, [metrics.byGender, metrics.headcount, theme, isDark]);

  const empTypeConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.byEmploymentType.length === 0) return null;
    const palette = [isDark ? '#FAFAFA' : '#18181B', theme.yellow, theme.orange];
    return {
      type: 'doughnut',
      data: {
        labels: metrics.byEmploymentType.map((t) => t.label),
        datasets: [
          {
            data: metrics.byEmploymentType.map((t) => t.total),
            backgroundColor: metrics.byEmploymentType.map(
              (_, idx) => palette[idx % palette.length]
            ),
            borderColor: theme.surfaceBg,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.textPrimary,
              padding: 16,
              boxWidth: 12,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => {
                const row = metrics.byEmploymentType[item.dataIndex];
                const share =
                  metrics.headcount > 0 ? ((row.total / metrics.headcount) * 100).toFixed(1) : '0.0';
                return ` ${row.label}: ${row.total} (${share}%) · Avg pay ${formatGbp(row.avgIncome)}`;
              },
            },
          },
        },
      },
    };
  }, [metrics.byEmploymentType, metrics.headcount, theme, isDark]);

  const hiringTrendConfig = useMemo<ChartConfiguration | null>(() => {
    if (metrics.hiringTrend.length === 0) return null;
    return {
      type: 'line',
      data: {
        labels: metrics.hiringTrend.map((h) => h.year),
        datasets: [
          {
            label: 'Total Hires',
            data: metrics.hiringTrend.map((h) => h.total),
            borderColor: isDark ? '#FFC800' : '#111113',
            backgroundColor: isDark ? 'rgba(255, 200, 0, 0.14)' : 'rgba(255, 200, 0, 0.25)',
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            pointBackgroundColor: theme.yellow,
            pointBorderColor: isDark ? '#111113' : '#111113',
            borderWidth: 2,
          },
          {
            label: 'Subsequently Attrited',
            data: metrics.hiringTrend.map((h) => h.attrited),
            borderColor: theme.orange,
            backgroundColor: 'transparent',
            tension: 0.25,
            pointRadius: 3,
            pointBackgroundColor: theme.orange,
            borderWidth: 2,
            borderDash: [4, 4],
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
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textSecondary, font: { size: 11 }, maxRotation: 45 },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.textSecondary, font: { size: 11 }, precision: 0 },
          },
        },
      },
    };
  }, [metrics.hiringTrend, theme, isDark]);

  return (
    <div className="space-y-6">
      {/* 5 Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Headcount"
          value={formatNumber(metrics.headcount)}
          detail={`${metrics.activeCount} active · ${metrics.attritedCount} attrited`}
          accent="yellow"
        />
        <KpiCard
          label="Attrition Rate"
          value={formatPct(metrics.attritionRate)}
          detail={`${metrics.attritedCount} departed employees`}
          accent="orange"
        />
        <KpiCard
          label="Active Employees"
          value={formatNumber(metrics.activeCount)}
          detail={`${formatPct(metrics.activeShare)} retention in view`}
        />
        <KpiCard
          label="Average Income"
          value={formatGbp(metrics.avgIncome)}
          detail={`Median ${formatGbp(metrics.medianIncome)} / month`}
        />
        <KpiCard
          label="Monthly Payroll"
          value={formatGbp(metrics.activeMonthlyPayroll)}
          detail={
            metrics.attritedCount > 0
              ? `Active run-rate · ${formatGbp(metrics.totalMonthlyPayroll)} incl. leavers`
              : 'Active monthly payroll run-rate'
          }
        />
      </div>

      {/* Row 1: Department + Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs attrited workforce sorted by department size"
          config={deptConfig}
          heightClass="h-[340px]"
          isEmpty={employees.length === 0}
        />
        <ChartCard
          title="Workforce by UK Location"
          subtitle="Site distribution across UK operations and offices"
          config={locationConfig}
          heightClass="h-[340px]"
          isEmpty={employees.length === 0}
        />
      </div>

      {/* Row 2: Gender + Employment Type + Hiring Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        <ChartCard
          title="Gender Split"
          subtitle="Share of filtered workforce"
          config={genderConfig}
          heightClass="h-[260px]"
          isEmpty={employees.length === 0}
          className="lg:col-span-3"
        />
        <ChartCard
          title="Employment Type"
          subtitle="Contract & working pattern mix"
          config={empTypeConfig}
          heightClass="h-[260px]"
          isEmpty={employees.length === 0}
          className="lg:col-span-3"
        />
        <ChartCard
          title="Hiring Trend Over Time"
          subtitle="Annual intake by hire year with attrited cohort overlay"
          config={hiringTrendConfig}
          heightClass="h-[260px]"
          isEmpty={employees.length === 0}
          className="md:col-span-2 lg:col-span-6"
        />
      </div>
    </div>
  );
}
