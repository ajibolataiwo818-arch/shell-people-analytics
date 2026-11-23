import { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip
);

export interface ChartThemeColors {
  textPrimary: string;
  textSecondary: string;
  gridColor: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  surfaceBg: string;
  yellow: string;
  orange: string;
  charcoal: string;
  slateMuted: string;
}

export function getChartThemeColors(isDark: boolean): ChartThemeColors {
  return isDark
    ? {
        textPrimary: '#FAFAFA',
        textSecondary: '#A1A1AA',
        gridColor: 'rgba(255, 255, 255, 0.08)',
        tooltipBg: '#18181B',
        tooltipText: '#FAFAFA',
        tooltipBorder: '#3F3F46',
        surfaceBg: '#141418',
        yellow: '#FFC800',
        orange: '#F58220',
        charcoal: '#E4E4E7',
        slateMuted: '#52525B',
      }
    : {
        textPrimary: '#111113',
        textSecondary: '#52525B',
        gridColor: 'rgba(17, 17, 19, 0.08)',
        tooltipBg: '#111113',
        tooltipText: '#FFFFFF',
        tooltipBorder: '#27272A',
        surfaceBg: '#FFFFFF',
        yellow: '#FFC800',
        orange: '#F58220',
        charcoal: '#18181B',
        slateMuted: '#D4D4D8',
      };
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  config: ChartConfiguration | null;
  heightClass?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  config,
  heightClass = 'h-[280px]',
  isEmpty = false,
  emptyMessage = 'No data available for current filter selection.',
  className = '',
}: ChartCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config || isEmpty) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config, isEmpty]);

  return (
    <section
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5 flex flex-col ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div
          className={`${heightClass} flex items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 text-center px-4`}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </section>
  );
}
