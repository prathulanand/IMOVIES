/**
 * IST Date & Time Utility Module (Single Source of Truth)
 * Standard Timezone: Asia/Kolkata (UTC +05:30)
 * All business logic and user displays operate in IST, while UTC instants are stored in MongoDB.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Returns the current instant as a Date object.
 */
export function getNowUTC() {
  return new Date();
}

/**
 * Converts any Date or ISO string into an IST Date representation (shifted for calendar math).
 * @param {Date|string|number} dateInput
 * @returns {Date}
 */
export function toISTDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return new Date(d.getTime() + IST_OFFSET_MS);
}

/**
 * Formats a Date instant into standard IST string: 'DD MMM YYYY, hh:mm a'
 * e.g., '21 Aug 2026, 06:42 pm'
 * @param {Date|string|number} dateInput
 * @returns {string}
 */
export function formatIST(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const options = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(d);

  const day = parts.find((p) => p.type === 'day')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const hour = parts.find((p) => p.type === 'hour')?.value || '';
  const minute = parts.find((p) => p.type === 'minute')?.value || '';
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value || '').toLowerCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

/**
 * Formats date part only in IST: 'YYYY-MM-DD'
 * @param {Date|string|number} dateInput
 * @returns {string}
 */
export function formatISTDateOnly(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  return formatter.format(d);
}

/**
 * Formats time part only in IST: 'hh:mm a'
 * e.g. '06:30 pm'
 * @param {Date|string|number} dateInput
 * @returns {string}
 */
export function formatISTTimeOnly(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(d);
  const hour = parts.find((p) => p.type === 'hour')?.value || '';
  const minute = parts.find((p) => p.type === 'minute')?.value || '';
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value || '').toLowerCase();

  return `${hour}:${minute} ${dayPeriod}`;
}

/**
 * Given a date input or 'YYYY-MM-DD' string, returns the exact UTC start and end bounds
 * corresponding to 00:00:00.000 IST and 23:59:59.999 IST for that calendar day.
 * @param {string|Date} dateInput - 'YYYY-MM-DD' or Date object
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export function getISTDayRange(dateInput) {
  let dateStr = '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    dateStr = dateInput;
  } else {
    dateStr = formatISTDateOnly(dateInput || new Date());
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  // 00:00:00 IST in UTC is -5.5 hours
  const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  // 23:59:59.999 IST in UTC
  const endUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { startUTC, endUTC };
}

/**
 * Constructs a UTC Date object representing a specific IST date and time.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:mm' in 24-hr format (e.g. '14:30' or '09:15')
 * @returns {Date}
 */
export function createISTInstant(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - IST_OFFSET_MS);
}

/**
 * Checks if a show has already started taking into account an optional grace window in minutes.
 * @param {Date|string} startTime
 * @param {number} [graceMinutes=0]
 * @returns {boolean}
 */
export function isShowPast(startTime, graceMinutes = 0) {
  const showTime = new Date(startTime).getTime();
  const cutoff = Date.now() - graceMinutes * 60 * 1000;
  return showTime < cutoff;
}
