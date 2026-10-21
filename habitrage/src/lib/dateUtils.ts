import { PayCycle } from '../types';

export function getPayPeriodRange(date: Date, anchorDate: string, payCycle: PayCycle): { start: Date; end: Date } {
  const anchor = new Date(anchorDate);
  const current = new Date(date);
  
  // Normalize to start of day
  anchor.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  const diffMs = current.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let periodStart: Date;
  let periodEnd: Date;

  switch (payCycle) {
    case 'weekly': {
      const weekIndex = Math.floor(diffDays / 7);
      periodStart = new Date(anchor);
      periodStart.setDate(anchor.getDate() + weekIndex * 7);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      break;
    }
    case 'bi_weekly': {
      const periodIndex = Math.floor(diffDays / 14);
      periodStart = new Date(anchor);
      periodStart.setDate(anchor.getDate() + periodIndex * 14);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 13);
      break;
    }
    case 'semi_monthly': {
      // Typically 1st-15th and 16th-End of month
      // This is a simplification, but semi-monthly usually ignores anchor for exact day matching
      const day = current.getDate();
      const month = current.getMonth();
      const year = current.getFullYear();
      if (day <= 15) {
        periodStart = new Date(year, month, 1);
        periodEnd = new Date(year, month, 15);
      } else {
        periodStart = new Date(year, month, 16);
        periodEnd = new Date(year, month + 1, 0);
      }
      break;
    }
    case 'monthly': {
      const month = current.getMonth();
      const year = current.getFullYear();
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month + 1, 0);
      break;
    }
    default:
      periodStart = new Date(current);
      periodEnd = new Date(current);
  }

  return { start: periodStart, end: periodEnd };
}

export function formatPayPeriod(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
}
