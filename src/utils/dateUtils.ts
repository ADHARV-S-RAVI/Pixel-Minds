/**
 * Timezone-safe date utility helpers for Opportunity creation, editing, and display.
 * Enforces strict calendar date validation, 4-digit year constraint, and DD/MM/YYYY formatting.
 */

export interface DateValidationResult {
  valid: boolean;
  error?: string;
  year?: number;
  month?: number;
  day?: number;
  timestamp?: number;
  isoDate?: string;
  formattedDDMMYYYY?: string;
}

/**
 * Checks whether a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the exact number of days in a given month of a specific year.
 * Month is 1-indexed (1 = January, 12 = December).
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Validates a single date input (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or timestamp).
 * 
 * Rules:
 * 1. Restricts the year to exactly 4 digits (/^\d{4}$/, 1000 - 9999).
 * 2. Month must be between 1 and 12 (rejects month 13, etc.).
 * 3. Day must not exceed the actual number of days in that specific month and year
 *    (e.g., rejects 32/13/2026, 31/02/2026, 29/02/2025).
 * 4. Ensures strict calendar integrity (no JS date rollover).
 */
export function validateDate(
  dateInput?: string | number | Date | null,
  fieldName = 'Date'
): DateValidationResult {
  if (dateInput === undefined || dateInput === null || dateInput === '') {
    return { valid: false, error: `${fieldName} is required.` };
  }

  // Handle number timestamp
  if (typeof dateInput === 'number') {
    if (isNaN(dateInput) || !isFinite(dateInput) || dateInput <= 0) {
      return { valid: false, error: `${fieldName} must be a valid date.` };
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { valid: false, error: `${fieldName} must be a valid date.` };
    }
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const yearStr = String(y);

    if (!/^\d{4}$/.test(yearStr) || y < 1000 || y > 9999) {
      return { valid: false, error: `${fieldName} year must be exactly 4 digits.` };
    }

    const padD = String(day).padStart(2, '0');
    const padM = String(m).padStart(2, '0');
    const padY = String(y).padStart(4, '0');

    return {
      valid: true,
      year: y,
      month: m,
      day,
      timestamp: dateInput,
      isoDate: `${padY}-${padM}-${padD}`,
      formattedDDMMYYYY: `${padD}/${padM}/${padY}`
    };
  }

  // Handle Date instance
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      return { valid: false, error: `${fieldName} must be a valid date.` };
    }
    return validateDate(dateInput.getTime(), fieldName);
  }

  const trimmed = String(dateInput).trim();
  if (!trimmed) {
    return { valid: false, error: `${fieldName} is required.` };
  }

  let yearStr = '';
  let monthStr = '';
  let dayStr = '';

  // 1. Matches ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d+)-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  // 2. Matches DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d+)$/);

  if (isoMatch) {
    yearStr = isoMatch[1];
    monthStr = isoMatch[2];
    dayStr = isoMatch[3];
  } else if (dmyMatch) {
    dayStr = dmyMatch[1];
    monthStr = dmyMatch[2];
    yearStr = dmyMatch[3];
  } else {
    // Attempt fallback parsing for standard date strings
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return {
        valid: false,
        error: `${fieldName} must be a valid date in DD/MM/YYYY or YYYY-MM-DD format.`
      };
    }
    yearStr = String(parsed.getFullYear());
    monthStr = String(parsed.getMonth() + 1);
    dayStr = String(parsed.getDate());
  }

  // Rule 1: Restrict year to exactly 4 digits
  if (!/^\d{4}$/.test(yearStr)) {
    return {
      valid: false,
      error: `${fieldName} year must be exactly 4 digits (e.g., 2026).`
    };
  }

  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return { valid: false, error: `${fieldName} contains invalid date numbers.` };
  }

  if (y < 1000 || y > 9999) {
    return { valid: false, error: `${fieldName} year must be a valid 4-digit year.` };
  }

  // Rule 2: Month must be between 1 and 12
  if (m < 1 || m > 12) {
    return {
      valid: false,
      error: `${fieldName} has an invalid month (${monthStr}). Month must be between 01 and 12.`
    };
  }

  // Rule 3: Day must be valid for the specific month and year
  const maxDays = getDaysInMonth(y, m);
  if (d < 1 || d > maxDays) {
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
    return {
      valid: false,
      error: `${fieldName} has an invalid day (${dayStr}). ${monthName} ${y} has only ${maxDays} days.`
    };
  }

  // Rule 4: Verify calendar integrity to prevent rollover
  const testDate = new Date(y, m - 1, d, 12, 0, 0);
  if (
    testDate.getFullYear() !== y ||
    testDate.getMonth() !== m - 1 ||
    testDate.getDate() !== d
  ) {
    return { valid: false, error: `${fieldName} is not a valid calendar date.` };
  }

  const padDay = String(d).padStart(2, '0');
  const padMonth = String(m).padStart(2, '0');
  const padYear = String(y).padStart(4, '0');

  return {
    valid: true,
    year: y,
    month: m,
    day: d,
    timestamp: testDate.getTime(),
    isoDate: `${padYear}-${padMonth}-${padDay}`,
    formattedDDMMYYYY: `${padDay}/${padMonth}/${padYear}`
  };
}

