import { RotateCcw } from 'lucide-react';
import type { FilterState } from '../types/employee';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    departments: string[];
    locations: string[];
    employmentTypes: string[];
    genders: string[];
  };
  filteredCount: number;
  totalCount: number;
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  options,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const isFiltered =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1C1C22] px-3 py-2 text-xs font-medium text-[#111113] dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#FFC800] min-h-[40px] cursor-pointer';

  const labelClass = 'block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1';

  return (
    <section
      aria-label="Workforce Filters"
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141418] p-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label htmlFor="filter-department" className={labelClass}>
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Departments ({options.departments.length})</option>
            {options.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className={labelClass}>
            Location
          </label>
          <select
            id="filter-location"
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Locations ({options.locations.length})</option>
            {options.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-employment-type" className={labelClass}>
            Employment Type
          </label>
          <select
            id="filter-employment-type"
            value={filters.employmentType}
            onChange={(e) => onChange({ ...filters, employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-attrition" className={labelClass}>
            Attrition
          </label>
          <select
            id="filter-attrition"
            value={filters.attrition}
            onChange={(e) =>
              onChange({ ...filters, attrition: e.target.value as FilterState['attrition'] })
            }
            className={selectClass}
          >
            <option value="All">All Statuses</option>
            <option value="No">Active Only (No)</option>
            <option value="Yes">Attrited Only (Yes)</option>
          </select>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 min-h-[40px]">
          <span className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
            <strong className="font-semibold text-[#111113] dark:text-[#FAFAFA]">
              {filteredCount}
            </strong>{' '}
            of {totalCount} staff
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={!isFiltered}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-[#111113] dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </section>
  );
}
