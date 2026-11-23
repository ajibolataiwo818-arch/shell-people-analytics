import type { AttritionStatus, Employee } from '../types/employee';

export const GOOGLE_SHEET_ID = '1zC1EaPaah0_APFu5W0RpZSw27gCfLLrvkuZY0GJCBYM';
export const GOOGLE_SHEET_GID = '766970740';

export const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GOOGLE_SHEET_GID}`;

export const GOOGLE_SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit?gid=${GOOGLE_SHEET_GID}#gid=${GOOGLE_SHEET_GID}`;

/**
 * RFC-4180 compliant CSV parser handling quoted fields containing commas,
 * escaped quotes (""), and LF/CRLF/CR line endings.
 */
function parseRawCsv(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && cleanText[i + 1] === '\n') {
          i++;
        }
        row.push(field.trim());
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/[£$,%\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseHireYear(hireDate: string, yearsAtCompany: number): number {
  const match = hireDate.match(/^(\d{4})/);
  if (match) {
    const yr = Number(match[1]);
    if (yr >= 1970 && yr <= 2035) return yr;
  }
  const currentYear = new Date().getFullYear();
  return Math.max(1985, currentYear - Math.round(yearsAtCompany));
}

function normalizeAttrition(val: string | undefined): AttritionStatus {
  const v = (val ?? '').trim().toLowerCase();
  if (v === 'yes' || v === 'true' || v === '1' || v === 'attrited' || v === 'left') {
    return 'Yes';
  }
  return 'No';
}

export function parseEmployeeCsv(csvText: string): Employee[] {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('The CSV data is empty. Verify the Google Sheet has rows or upload a non-empty CSV file.');
  }

  // Detect HTML login/error pages returned when a Google Sheet is private or unavailable
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<title>Google Docs') ||
    trimmed.includes('accounts.google.com')
  ) {
    throw new Error(
      'Google Sheets returned a sign-in page instead of CSV data. Ensure the sheet sharing permission is set to "Anyone with the link can view", or use the Upload CSV fallback.'
    );
  }

  const rows = parseRawCsv(trimmed);
  if (rows.length < 2) {
    throw new Error('No employee records were found after the header row.');
  }

  const rawHeaders = rows[0];
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    headerMap.set(normalizeHeader(h), idx);
  });

  const findIndex = (...candidates: string[]): number => {
    for (const candidate of candidates) {
      const idx = headerMap.get(normalizeHeader(candidate));
      if (idx !== undefined) return idx;
    }
    return -1;
  };

  const idxId = findIndex('EmployeeID', 'EmpID', 'ID');
  const idxFirst = findIndex('FirstName', 'First');
  const idxLast = findIndex('LastName', 'Last');
  const idxFull = findIndex('FullName', 'Name', 'EmployeeName');
  const idxGender = findIndex('Gender', 'Sex');
  const idxAge = findIndex('Age');
  const idxMarital = findIndex('MaritalStatus', 'Marital');
  const idxDept = findIndex('Department', 'Dept');
  const idxTitle = findIndex('JobTitle', 'Role', 'Title');
  const idxLevel = findIndex('JobLevel', 'Level', 'Grade');
  const idxEmpType = findIndex('EmploymentType', 'ContractType', 'Type');
  const idxLocation = findIndex('Location', 'Site', 'Office');
  const idxHireDate = findIndex('HireDate', 'StartDate', 'JoiningDate');
  const idxYearsCompany = findIndex('YearsAtCompany', 'Tenure', 'YearsOfService');
  const idxYearsRole = findIndex('YearsInCurrentRole', 'YearsInRole');
  const idxYearsPromo = findIndex('YearsSinceLastPromotion', 'YearsSincePromotion');
  const idxYearsMgr = findIndex('YearsWithCurrManager', 'YearsWithCurrentManager');
  const idxEdu = findIndex('Education', 'EducationLevel');
  const idxDist = findIndex('DistanceFromHome_km', 'DistanceFromHome', 'CommuteKm');
  const idxTravel = findIndex('BusinessTravel', 'Travel');
  const idxIncome = findIndex('MonthlyIncome_GBP', 'MonthlyIncome', 'Salary', 'Income');
  const idxAttrition = findIndex('Attrition', 'Left', 'Status');

  const missing: string[] = [];
  if (idxId === -1) missing.push('EmployeeID');
  if (idxDept === -1) missing.push('Department');
  if (idxIncome === -1) missing.push('MonthlyIncome_GBP');
  if (idxAttrition === -1) missing.push('Attrition');

  if (missing.length > 0) {
    throw new Error(
      `CSV schema mismatch: missing required column(s) ${missing.join(', ')}. Found headers: ${rawHeaders.slice(0, 8).join(', ')}.`
    );
  }

  const getCell = (row: string[], index: number, fallback = ''): string => {
    if (index < 0 || index >= row.length) return fallback;
    return row[index] || fallback;
  };

  const employees: Employee[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const employeeId = getCell(row, idxId);
    if (!employeeId) continue;

    const firstName = getCell(row, idxFirst);
    const lastName = getCell(row, idxLast);
    const fullName =
      getCell(row, idxFull) || [firstName, lastName].filter(Boolean).join(' ') || employeeId;

    const yearsAtCompany = parseNumber(getCell(row, idxYearsCompany), 0);
    const hireDate = getCell(row, idxHireDate);
    const hireYear = parseHireYear(hireDate, yearsAtCompany);

    employees.push({
      employeeId,
      firstName: firstName || fullName.split(' ')[0] || '',
      lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
      fullName,
      gender: getCell(row, idxGender, 'Unspecified'),
      age: parseNumber(getCell(row, idxAge), 30),
      maritalStatus: getCell(row, idxMarital, 'Unknown'),
      department: getCell(row, idxDept, 'Unassigned'),
      jobTitle: getCell(row, idxTitle, 'Employee'),
      jobLevel: Math.max(1, Math.round(parseNumber(getCell(row, idxLevel), 1))),
      employmentType: getCell(row, idxEmpType, 'Full-Time'),
      location: getCell(row, idxLocation, 'Unknown'),
      hireDate: hireDate || `${hireYear}-01-01`,
      hireYear,
      yearsAtCompany,
      yearsInCurrentRole: parseNumber(getCell(row, idxYearsRole), 0),
      yearsSinceLastPromotion: parseNumber(getCell(row, idxYearsPromo), 0),
      yearsWithCurrManager: parseNumber(getCell(row, idxYearsMgr), 0),
      education: getCell(row, idxEdu, 'Unspecified'),
      distanceFromHomeKm: parseNumber(getCell(row, idxDist), 0),
      businessTravel: getCell(row, idxTravel, 'Non-Travel'),
      monthlyIncomeGbp: parseNumber(getCell(row, idxIncome), 0),
      attrition: normalizeAttrition(getCell(row, idxAttrition)),
    });
  }

  if (employees.length === 0) {
    throw new Error('Parsed CSV contained 0 valid employee rows.');
  }

  return employees;
}

export async function fetchGoogleSheetEmployees(): Promise<Employee[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const url = `${GVIZ_CSV_URL}&_ts=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Access denied (HTTP ${response.status}). The Google Sheet must be shared as "Anyone with the link can view", or upload a CSV export manually.`
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Google Sheet or tab gid=${GOOGLE_SHEET_GID} could not be found (HTTP 404). Verify the Sheet URL or upload a CSV file.`
        );
      }
      throw new Error(
        `Google Sheets gviz endpoint returned HTTP ${response.status} (${response.statusText || 'Error'}).`
      );
    }

    const csvText = await response.text();
    return parseEmployeeCsv(csvText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Timed out waiting for Google Sheets (12s). Check your internet connection or use the Upload CSV fallback.'
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        'Network or CORS error reading the Google Sheet gviz endpoint. Check connectivity and public sharing permissions, or use Upload CSV.'
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
