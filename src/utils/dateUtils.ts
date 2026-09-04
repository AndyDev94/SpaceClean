import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export type DateFormatOption = 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY';

export const DATE_FORMAT_OPTIONS: { id: DateFormatOption; label: string; example: string }[] = [
  { id: 'YYYY/MM/DD', label: 'YYYY/MM/DD (ISO Slash)', example: '2025/03/15' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK / EU / Global)', example: '15/03/2025' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Standard)', example: '03/15/2025' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Standard)', example: '2025-03-15' },
  { id: 'DD MMM YYYY', label: 'DD MMM YYYY (Alphanumeric)', example: '15 Mar 2025' }
];

export function usePreferredDateFormat(): DateFormatOption {
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(getPreferredDateFormat);

  useEffect(() => {
    const handleStorage = () => setDateFormat(getPreferredDateFormat());
    window.addEventListener('spaceclean_date_format_change', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('spaceclean_date_format_change', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return dateFormat;
}

export function getPreferredDateFormat(): DateFormatOption {
  try {
    const saved = localStorage.getItem('spaceclean_date_format') as DateFormatOption;
    if (saved && DATE_FORMAT_OPTIONS.some(opt => opt.id === saved)) {
      return saved;
    }
  } catch {}
  return 'YYYY/MM/DD';
}

export function setPreferredDateFormat(fmt: DateFormatOption): void {
  try {
    localStorage.setItem('spaceclean_date_format', fmt);
    window.dispatchEvent(new Event('spaceclean_date_format_change'));
  } catch {}
}

/**
 * Universal date formatter that dynamically honors the user's selected format preference
 */
export function formatDisplayDate(
  dateInput: number | string | Date | undefined | null,
  includeTime = false,
  overrideFormat?: DateFormatOption
): string {
  if (!dateInput) return '—';

  let d: Date;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Case 1: Windows Registry raw YYYYMMDD (e.g. "20240315")
    if (/^\d{8}$/.test(trimmed)) {
      const year = parseInt(trimmed.substring(0, 4), 10);
      const month = parseInt(trimmed.substring(4, 6), 10) - 1;
      const day = parseInt(trimmed.substring(6, 8), 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(trimmed);
    }
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  const fmt = overrideFormat || getPreferredDateFormat();
  let pattern = 'yyyy/MM/dd';

  switch (fmt) {
    case 'DD/MM/YYYY':
      pattern = includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
      break;
    case 'MM/DD/YYYY':
      pattern = includeTime ? 'MM/dd/yyyy HH:mm' : 'MM/dd/yyyy';
      break;
    case 'YYYY-MM-DD':
      pattern = includeTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd';
      break;
    case 'DD MMM YYYY':
      pattern = includeTime ? 'dd MMM yyyy HH:mm' : 'dd MMM yyyy';
      break;
    case 'YYYY/MM/DD':
    default:
      pattern = includeTime ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd';
      break;
  }

  return format(d, pattern);
}
