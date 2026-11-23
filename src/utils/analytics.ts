import type {
  ActionRecommendation,
  Employee,
  FilterState,
  InsightItem,
  RiskDriver,
  RiskTier,
  ScoredEmployee,
} from '../types/employee';

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(n));
}

export function formatPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatTravelLabel(raw: string): string {
  if (raw === 'Travel_Frequently') return 'Travel Frequently';
  if (raw === 'Travel_Rarely') return 'Travel Rarely';
  if (raw === 'Non-Travel') return 'Non-Travel';
  return raw.replace(/_/g, ' ');
}

/**
 * Transparent 100-point Flight-Risk Scoring Model
 * Benchmarked against peer Job Level median income across the full dataset:
 *  1. Promotion Stagnation (max 25): >=5y (+25), 3-4y (+15), 2y (+8)
 *  2. Business Travel (max 20): Travel_Frequently (+20), Travel_Rarely (+8), Non-Travel (+0)
 *  3. Commute Distance (max 15): >=30 km (+15), 20-29 km (+10), 10-19 km (+4)
 *  4. Pay Gap vs Peer Level Median (max 20): >=15% below (+20), 5-14.9% below (+10)
 *  5. Early Tenure / Role & Manager Churn (max 20):
 *     - YearsAtCompany <= 2 (+12) OR (YearsInCurrentRole >= 5 && YearsSinceLastPromotion >= 3) (+12)
 *     - YearsWithCurrManager <= 1 (+8)
 *     - Capped at 20 points
 */
export function scoreEmployees(employees: Employee[]): ScoredEmployee[] {
  const incomesByLevel = new Map<number, number[]>();
  for (const emp of employees) {
    const arr = incomesByLevel.get(emp.jobLevel) ?? [];
    arr.push(emp.monthlyIncomeGbp);
    incomesByLevel.set(emp.jobLevel, arr);
  }

  const levelMedians = new Map<number, number>();
  incomesByLevel.forEach((vals, lvl) => {
    levelMedians.set(lvl, median(vals));
  });

  const overallMedian = median(employees.map((e) => e.monthlyIncomeGbp));

  return employees.map((emp) => {
    const levelMedianIncome = levelMedians.get(emp.jobLevel) ?? overallMedian;
    const payGapPct =
      levelMedianIncome > 0
        ? ((levelMedianIncome - emp.monthlyIncomeGbp) / levelMedianIncome) * 100
        : 0;

    const drivers: RiskDriver[] = [];

    // 1. Promotion stagnation (max 25)
    let promoPts = 0;
    if (emp.yearsSinceLastPromotion >= 5) promoPts = 25;
    else if (emp.yearsSinceLastPromotion >= 3) promoPts = 15;
    else if (emp.yearsSinceLastPromotion >= 2) promoPts = 8;
    drivers.push({
      label: 'Promotion Stagnation',
      points: promoPts,
      maxPoints: 25,
      detail: `${emp.yearsSinceLastPromotion} yrs since last promotion`,
    });

    // 2. Business Travel (max 20)
    let travelPts = 0;
    if (emp.businessTravel === 'Travel_Frequently') travelPts = 20;
    else if (emp.businessTravel === 'Travel_Rarely') travelPts = 8;
    drivers.push({
      label: 'Travel Intensity',
      points: travelPts,
      maxPoints: 20,
      detail: formatTravelLabel(emp.businessTravel),
    });

    // 3. Commute Distance (max 15)
    let commutePts = 0;
    if (emp.distanceFromHomeKm >= 30) commutePts = 15;
    else if (emp.distanceFromHomeKm >= 20) commutePts = 10;
    else if (emp.distanceFromHomeKm >= 10) commutePts = 4;
    drivers.push({
      label: 'Commute Distance',
      points: commutePts,
      maxPoints: 15,
      detail: `${emp.distanceFromHomeKm} km one-way`,
    });

    // 4. Compensation Competitiveness vs Peer Level Median (max 20)
    let payPts = 0;
    if (payGapPct >= 15) payPts = 20;
    else if (payGapPct >= 5) payPts = 10;
    drivers.push({
      label: 'Pay vs Level Median',
      points: payPts,
      maxPoints: 20,
      detail:
        payGapPct > 0
          ? `${payGapPct.toFixed(1)}% below L${emp.jobLevel} median (${formatGbp(levelMedianIncome)})`
          : `${Math.abs(payGapPct).toFixed(1)}% at/above L${emp.jobLevel} median`,
    });

    // 5. Tenure / Role Stagnation & Manager Stability (max 20)
    let mobilityPts = 0;
    const mobilityNotes: string[] = [];
    if (emp.yearsAtCompany <= 2) {
      mobilityPts += 12;
      mobilityNotes.push(`early tenure (${emp.yearsAtCompany}y)`);
    } else if (emp.yearsInCurrentRole >= 5 && emp.yearsSinceLastPromotion >= 3) {
      mobilityPts += 12;
      mobilityNotes.push(`${emp.yearsInCurrentRole}y in role without promo`);
    }
    if (emp.yearsWithCurrManager <= 1) {
      mobilityPts += 8;
      mobilityNotes.push(`new manager (${emp.yearsWithCurrManager}y)`);
    }
    mobilityPts = Math.min(20, mobilityPts);
    drivers.push({
      label: 'Tenure & Manager Stability',
      points: mobilityPts,
      maxPoints: 20,
      detail:
        mobilityNotes.length > 0
          ? mobilityNotes.join(' · ')
          : `${emp.yearsAtCompany}y tenure · ${emp.yearsWithCurrManager}y w/ manager`,
    });

    const flightRiskScore = Math.min(
      100,
      drivers.reduce((sum, d) => sum + d.points, 0)
    );

    let riskTier: RiskTier = 'Low';
    if (flightRiskScore >= 60) riskTier = 'High';
    else if (flightRiskScore >= 40) riskTier = 'Elevated';
    else if (flightRiskScore >= 20) riskTier = 'Moderate';

    return {
      ...emp,
      flightRiskScore,
      riskTier,
      riskDrivers: drivers,
      levelMedianIncome,
      payGapPct,
    };
  });
}

