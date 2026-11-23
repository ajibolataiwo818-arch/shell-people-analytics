export type AttritionStatus = 'Yes' | 'No';

export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  age: number;
  maritalStatus: string;
  department: string;
  jobTitle: string;
  jobLevel: number;
  employmentType: string;
  location: string;
  hireDate: string;
  hireYear: number;
  yearsAtCompany: number;
  yearsInCurrentRole: number;
  yearsSinceLastPromotion: number;
  yearsWithCurrManager: number;
  education: string;
  distanceFromHomeKm: number;
  businessTravel: string;
  monthlyIncomeGbp: number;
  attrition: AttritionStatus;
}

export type RiskTier = 'High' | 'Elevated' | 'Moderate' | 'Low';

export interface RiskDriver {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ScoredEmployee extends Employee {
  flightRiskScore: number;
  riskTier: RiskTier;
  riskDrivers: RiskDriver[];
  levelMedianIncome: number;
  payGapPct: number; // positive means below median
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: 'All' | 'No' | 'Yes';
}

export type TabKey = 'overview' | 'deep-dive' | 'insights';

export interface DataSourceInfo {
  source: 'google-sheets' | 'csv-upload';
  label: string;
  lastSyncedAt: Date;
  rowCount: number;
}

export interface InsightItem {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'neutral' | 'positive';
  headline: string;
  detail: string;
  metric: string;
}

export interface ActionRecommendation {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Monitor';
  title: string;
  targetCohort: string;
  affectedCount: number;
  rationale: string;
  actionStep: string;
}