/**
 * Returns today's date formatted as YYYY-MM-DD in user's local time.
 */
export function getTodayInputString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as DD/MM/YYYY in user's local time.
 */
export function getTodayDDMMYYYYString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

/**
 * Formats any valid date, timestamp, or string into DD/MM/YYYY.
 * Returns empty string if invalid.
 */
export function formatDateToDDMMYYYY(val?: string | number | Date | null): string {
  if (val === undefined || val === null || val === '') return '';
  const result = validateDate(val);
  return result.valid && result.formattedDDMMYYYY ? result.formattedDDMMYYYY : '';
}

/**
 * Converts a date string or timestamp into a safe Unix timestamp (ms) set to midday 12:00:00 local time.
 */
export function parseDateInputToTimestamp(dateStr?: string | number | null): number {
  if (dateStr === undefined || dateStr === null) return Date.now();
  if (typeof dateStr === 'number') {
    return isNaN(dateStr) ? Date.now() : dateStr;
  }
  const trimmed = String(dateStr).trim();
  if (!trimmed) return Date.now();

  const res = validateDate(trimmed);
  if (res.valid && res.timestamp) {
    return res.timestamp;
  }

  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Converts a timestamp or date string into YYYY-MM-DD for standard <input type="date">.
 */
export function formatTimestampToDateInput(val?: number | string | null): string {
  if (val === undefined || val === null || val === '') return '';
  const res = validateDate(val);
  if (res.valid && res.isoDate) {
    return res.isoDate;
  }
  return '';
}

/**
 * Validates opportunity date combinations for both frontend and backend:
 * 1. Application Deadline is required and must be a valid calendar date.
 * 2. Start Date (if provided) must be a valid calendar date with a 4-digit year.
 * 3. End Date (if provided) must be a valid calendar date with a 4-digit year.
 * 4. End Date must not be earlier than Start Date.
 * 5. Application Deadline must not be after the event End Date (if End Date is set).
 */
export function validateOpportunityDates(params: {
  startDate?: string | number | null;
  endDate?: string | number | null;
  deadline?: string | number | null;
}): { valid: boolean; error?: string } {
  // 1. Application Deadline validation
  if (params.deadline === undefined || params.deadline === null || (typeof params.deadline === 'string' && !params.deadline.trim())) {
    return { valid: false, error: 'Application Deadline is required.' };
  }

  const deadlineVal = validateDate(params.deadline, 'Application Deadline');
  if (!deadlineVal.valid) {
    return { valid: false, error: deadlineVal.error || 'Application Deadline must be a valid date.' };
  }

  // 2. Start Date validation (optional, but must be valid if given)
  let startVal: DateValidationResult | undefined;
  if (params.startDate !== undefined && params.startDate !== null && (typeof params.startDate !== 'string' || params.startDate.trim() !== '')) {
    startVal = validateDate(params.startDate, 'Start Date');
    if (!startVal.valid) {
      return { valid: false, error: startVal.error || 'Start Date must be a valid date.' };
    }
  }

  // 3. End Date validation (optional, but must be valid if given)
  let endVal: DateValidationResult | undefined;
  if (params.endDate !== undefined && params.endDate !== null && (typeof params.endDate !== 'string' || params.endDate.trim() !== '')) {
    endVal = validateDate(params.endDate, 'End Date');
    if (!endVal.valid) {
      return { valid: false, error: endVal.error || 'End Date must be a valid date.' };
    }
  }

  // 4. End Date must not be earlier than Start Date
  if (startVal && endVal) {
    if (endVal.isoDate! < startVal.isoDate!) {
      return { valid: false, error: 'End Date must not be earlier than Start Date.' };
    }
  }

  // 5. Application Deadline must not be after the event End Date
  if (endVal && deadlineVal.isoDate! > endVal.isoDate!) {
    return { valid: false, error: 'Application Deadline cannot be after the event End Date.' };
  }

  return { valid: true };
}
