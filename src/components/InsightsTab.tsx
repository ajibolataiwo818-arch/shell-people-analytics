import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import { computeInsightsAndActions, formatGbp } from '../utils/analytics';

interface InsightsTabProps {
  employees: ScoredEmployee[];
  onSelectEmployee: (emp: ScoredEmployee) => void;
}

export function InsightsTab({ employees, onSelectEmployee }: InsightsTabProps) {
  const { findings, watchlist, actions } = useMemo(
    () => computeInsightsAndActions(employees),
    [employees]
  );

  const renderSeverityIcon = (severity: 'critical' | 'warning' | 'neutral' | 'positive') => {
    if (severity === 'critical') {
      return <ShieldAlert className="h-4 w-4 text-[#D95D00] dark:text-[#F58220] shrink-0" aria-hidden="true" />;
    }
    if (severity === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-[#FFC800] shrink-0" aria-hidden="true" />;
    }
    if (severity === 'positive') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />;
    }
    return <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />;
  };

  return (
    <div className="space-y-6">
      {/* 1. Auto-Generated Findings */}
      <section aria-labelledby="findings-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="findings-heading"
              className="font-display text-lg font-bold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
            >
              Auto-Generated Workforce Findings
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Computed dynamically from the {employees.length} employees in your current filter scope
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {findings.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {renderSeverityIcon(item.severity)}
                    <span>{item.category}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                    {item.metric}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold leading-snug text-[#111113] dark:text-[#FAFAFA]">
                  {item.headline}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Transparent Flight-Risk Scoring Rule + Top-10 Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Transparent Scoring Rule */}
        <section
          aria-labelledby="scoring-rule-heading"
          className="lg:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5"
        >
          <h2
            id="scoring-rule-heading"
            className="font-display text-base font-bold text-[#111113] dark:text-[#FAFAFA]"
          >
            Transparent Flight-Risk Scoring Rule
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Every active employee is scored from 0 to 100 using five auditable HR risk signals.
            Scores ≥ 60 are flagged as High Risk; 40–59 as Elevated.
          </p>

          <dl className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            <div className="py-2.5 flex justify-between gap-3">
              <div>
                <dt className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  1. Promotion Stagnation
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ≥5 yrs (+25) · 3–4 yrs (+15) · 2 yrs (+8)
                </dd>
              </div>
              <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FFC800] shrink-0">
                max 25
              </span>
            </div>

            <div className="py-2.5 flex justify-between gap-3">
              <div>
                <dt className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  2. Business Travel Load
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Travel Frequently (+20) · Travel Rarely (+8)
                </dd>
              </div>
              <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FFC800] shrink-0">
                max 20
              </span>
            </div>

            <div className="py-2.5 flex justify-between gap-3">
              <div>
                <dt className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  3. Pay vs Level Median
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ≥15% below L1–L5 median (+20) · 5–14% below (+10)
                </dd>
              </div>
              <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FFC800] shrink-0">
                max 20
              </span>
            </div>

            <div className="py-2.5 flex justify-between gap-3">
              <div>
                <dt className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  4. Tenure & Manager Churn
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ≤2y tenure or 5y+ in role w/o promo (+12) · ≤1y manager (+8)
                </dd>
              </div>
              <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FFC800] shrink-0">
                max 20
              </span>
            </div>

            <div className="py-2.5 flex justify-between gap-3">
              <div>
                <dt className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
                  5. Commute Distance
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                  ≥30 km (+15) · 20–29 km (+10) · 10–19 km (+4)
                </dd>
              </div>
              <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FFC800] shrink-0">
                max 15
              </span>
            </div>
          </dl>
        </section>

        {/* Top-10 Flight-Risk Watchlist */}
        <section
          aria-labelledby="watchlist-heading"
          className="lg:col-span-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] overflow-hidden"
        >
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2
                id="watchlist-heading"
                className="font-display text-base font-bold text-[#111113] dark:text-[#FAFAFA]"
              >
                Top-10 Active Flight-Risk Watchlist
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Highest-risk active employees in current filter scope · Click a row to audit full score
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1A1A20] text-zinc-600 dark:text-zinc-300">
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Employee</th>
                  <th className="py-2.5 px-3 font-semibold">Dept & Site</th>
                  <th className="py-2.5 px-3 font-semibold">Primary Risk Drivers</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Income</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {watchlist.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 px-4 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No active employees in the current filter selection.
                    </td>
                  </tr>
                ) : (
                  watchlist.map((emp, idx) => {
                    const topDrivers = [...emp.riskDrivers]
                      .filter((d) => d.points > 0)
                      .sort((a, b) => b.points - a.points)
                      .slice(0, 3)
                      .map((d) => `${d.label.split(' ')[0]} (+${d.points})`)
                      .join(' · ');

                    const scoreClass =
                      emp.riskTier === 'High'
                        ? 'text-[#D95D00] dark:text-[#F58220] font-bold'
                        : emp.riskTier === 'Elevated'
                        ? 'text-amber-700 dark:text-[#FFC800] font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 font-semibold';

                    return (
                      <tr
                        key={emp.employeeId}
                        onClick={() => onSelectEmployee(emp)}
                        className="h-[44px] hover:bg-zinc-50 dark:hover:bg-[#1C1C22] transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-medium text-[#111113] dark:text-[#FAFAFA]">
                            {emp.fullName}{' '}
                            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                              ({emp.employeeId})
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {emp.jobTitle} · L{emp.jobLevel}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          <div>{emp.department}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {emp.location}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300 min-w-[200px]">
                          {topDrivers || 'Baseline tenure factors'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#111113] dark:text-[#FAFAFA]">
                          {formatGbp(emp.monthlyIncomeGbp)}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${scoreClass}`}>
                          {emp.flightRiskScore}/100 ({emp.riskTier})
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 3. Recommended HR Actions */}
      <section aria-labelledby="actions-heading">
        <div className="mb-3">
          <h2
            id="actions-heading"
            className="font-display text-lg font-bold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
          >
            Recommended Retention Actions
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Prioritised interventions sized to your filtered active workforce
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((act) => {
            const priorityClass =
              act.priority === 'Immediate'
                ? 'text-[#D95D00] dark:text-[#F58220]'
                : act.priority === 'Near-Term'
                ? 'text-amber-700 dark:text-[#FFC800]'
                : 'text-zinc-600 dark:text-zinc-400';

            return (
              <div
                key={act.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className={`font-semibold ${priorityClass}`}>
                      Priority: {act.priority}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      {act.affectedCount} staff impacted
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#111113] dark:text-[#FAFAFA]">
                    {act.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Cohort: {act.targetCohort}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {act.rationale}
                  </p>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 text-xs text-[#111113] dark:text-[#FAFAFA]">
                  <span className="font-semibold">Next step:</span> {act.actionStep}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
