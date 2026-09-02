import { FileInfo, FilterState, FileCategory } from '../types';
import { isAfter, isBefore, subDays, subMonths, subYears, startOfDay, endOfDay, parseISO } from 'date-fns';

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function filterFiles(files: FileInfo[], filter: FilterState): FileInfo[] {
  const now = new Date();

  return files.filter(file => {
    // 1. Category Filter
    if (filter.categories.length > 0) {
      if (!filter.categories.includes(file.category)) {
        return false;
      }
    }

    // 2. Extension Filter (including custom tag searches)
    if (filter.extensions.length > 0) {
      const ext = file.extension.toLowerCase();
      const matches = filter.extensions.some(e => e.toLowerCase().replace(/^\./, '') === ext);
      if (!matches) return false;
    }

    // 3. Search Query (Name or Path)
    if (filter.searchQuery.trim()) {
      const query = filter.searchQuery.toLowerCase();
      const inName = file.name.toLowerCase().includes(query);
      const inPath = file.path.toLowerCase().includes(query);
      if (!inName && !inPath) return false;
    }

    // 4. Min Size Filter
    if (filter.minSizeBytes > 0 && file.size < filter.minSizeBytes) {
      return false;
    }

    // 5. Date Range Filter
    let fileTimestamp = file.modifiedAt;
    if (filter.dateMode === 'created') {
      fileTimestamp = file.createdAt;
    } else if (filter.dateMode === 'accessed') {
      fileTimestamp = file.accessedAt;
    }

    const fileDate = new Date(fileTimestamp);

    if (filter.datePreset !== 'all') {
      switch (filter.datePreset) {
        case 'today':
          if (isBefore(fileDate, startOfDay(now))) return false;
          break;
        case '7days':
          if (isBefore(fileDate, subDays(now, 7))) return false;
          break;
        case '30days':
          if (isBefore(fileDate, subDays(now, 30))) return false;
          break;
        case '90days':
          if (isBefore(fileDate, subDays(now, 90))) return false;
          break;
        case '6months':
          if (isBefore(fileDate, subMonths(now, 6))) return false;
          break;
        case '1year':
          if (isBefore(fileDate, subYears(now, 1))) return false;
          break;
        case 'older_1year':
          if (isAfter(fileDate, subYears(now, 1))) return false;
          break;
        case 'custom':
          if (filter.customStartDate) {
            const start = startOfDay(parseISO(filter.customStartDate));
            if (isBefore(fileDate, start)) return false;
          }
          if (filter.customEndDate) {
            const end = endOfDay(parseISO(filter.customEndDate));
            if (isAfter(fileDate, end)) return false;
          }
          break;
      }
    }

    return true;
  });
}

export function sortFiles(
  files: FileInfo[],
  sortBy: FilterState['sortBy'],
  sortOrder: FilterState['sortOrder']
): FileInfo[] {
  return [...files].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'size') {
      const sizeA = typeof a.size === 'number' ? a.size : Number(a.size) || 0;
      const sizeB = typeof b.size === 'number' ? b.size : Number(b.size) || 0;
      comp = sizeA - sizeB;
    } else if (sortBy === 'modifiedAt') {
      const modA = Number(a.modifiedAt) || 0;
      const modB = Number(b.modifiedAt) || 0;
      comp = modA - modB;
    } else if (sortBy === 'createdAt') {
      const crA = Number(a.createdAt) || 0;
      const crB = Number(b.createdAt) || 0;
      comp = crA - crB;
    } else if (sortBy === 'name') {
      comp = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortBy === 'extension') {
      comp = (a.extension || '').localeCompare(b.extension || '', undefined, { numeric: true, sensitivity: 'base' });
    }

    if (comp === 0) {
      comp = (a.name || '').localeCompare(b.name || '');
    }

    return sortOrder === 'desc' ? -comp : comp;
  });
}
