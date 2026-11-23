import { X } from 'lucide-react';
import type { ScoredEmployee } from '../types/employee';
import { formatGbp, formatTravelLabel } from '../utils/analytics';

interface EmployeeModalProps {
  employee: ScoredEmployee | null;
  onClose: () => void;
}

export function EmployeeModal({ employee, onClose }: EmployeeModalProps) {
  if (!employee) return null;

  const riskTextClass =
    employee.riskTier === 'High'
      ? 'text-[#D95D00] dark:text-[#F58220]'
      : employee.riskTier === 'Elevated'
      ? 'text-amber-700 dark:text-[#FFC800]'
      : 'text-zinc-700 dark:text-zinc-300';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emp-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {employee.employeeId} · {employee.location}
            </div>
            <h2
              id="emp-modal-title"
              className="mt-1 font-display text-xl font-bold text-[#111113] dark:text-[#FAFAFA]"
            >
              {employee.fullName}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close employee detail"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Key Attributes Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-zinc-50 dark:bg-[#1C1C22] p-3">
            <div className="text-zinc-500 dark:text-zinc-400">Monthly Income</div>
            <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
              {formatGbp(employee.monthlyIncomeGbp)}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              L{employee.jobLevel} median: {formatGbp(employee.levelMedianIncome)}
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-[#1C1C22] p-3">
            <div className="text-zinc-500 dark:text-zinc-400">Tenure & Role</div>
            <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
              {employee.yearsAtCompany} yrs
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              {employee.yearsInCurrentRole}y role · {employee.yearsWithCurrManager}y mgr
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-[#1C1C22] p-3">
            <div className="text-zinc-500 dark:text-zinc-400">Flight-Risk Score</div>
            <div className={`mt-1 font-mono text-sm font-bold tabular-nums ${riskTextClass}`}>
              {employee.flightRiskScore} / 100 ({employee.riskTier})
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Status: {employee.attrition === 'Yes' ? 'Attrited (Left)' : 'Active'}
            </div>
          </div>
        </div>

        {/* Demographics & Employment */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Employment Type</span>
            <span className="font-medium text-[#111113] dark:text-[#FAFAFA]">
              {employee.employmentType}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Job Level</span>
            <span className="font-mono font-medium tabular-nums text-[#111113] dark:text-[#FAFAFA]">
              Level {employee.jobLevel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Gender / Age</span>
            <span className="font-medium tabular-nums text-[#111113] dark:text-[#FAFAFA]">
              {employee.gender} · {employee.age}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Education</span>
            <span className="font-medium text-[#111113] dark:text-[#FAFAFA]">
              {employee.education}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Business Travel</span>
            <span className="font-medium text-[#111113] dark:text-[#FAFAFA]">
              {formatTravelLabel(employee.businessTravel)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Hire Date</span>
            <span className="font-mono font-medium tabular-nums text-[#111113] dark:text-[#FAFAFA]">
              {employee.hireDate}
            </span>
          </div>
        </div>

        {/* Transparent Score Breakdown */}
        <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h3 className="text-xs font-semibold text-[#111113] dark:text-[#FAFAFA] mb-3">
            Flight-Risk Factor Breakdown
          </h3>
          <div className="space-y-2.5">
            {employee.riskDrivers.map((driver) => {
              const pct = driver.maxPoints > 0 ? (driver.points / driver.maxPoints) * 100 : 0;
              return (
                <div key={driver.label} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[#111113] dark:text-[#FAFAFA]">
                      {driver.label}{' '}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        — {driver.detail}
                      </span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#111113] dark:text-[#FAFAFA]">
                      +{driver.points}/{driver.maxPoints}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 75
                          ? 'bg-[#F58220]'
                          : pct >= 40
                          ? 'bg-[#FFC800]'
                          : 'bg-zinc-400 dark:bg-zinc-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