export function applyFilters(employees: ScoredEmployee[], filters: FilterState): ScoredEmployee[] {
  return employees.filter((e) => {
    if (filters.department !== 'All' && e.department !== filters.department) return false;
    if (filters.location !== 'All' && e.location !== filters.location) return false;
    if (filters.employmentType !== 'All' && e.employmentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && e.gender !== filters.gender) return false;
    if (filters.attrition !== 'All' && e.attrition !== filters.attrition) return false;
    return true;
  });
}

export function getFilterOptions(employees: ScoredEmployee[]) {
  const uniqSorted = (arr: string[]) => Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  return {
    departments: uniqSorted(employees.map((e) => e.department)),
    locations: uniqSorted(employees.map((e) => e.location)),
    employmentTypes: uniqSorted(employees.map((e) => e.employmentType)),
    genders: uniqSorted(employees.map((e) => e.gender)),
  };
}

export interface GroupAttritionMetric {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupAttrition(
  employees: ScoredEmployee[],
  keyFn: (e: ScoredEmployee) => string,
  orderedLabels?: string[]
): GroupAttritionMetric[] {
  const map = new Map<string, ScoredEmployee[]>();
  for (const e of employees) {
    const key = keyFn(e);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }

  const keys = orderedLabels
    ? orderedLabels.filter((k) => map.has(k)).concat(Array.from(map.keys()).filter((k) => !orderedLabels.includes(k)))
    : Array.from(map.keys());

  return keys.map((label) => {
    const list = map.get(label) ?? [];
    const attrited = list.filter((e) => e.attrition === 'Yes').length;
    const active = list.length - attrited;
    return {
      label,
      total: list.length,
      active,
      attrited,
      attritionRate: list.length > 0 ? (attrited / list.length) * 100 : 0,
      avgIncome: average(list.map((e) => e.monthlyIncomeGbp)),
    };
  });
}

export function computeOverviewMetrics(filtered: ScoredEmployee[]) {
  const headcount = filtered.length;
  const attrited = filtered.filter((e) => e.attrition === 'Yes');
  const active = filtered.filter((e) => e.attrition === 'No');
  const attritionRate = headcount > 0 ? attrited.length / headcount : 0;
  const activeShare = headcount > 0 ? active.length / headcount : 0;
  const avgIncome = average(filtered.map((e) => e.monthlyIncomeGbp));
  const medianIncome = median(filtered.map((e) => e.monthlyIncomeGbp));
  const activeMonthlyPayroll = active.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);
  const totalMonthlyPayroll = filtered.reduce((sum, e) => sum + e.monthlyIncomeGbp, 0);

