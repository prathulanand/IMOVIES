/**
 * Client-side IST Date Formatting Helpers
 * Standard: Asia/Kolkata
 */

export function formatIST(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
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

export const formatISTDateTime = formatIST;


export function formatISTDateOnly(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatISTTimeOnly(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
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

export function formatISTDayBadge(dateInput) {
  if (!dateInput) return { dayName: '', dateNum: '', monthName: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { dayName: '', dateNum: '', monthName: '' };

  const dayName = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d);
  const dateNum = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(d);
  const monthName = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(d);

  return { dayName, dateNum, monthName };
}
