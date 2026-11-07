/**
 * Timezone-safe date utility helpers for Opportunity creation, editing, and display.
 * Setting midday (12:00:00) prevents boundary rollover and one-day shifts across UTC-12 to UTC+14.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in user's local time
 */
export function getTodayInputString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string into a safe Unix timestamp (ms) set to midday 12:00:00 local time
 */
export function parseDateInputToTimestamp(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return Date.now();
  const trimmed = dateStr.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d, 12, 0, 0).getTime();
    }
  }
  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Converts a timestamp or ISO string into YYYY-MM-DD for <input type="date">
 */
export function formatTimestampToDateInput(val?: number | string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate date combinations according to requirements:
 * 1. Application deadline must not be in the past.
 * 2. End date must not be before start date.
 * 3. Application deadline must not be after the event end date.
 */
export function validateOpportunityDates(params: {
  startDate?: string;
  endDate?: string;
  deadline?: string;
}): { valid: boolean; error?: string } {
  const todayStr = getTodayInputString();

  if (!params.deadline || !params.deadline.trim()) {
    return { valid: false, error: 'Application deadline is required.' };
  }

  // Application deadline cannot be in the past (comparing YYYY-MM-DD strings directly)
  if (params.deadline < todayStr) {
    return { valid: false, error: 'Application deadline cannot be in the past.' };
  }

  // End date cannot be before start date
  if (params.startDate && params.endDate) {
    if (params.endDate < params.startDate) {
      return { valid: false, error: 'Event end date cannot be earlier than start date.' };
    }
  }

  // Application deadline must not be after the event end date
  if (params.deadline && params.endDate) {
    if (params.deadline > params.endDate) {
      return { valid: false, error: 'Application deadline cannot be after the event end date.' };
    }
  }

  return { valid: true };
}