  const byDepartment = groupAttrition(filtered, (e) => e.department).sort((a, b) => b.total - a.total);
  const byLocation = groupAttrition(filtered, (e) => e.location).sort((a, b) => b.total - a.total);
  const byGender = groupAttrition(filtered, (e) => e.gender).sort((a, b) => b.total - a.total);
  const byEmploymentType = groupAttrition(filtered, (e) => e.employmentType).sort((a, b) => b.total - a.total);

  // Hiring trend by year
  const yearMap = new Map<number, { total: number; active: number; attrited: number }>();
  for (const e of filtered) {
    const entry = yearMap.get(e.hireYear) ?? { total: 0, active: 0, attrited: 0 };
    entry.total += 1;
    if (e.attrition === 'Yes') entry.attrited += 1;
    else entry.active += 1;
    yearMap.set(e.hireYear, entry);
  }
  const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
  const hiringTrend = years.map((year) => ({
    year: String(year),
    ...yearMap.get(year)!,
  }));

  return {
    headcount,
    activeCount: active.length,
    attritedCount: attrited.length,
    attritionRate,
    activeShare,
    avgIncome,
    medianIncome,
    activeMonthlyPayroll,
    totalMonthlyPayroll,
    byDepartment,
    byLocation,
    byGender,
    byEmploymentType,
    hiringTrend,
  };
}

export function computeDeepDiveMetrics(filtered: ScoredEmployee[]) {
  const active = filtered.filter((e) => e.attrition === 'No');
  const avgTenure = average(filtered.map((e) => e.yearsAtCompany));
  const medianTenure = median(filtered.map((e) => e.yearsAtCompany));
  const femaleCount = filtered.filter((e) => e.gender.toLowerCase() === 'female').length;
  const femaleShare = filtered.length > 0 ? femaleCount / filtered.length : 0;
  const nonFullTimeCount = filtered.filter((e) => e.employmentType !== 'Full-Time').length;
  const nonFullTimeShare = filtered.length > 0 ? nonFullTimeCount / filtered.length : 0;
  const avgYearsSincePromo = average(filtered.map((e) => e.yearsSinceLastPromotion));
  const overduePromoCount = filtered.filter((e) => e.yearsSinceLastPromotion >= 4).length;
  const highRiskActive = active.filter((e) => e.riskTier === 'High');

  const ageBandOrder = ['21–29', '30–39', '40–49', '50–60'];
  const byAgeBand = groupAttrition(
    filtered,
    (e) => {
      if (e.age < 30) return '21–29';
      if (e.age < 40) return '30–39';
      if (e.age < 50) return '40–49';
      return '50–60';
    },
    ageBandOrder
  );

  const tenureBandOrder = ['0–2 yrs', '3–5 yrs', '6–10 yrs', '11–20 yrs', '21+ yrs'];
  const byTenureBand = groupAttrition(
    filtered,
    (e) => {
      if (e.yearsAtCompany <= 2) return '0–2 yrs';
      if (e.yearsAtCompany <= 5) return '3–5 yrs';
      if (e.yearsAtCompany <= 10) return '6–10 yrs';
      if (e.yearsAtCompany <= 20) return '11–20 yrs';
      return '21+ yrs';
    },
    tenureBandOrder
  );

  const levelOrder = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const byLevel = groupAttrition(filtered, (e) => `Level ${e.jobLevel}`, levelOrder);

  const byDepartmentIncome = groupAttrition(filtered, (e) => e.department).sort(
    (a, b) => b.avgIncome - a.avgIncome
  );

  const eduOrder = ['Below College', 'College', "Bachelor's", "Master's", 'Doctorate'];
  const byEducation = groupAttrition(filtered, (e) => e.education, eduOrder);

  const travelOrder = ['Non-Travel', 'Travel Rarely', 'Travel Frequently'];
  const byTravel = groupAttrition(filtered, (e) => formatTravelLabel(e.businessTravel), travelOrder);

  return {
    avgTenure,
    medianTenure,
    femaleCount,
    femaleShare,
    nonFullTimeCount,
    nonFullTimeShare,
    avgYearsSincePromo,
    overduePromoCount,
    highRiskActiveCount: highRiskActive.length,
    highRiskShareOfActive: active.length > 0 ? highRiskActive.length / active.length : 0,
    byAgeBand,
    byTenureBand,
    byLevel,
    byDepartmentIncome,
    byEducation,
    byTravel,
  };
}

export function computeInsightsAndActions(filtered: ScoredEmployee[]): {
  findings: InsightItem[];
  watchlist: ScoredEmployee[];
  actions: ActionRecommendation[];
} {
  if (filtered.length === 0) {
    return {
      findings: [
        {
          id: 'empty',
          category: 'Filter Scope',
          severity: 'neutral',
          headline: 'No employees match the active filters',
          detail: 'Adjust or reset one or more shared filters above to generate workforce findings.',
          metric: '0 records',
        },
      ],
      watchlist: [],
      actions: [],
    };
  }

  const active = filtered.filter((e) => e.attrition === 'No');
  const attrited = filtered.filter((e) => e.attrition === 'Yes');
  const baseAttritionRate = (attrited.length / filtered.length) * 100;

  const findings: InsightItem[] = [];

  // 1. Department attrition hotspot (require >= 3 employees for stability, or largest available)
  const depts = groupAttrition(filtered, (e) => e.department).sort(
    (a, b) => b.attritionRate - a.attritionRate || b.attrited - a.attrited
  );
  const meaningfulDepts = depts.filter((d) => d.total >= 3);
  const topDept = (meaningfulDepts.length > 0 ? meaningfulDepts : depts)[0];
  if (topDept) {
    if (attrited.length === 0) {
      findings.push({
        id: 'dept-retention',
        category: 'Retention Stability',
        severity: 'positive',
        headline: `Zero recorded attrition across ${filtered.length} filtered employees`,
        detail: `${topDept.label} represents the largest cohort in view (${topDept.total} staff) with 100% retention.`,
        metric: '0.0% attrition',
      });
    } else {
      const delta = topDept.attritionRate - baseAttritionRate;
      findings.push({
        id: 'dept-hotspot',
        category: 'Department Hotspot',
        severity: topDept.attritionRate >= baseAttritionRate + 5 ? 'critical' : 'warning',
        headline: `${topDept.label} leads attrition at ${topDept.attritionRate.toFixed(1)}%`,
        detail: `${topDept.attrited} of ${topDept.total} employees departed, running ${
          delta >= 0 ? `+${delta.toFixed(1)} pp above` : `${Math.abs(delta).toFixed(1)} pp below`
        } the filtered average of ${baseAttritionRate.toFixed(1)}%.`,
        metric: `${topDept.attrited}/${topDept.total} leavers`,
      });
    }
  }

  // 2. Location concentration / risk
  const locs = groupAttrition(filtered, (e) => e.location).sort(
    (a, b) => b.attritionRate - a.attritionRate || b.attrited - a.attrited
  );
  const meaningfulLocs = locs.filter((l) => l.total >= 3);
  const topLoc = (meaningfulLocs.length > 0 ? meaningfulLocs : locs)[0];
  if (topLoc && locs.length > 1) {
    findings.push({
      id: 'location-signal',
      category: 'Site Dynamics',
      severity: topLoc.attritionRate >= 22 ? 'warning' : 'neutral',
      headline: `${topLoc.label} records ${topLoc.attritionRate.toFixed(1)}% attrition across ${topLoc.total} staff`,
      detail: `Average site pay is ${formatGbp(topLoc.avgIncome)}/mo with ${topLoc.active} active employees remaining on site.`,
      metric: `${topLoc.label}`,
    });
  }

  // 3. Pay & Promotion comparison (Leavers vs Active)
  if (attrited.length > 0 && active.length > 0) {
    const activeAvgPay = average(active.map((e) => e.monthlyIncomeGbp));
    const leaverAvgPay = average(attrited.map((e) => e.monthlyIncomeGbp));
    const payDiffPct = activeAvgPay > 0 ? ((leaverAvgPay - activeAvgPay) / activeAvgPay) * 100 : 0;

    const activeAvgPromo = average(active.map((e) => e.yearsSinceLastPromotion));
    const leaverAvgPromo = average(attrited.map((e) => e.yearsSinceLastPromotion));

    findings.push({
      id: 'comp-promo-gap',
      category: 'Compensation & Progression',
      severity: payDiffPct <= -5 || leaverAvgPromo > activeAvgPromo + 0.5 ? 'warning' : 'neutral',
      headline:
        payDiffPct < 0
          ? `Leavers earned ${Math.abs(payDiffPct).toFixed(1)}% less per month than active staff`
          : `Leavers averaged ${leaverAvgPromo.toFixed(1)} yrs since promotion vs ${activeAvgPromo.toFixed(1)} yrs for active staff`,
      detail: `Active mean pay is ${formatGbp(activeAvgPay)}/mo vs ${formatGbp(leaverAvgPay)}/mo among leavers; promotion lag averages ${leaverAvgPromo.toFixed(1)} yrs for leavers.`,
      metric: `${formatGbp(leaverAvgPay)} vs ${formatGbp(activeAvgPay)}`,
    });
  } else {
    const underpaidActive = active.filter((e) => e.payGapPct >= 10);
    findings.push({
      id: 'comp-equity',
      category: 'Pay Positioning',
      severity: underpaidActive.length > 0 ? 'warning' : 'positive',
      headline: `${underpaidActive.length} active employees sit 10%+ below peer Job Level median`,
      detail: `Filtered cohort mean pay is ${formatGbp(average(filtered.map((e) => e.monthlyIncomeGbp)))}/mo across ${filtered.length} roles.`,
      metric: `${underpaidActive.length} below band`,
    });
  }

  // 4. Business Travel & Commute burden
  const freqTravel = filtered.filter((e) => e.businessTravel === 'Travel_Frequently');
  const nonTravel = filtered.filter((e) => e.businessTravel === 'Non-Travel');
  if (freqTravel.length > 0) {
    const freqAttrRate = (freqTravel.filter((e) => e.attrition === 'Yes').length / freqTravel.length) * 100;
    const nonAttrRate =
      nonTravel.length > 0
        ? (nonTravel.filter((e) => e.attrition === 'Yes').length / nonTravel.length) * 100
        : baseAttritionRate;
    findings.push({
      id: 'travel-pressure',
      category: 'Travel & Mobility',
      severity: freqAttrRate > nonAttrRate + 6 ? 'critical' : 'neutral',
      headline: `Frequent travellers show ${freqAttrRate.toFixed(1)}% attrition (${freqTravel.length} staff)`,
      detail:
        nonTravel.length > 0
          ? `Compared with ${nonAttrRate.toFixed(1)}% attrition among Non-Travel roles — a ${(freqAttrRate - nonAttrRate).toFixed(1)} pp gap.`
          : `Represents ${((freqTravel.length / filtered.length) * 100).toFixed(1)}% of the filtered workforce.`,
      metric: `${freqAttrRate.toFixed(1)}% vs ${nonAttrRate.toFixed(1)}%`,
    });
  }

  // 5. Gender representation / pay parity check
  const females = filtered.filter((e) => e.gender.toLowerCase() === 'female');
  const males = filtered.filter((e) => e.gender.toLowerCase() === 'male');
  if (females.length > 0 && males.length > 0) {
    const fPay = average(females.map((e) => e.monthlyIncomeGbp));
    const mPay = average(males.map((e) => e.monthlyIncomeGbp));
    const gap = mPay > 0 ? ((fPay - mPay) / mPay) * 100 : 0;
    findings.push({
      id: 'gender-parity',
      category: 'Workforce Mix & Pay',
      severity: Math.abs(gap) >= 8 ? 'warning' : 'positive',
      headline: `Female representation stands at ${((females.length / filtered.length) * 100).toFixed(1)}% (${females.length} of ${filtered.length})`,
      detail: `Average monthly income is ${formatGbp(fPay)} for female staff vs ${formatGbp(mPay)} for male staff (${gap >= 0 ? '+' : ''}${gap.toFixed(1)}% variance).`,
      metric: `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}% pay delta`,
    });
  }

  // Top-10 Active Flight-Risk Watchlist
  const watchlist = [...active]
    .sort((a, b) => b.flightRiskScore - a.flightRiskScore || b.yearsSinceLastPromotion - a.yearsSinceLastPromotion)
    .slice(0, 10);

  // Recommended HR Actions dynamically derived from filtered active cohort
  const actions: ActionRecommendation[] = [];

  const promoStalledActive = active.filter((e) => e.yearsSinceLastPromotion >= 4);
  if (promoStalledActive.length > 0) {
    const topStalledDept = groupAttrition(promoStalledActive, (e) => e.department).sort(
      (a, b) => b.total - a.total
    )[0];
    actions.push({
      id: 'act-promo',
      priority: promoStalledActive.length >= 10 ? 'Immediate' : 'Near-Term',
      title: 'Run targeted career progression & promotion reviews',
      targetCohort: `${promoStalledActive.length} active employees with 4+ yrs since promotion`,
      affectedCount: promoStalledActive.length,
      rationale: `Highest concentration in ${topStalledDept?.label ?? 'filtered teams'} (${topStalledDept?.total ?? 0} staff). Promotion stagnation accounts for up to 25 pts of flight risk.`,
      actionStep: 'Schedule calibration panels with department leads and define lateral/grade pathways within 30 days.',
    });
  }

  const underpaidActive = active.filter((e) => e.payGapPct >= 10);
  if (underpaidActive.length > 0) {
    const avgGapGbp = average(underpaidActive.map((e) => e.levelMedianIncome - e.monthlyIncomeGbp));
    actions.push({
      id: 'act-comp',
      priority: underpaidActive.length >= 8 ? 'Immediate' : 'Near-Term',
      title: 'Conduct out-of-cycle market pay alignment',
      targetCohort: `${underpaidActive.length} active employees >=10% below Job Level median`,
      affectedCount: underpaidActive.length,
      rationale: `Affected staff trail their peer Job Level median by an average of ${formatGbp(avgGapGbp)}/mo.`,
      actionStep: 'Prioritise High/Elevated flight-risk individuals in the upcoming UK compensation review cycle.',
    });
  }

  const frequentTravelActive = active.filter(
    (e) => e.businessTravel === 'Travel_Frequently' && (e.distanceFromHomeKm >= 20 || e.flightRiskScore >= 40)
  );
  if (frequentTravelActive.length > 0) {
    actions.push({
      id: 'act-travel',
      priority: 'Near-Term',
      title: 'Rebalance travel rosters and hybrid commute flexibility',
      targetCohort: `${frequentTravelActive.length} frequent-travel active employees with long commutes or elevated risk`,
      affectedCount: frequentTravelActive.length,
      rationale: 'Combining heavy business travel (+20 pts) with 20+ km commutes compounds burnout and departure risk.',
      actionStep: 'Introduce remote-first meeting defaults and rotational site coverage across Aberdeen, London, and regional hubs.',
    });
  }

  const earlyOrNewMgrActive = active.filter(
    (e) => e.yearsAtCompany <= 2 || e.yearsWithCurrManager <= 1
  );
  if (earlyOrNewMgrActive.length > 0) {
    actions.push({
      id: 'act-onboarding',
      priority: 'Monitor',
      title: 'Strengthen 90-day manager transitions & early-tenure check-ins',
      targetCohort: `${earlyOrNewMgrActive.length} active staff with <=2 yrs tenure or <=1 yr with current manager`,
      affectedCount: earlyOrNewMgrActive.length,
      rationale: 'Manager handovers and early onboarding windows are key inflection points for voluntary turnover.',
      actionStep: 'Deploy structured stay interviews via HR Business Partners and assign peer mentors.',
    });
  }

  if (actions.length === 0 && active.length > 0) {
    actions.push({
      id: 'act-maintain',
      priority: 'Monitor',
      title: 'Maintain current retention cadence & quarterly pulse checks',
      targetCohort: `${active.length} active employees in current filter`,
      affectedCount: active.length,
      rationale: 'No acute pay-band, promotion-lag, or travel overload anomalies were flagged in this slice.',
      actionStep: 'Continue standard quarterly talent reviews and monitor new-hire integration.',
    });
  }

  return {
    findings,
    watchlist,
    actions,
  };
}
