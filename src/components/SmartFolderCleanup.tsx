import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Trash2,
  Clock,
  Archive,
  Folder,
  Shield,
  Layers,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  Info,
  Calendar,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  Code2,
  File,
  Filter,
  Play
} from 'lucide-react';
import { FileInfo, FolderInfo, DuplicateGroup, FileCategory, ScanChunkInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { subDays, isBefore, format, getYear } from 'date-fns';

interface SmartFolderCleanupProps {
  files: FileInfo[];
  folders: FolderInfo[];
  duplicates: DuplicateGroup[];
  currentPath: string;
  chunkInfo?: ScanChunkInfo | null;
  onResumeScan?: (unlimited?: boolean) => void;
  onOpenDeleteModalForPaths: (paths: string[]) => void;
  onNavigateToFolder: (folderPath: string) => void;
  onPreviewFile?: (file: FileInfo) => void;
  previewedFilePath?: string | null;
}

type OptimizerMode = 'chronological' | 'safety_stages';
type TimeSortOrder =
  | 'oldest_first'
  | 'largest_oldest'
  | 'largest_first'
  | 'newest_first'
  | 'most_files'
  | 'smallest_first';

interface TimeWave {
  id: string;
  year: number;
  label: string;
  subtitle: string;
  dateRange: string;
  files: FileInfo[];
  totalBytes: number;
}

interface CleanupStage {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  safetyLevel: 'safe' | 'recommended' | 'review';
  safetyLabel: string;
  files: FileInfo[];
  totalBytes: number;
}

export const SmartFolderCleanup: React.FC<SmartFolderCleanupProps> = ({
  files,
  folders,
  duplicates,
  currentPath,
  chunkInfo,
  onResumeScan,
  onOpenDeleteModalForPaths,
  onNavigateToFolder,
  onPreviewFile,
  previewedFilePath,
}) => {
  const [optimizerMode, setOptimizerMode] = useState<OptimizerMode>('chronological');
  const [timeSortOrder, setTimeSortOrder] = useState<TimeSortOrder>('oldest_first');
  const [activeWaveIndex, setActiveWaveIndex] = useState(0);

  // Table Column Sort State (for clicking on Name, Type, Size, Modified columns)
  const [tableSortBy, setTableSortBy] = useState<'size' | 'modifiedAt' | 'name' | 'extension'>('size');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleTableColumnSort = (col: 'size' | 'modifiedAt' | 'name' | 'extension') => {
    if (tableSortBy === col) {
      setTableSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortBy(col);
      setTableSortOrder(col === 'size' || col === 'modifiedAt' ? 'desc' : 'asc');
    }
  };

  // Helper to dynamically sort any file list in a part view
  const sortPartFiles = (fileList: FileInfo[]) => {
    return [...fileList].sort((a, b) => {
      let cmp = 0;
      if (tableSortBy === 'size') {
        cmp = Number(a.size) - Number(b.size);
      } else if (tableSortBy === 'modifiedAt') {
        cmp = a.modifiedAt - b.modifiedAt;
      } else if (tableSortBy === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (tableSortBy === 'extension') {
        cmp = a.extension.localeCompare(b.extension, undefined, { sensitivity: 'base' });
      }
      if (cmp === 0) {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      return tableSortOrder === 'desc' ? -cmp : cmp;
    });
  };

  // 1. Compute Chronological Time Waves (Year & Age Partitions)
  const timeWaves: TimeWave[] = useMemo(() => {
    const nonProtected = files.filter(f => !f.isProtected);
    if (nonProtected.length === 0) return [];

    const yearGroups = new Map<number, FileInfo[]>();
    nonProtected.forEach(file => {
      const yr = getYear(new Date(file.modifiedAt || file.createdAt));
      const list = yearGroups.get(yr) || [];
      list.push(file);
      yearGroups.set(yr, list);
    });

    const sortedYears = Array.from(yearGroups.keys()).sort((a, b) => a - b);
    const waves: TimeWave[] = [];
    const currentYear = new Date().getFullYear();

    sortedYears.forEach(year => {
      const yearFiles = yearGroups.get(year) || [];
      const totalBytes = yearFiles.reduce((acc, f) => acc + f.size, 0);

      const minDate = yearFiles.length > 0 ? format(new Date(Math.min(...yearFiles.map(f => f.modifiedAt))), 'yyyy-MM-dd') : '';
      const maxDate = yearFiles.length > 0 ? format(new Date(Math.max(...yearFiles.map(f => f.modifiedAt))), 'yyyy-MM-dd') : '';

      let subtitle = `Modified between ${minDate} and ${maxDate}`;
      if (year < currentYear - 2) {
        subtitle = `Ancient archives & legacy assets (${minDate} - ${maxDate})`;
      } else if (year === currentYear - 1) {
        subtitle = `Previous year files (${minDate} - ${maxDate})`;
      } else if (year === currentYear) {
        subtitle = `Recent current year files (${minDate} - ${maxDate})`;
      }

      waves.push({
        id: `wave_${year}`,
        year,
        label: `Year ${year} Files`,
        subtitle,
        dateRange: `${minDate} ➔ ${maxDate}`,
        files: yearFiles,
        totalBytes,
      });
    });

    // Apply Wave-Level Order Strategy
    if (timeSortOrder === 'newest_first') {
      return [...waves].reverse();
    } else if (timeSortOrder === 'largest_first') {
      return [...waves].sort((a, b) => b.totalBytes - a.totalBytes);
    } else if (timeSortOrder === 'largest_oldest') {
      return [...waves].sort((a, b) => {
        const ageA = Math.max(1, currentYear - a.year + 1);
        const ageB = Math.max(1, currentYear - b.year + 1);
        const scoreA = (a.totalBytes / (1024 * 1024)) * (ageA * 1.5);
        const scoreB = (b.totalBytes / (1024 * 1024)) * (ageB * 1.5);
        return scoreB - scoreA;
      });
    } else if (timeSortOrder === 'most_files') {
      return [...waves].sort((a, b) => b.files.length - a.files.length);
    } else if (timeSortOrder === 'smallest_first') {
      return [...waves].sort((a, b) => a.totalBytes - b.totalBytes);
    }
    return waves;
  }, [files, timeSortOrder]);

  // 2. Compute Safety Stages (Alternative View)
  const safetyStages: CleanupStage[] = useMemo(() => {
    const nonProtected = files.filter(f => !f.isProtected);
    const now = new Date();
    const staleCutoff = subDays(now, 180);

    const quickWinExts = new Set(['tmp', 'temp', 'log', 'bak', 'old', 'dmp', 'cache', 'crdownload', 'part', 'swp', 'chk']);
    const stage1Files = nonProtected.filter(f => quickWinExts.has(f.extension.toLowerCase()) || f.category === 'system');
    const stage1Bytes = stage1Files.reduce((acc, f) => acc + f.size, 0);

    const stage2Files = nonProtected.filter(f => f.size >= 200 * 1024 * 1024);
    const stage2Bytes = stage2Files.reduce((acc, f) => acc + f.size, 0);

    const stage1PathSet = new Set(stage1Files.map(f => f.path));
    const stage3Files = nonProtected.filter(
      f => !stage1PathSet.has(f.path) && isBefore(new Date(f.modifiedAt), staleCutoff)
    );
    const stage3Bytes = stage3Files.reduce((acc, f) => acc + f.size, 0);

    const duplicateFiles: FileInfo[] = [];
    duplicates.forEach(group => {
      if (group.files.length > 1) {
        duplicateFiles.push(...group.files.slice(1).filter(f => !f.isProtected));
      }
    });
    const stage4Bytes = duplicateFiles.reduce((acc, f) => acc + f.size, 0);

    return [
      {
        id: 'stage_quick_wins',
        title: 'Stage 1: Safe to Delete (Cache & Temp Files)',
        subtitle: 'Temporary installer leftovers, crash logs, and obsolete cache files',
        icon: <Zap size={16} className="text-amber-400" />,
        safetyLevel: 'safe',
        safetyLabel: '100% Safe to Delete',
        files: stage1Files,
        totalBytes: stage1Bytes,
      },
      {
        id: 'stage_space_hogs',
        title: 'Stage 2: Very Large Files (over 200 MB)',
        subtitle: 'Large video captures, disk images (.iso), large installers, or VM containers',
        icon: <Archive size={16} className="text-red-400" />,
        safetyLevel: 'review',
        safetyLabel: 'Review Before Deleting',
        files: stage2Files,
        totalBytes: stage2Bytes,
      },
      {
        id: 'stage_stale_files',
        title: 'Stage 3: Forgotten Files (Unopened in 6+ Months)',
        subtitle: 'Files untouched for over 180 days that occupy valuable disk storage',
        icon: <Clock size={16} className="text-blue-400" />,
        safetyLevel: 'recommended',
        safetyLabel: 'Recommended Cleanup',
        files: stage3Files,
        totalBytes: stage3Bytes,
      },
      {
        id: 'stage_duplicates',
        title: 'Stage 4: Exact Duplicate Copies',
        subtitle: 'Verified redundant copies taking up unnecessary storage space',
        icon: <Shield size={16} className="text-purple-400" />,
        safetyLevel: 'safe',
        safetyLabel: 'Redundant Copies',
        files: duplicateFiles,
        totalBytes: stage4Bytes,
      },
    ];
  }, [files, duplicates]);

  // Selected Stages & Waves Checked State
  const [selectedWaveIds, setSelectedWaveIds] = useState<Set<string>>(new Set());
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set(['wave_0', 'stage_quick_wins']));
  const [checkedFilePaths, setCheckedFilePaths] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  // Auto-select oldest time wave on initial load
  useEffect(() => {
    if (timeWaves.length > 0 && selectedWaveIds.size === 0) {
      const oldestWave = timeWaves[0];
      setSelectedWaveIds(new Set([oldestWave.id]));
      setCheckedFilePaths(new Set(oldestWave.files.map(f => f.path)));
      setExpandedStageIds(new Set([oldestWave.id]));
    }
  }, [timeWaves]);

  // Sync checkedFilePaths whenever files prop changes (purges deleted files immediately)
  useEffect(() => {
    const currentPathSet = new Set(files.map(f => f.path.toLowerCase()));
    setCheckedFilePaths(prev => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach(p => {
        if (currentPathSet.has(p.toLowerCase())) {
          next.add(p);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [files]);

  const toggleWaveSelection = (waveId: string) => {
    const next = new Set(selectedWaveIds);
    const wave = timeWaves.find(w => w.id === waveId) || safetyStages.find(s => s.id === waveId);
    const nextChecked = new Set(checkedFilePaths);

    if (next.has(waveId)) {
      next.delete(waveId);
      wave?.files.forEach(f => nextChecked.delete(f.path));
    } else {
      next.add(waveId);
      wave?.files.forEach(f => nextChecked.add(f.path));
    }
    setSelectedWaveIds(next);
    setCheckedFilePaths(nextChecked);
  };

  const toggleFileCheckbox = (filePath: string) => {
    const next = new Set(checkedFilePaths);
    if (next.has(filePath)) next.delete(filePath);
    else next.add(filePath);
    setCheckedFilePaths(next);
  };

  const selectAllFilesInWave = (fileList: FileInfo[], waveId: string) => {
    const next = new Set(checkedFilePaths);
    fileList.forEach(f => next.add(f.path));
    setCheckedFilePaths(next);

    const nextWaves = new Set(selectedWaveIds);
    nextWaves.add(waveId);
    setSelectedWaveIds(nextWaves);
  };

  const deselectAllFilesInWave = (fileList: FileInfo[], waveId: string) => {
    const next = new Set(checkedFilePaths);
    fileList.forEach(f => next.delete(f.path));
    setCheckedFilePaths(next);

    const nextWaves = new Set(selectedWaveIds);
    nextWaves.delete(waveId);
    setSelectedWaveIds(nextWaves);
  };

  const handleSelectOldestTwoYears = () => {
    if (timeWaves.length === 0) return;
    const oldestWaves = timeWaves.slice(0, Math.min(2, timeWaves.length));
    const nextWaves = new Set(oldestWaves.map(w => w.id));
    const nextChecked = new Set<string>();
    oldestWaves.forEach(w => w.files.forEach(f => nextChecked.add(f.path)));

    setSelectedWaveIds(nextWaves);
    setCheckedFilePaths(nextChecked);
  };

  // Selected Files To Delete
  const selectedFilesToClean = useMemo(() => {
    return files.filter(f => checkedFilePaths.has(f.path) && !f.isProtected);
  }, [files, checkedFilePaths]);

  const totalSelectedBytes = selectedFilesToClean.reduce((acc, f) => acc + f.size, 0);
  const totalScannedBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalPotentialPercent = totalScannedBytes > 0 ? Math.min(100, Math.round((totalSelectedBytes / totalScannedBytes) * 100)) : 0;

  const handleCleanWave = (waveFiles: FileInfo[]) => {
    const paths = waveFiles.filter(f => checkedFilePaths.has(f.path)).map(f => f.path);
    if (paths.length === 0) {
      onOpenDeleteModalForPaths(waveFiles.map(f => f.path));
    } else {
      onOpenDeleteModalForPaths(paths);
    }
  };

  const handleCleanSelectedWaves = () => {
    if (selectedFilesToClean.length === 0) return;
    const paths = selectedFilesToClean.map(f => f.path);
    onOpenDeleteModalForPaths(paths);
  };

  const getCategoryIcon = (cat: FileCategory) => {
    switch (cat) {
      case 'video': return <Film size={13} className="text-red-400" />;
      case 'image': return <ImageIcon size={13} className="text-emerald-400" />;
      case 'audio': return <Music size={13} className="text-amber-400" />;
      case 'document': return <FileText size={13} className="text-blue-400" />;
      case 'archive': return <Archive size={13} className="text-purple-400" />;
      case 'code': return <Code2 size={13} className="text-pink-400" />;
      default: return <File size={13} className="text-slate-400" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
      {/* Top Banner Overview Card */}
      <div className="panel" style={{ padding: '18px', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Smart Part-by-Part Folder Optimizer
                </h2>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                  Any Folder Size (GB / TB)
                </span>
                {chunkInfo && chunkInfo.isChunkPaused && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600, border: '1px solid var(--accent-primary)' }}>
                    Part {chunkInfo.chunkNumber} Ready
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Organizes any folder into chronological years and age groups. Click column headers (Size, Name, Type, Date) to sort files inside any year.
              </p>
            </div>
          </div>

          {/* Mode Switcher (Moved UP into Top Header Right) */}
          <div style={{ flexShrink: 0 }}>
            <div className="tab-nav" style={{ padding: '3px' }}>
              <button
                className={`tab-btn ${optimizerMode === 'chronological' ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setOptimizerMode('chronological')}
                title="Review files partitioned by Year & Age (Oldest to Newest)"
              >
                <Calendar size={13} />
                <span>Chronological Year & Age</span>
              </button>
              <button
                className={`tab-btn ${optimizerMode === 'safety_stages' ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setOptimizerMode('safety_stages')}
                title="Review by Safety Category (Safe to Delete, Large Files, Forgotten)"
              >
                <Layers size={13} />
                <span>Safety Categories</span>
              </button>
            </div>
          </div>
        </div>

        {/* Potential Recovery Meter */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Selected to Reclaim: <strong style={{ color: 'var(--accent-danger)' }}>{formatBytes(totalSelectedBytes)}</strong> ({totalPotentialPercent}% of analyzed folder)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Total Analyzed: {formatBytes(totalScannedBytes)} ({files.length.toLocaleString()} files)
            </span>
          </div>

          <div className="progress-bar-track" style={{ height: '6px' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${totalPotentialPercent}%`,
                background: 'var(--accent-danger)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main List Sub-Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {optimizerMode === 'chronological' ? (
            <>
              <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Year & Age Groups ({timeWaves.length} Years)</span>
            </>
          ) : (
            <>
              <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Categorized Safety Groups</span>
            </>
          )}
        </div>

        {/* Right side controls: Presets + Strategy Order + Filter Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
            onClick={handleSelectOldestTwoYears}
            title="Pre-select files from the oldest years"
          >
            <CheckCircle2 size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>Recommended</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
            onClick={selectedWaveIds.size === (optimizerMode === 'chronological' ? timeWaves.length : safetyStages.length) ? () => setSelectedWaveIds(new Set()) : () => setSelectedWaveIds(new Set((optimizerMode === 'chronological' ? timeWaves : safetyStages).map(s => s.id)))}
          >
            {selectedWaveIds.size > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
            <span>{selectedWaveIds.size > 0 ? 'Deselect All' : 'Select All'}</span>
          </button>

          {optimizerMode === 'chronological' && (
            <select
              value={timeSortOrder}
              onChange={e => setTimeSortOrder(e.target.value as TimeSortOrder)}
              style={{ padding: '3px 8px', fontSize: '11px', height: '28px', maxWidth: '250px' }}
              title="Change chronological review strategy"
            >
              <option value="oldest_first">⏳ Oldest Years First (Old ➔ New)</option>
              <option value="largest_oldest">🎯 Largest & Oldest (Top Space Recovery)</option>
              <option value="largest_first">📦 Biggest Years First (Largest GB)</option>
              <option value="newest_first">⚡ Newest Years First (New ➔ Old)</option>
              <option value="most_files">📄 Most Files First (Clutter Density)</option>
              <option value="smallest_first">🪶 Lightest Years First (Smallest GB)</option>
            </select>
          )}

          <div className="search-box" style={{ width: '180px', height: '28px' }}>
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="Search in waves..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ fontSize: '11px', paddingLeft: '26px' }}
            />
          </div>
        </div>
      </div>

      {/* MODE 1: CHRONOLOGICAL TIME WAVES */}
      {optimizerMode === 'chronological' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {timeWaves.length === 0 ? (
            <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Clock size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No files available to partition in this directory.</p>
            </div>
          ) : (
            timeWaves.map((wave, waveIdx) => {
              const isWaveSelected = selectedWaveIds.has(wave.id);
              const isExpanded = expandedStageIds.has(wave.id);
              const checkedInWaveCount = wave.files.filter(f => checkedFilePaths.has(f.path)).length;
              const checkedInWaveBytes = wave.files.filter(f => checkedFilePaths.has(f.path)).reduce((s, f) => s + f.size, 0);

              const isAllChecked = wave.files.length > 0 && checkedInWaveCount === wave.files.length;
              const isSomeChecked = checkedInWaveCount > 0 && checkedInWaveCount < wave.files.length;

              const query = searchFilter.toLowerCase();
              const filteredList = query
                ? wave.files.filter(f => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
                : wave.files;

              // Apply Interactive Table Column Sort
              const displayedFiles = sortPartFiles(filteredList);

              return (
                <div
                  key={wave.id}
                  className="panel"
                  style={{
                    overflow: 'hidden',
                    borderColor: isWaveSelected ? 'var(--accent-primary)' : undefined,
                    background: 'var(--bg-panel)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Wave Header Bar */}
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: isWaveSelected ? 'var(--bg-subtle)' : undefined,
                      borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => toggleWaveSelection(wave.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isWaveSelected}
                          ref={input => {
                            if (input) input.indeterminate = isSomeChecked;
                          }}
                          onChange={() => toggleWaveSelection(wave.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>

                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          background: waveIdx === 0 && timeSortOrder === 'oldest_first' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-subtle)',
                          color: waveIdx === 0 && timeSortOrder === 'oldest_first' ? '#ef4444' : 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {wave.year}
                      </div>

                      <div
                        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                        onClick={() => {
                          const next = new Set(expandedStageIds);
                          if (next.has(wave.id)) next.delete(wave.id);
                          else next.add(wave.id);
                          setExpandedStageIds(next);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            Part {waveIdx + 1}: {wave.label}
                          </span>

                          {waveIdx === 0 && timeSortOrder === 'oldest_first' && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                              Oldest Wave • Prime Cleanup Target
                            </span>
                          )}

                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            ({wave.dateRange})
                          </span>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {wave.subtitle}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {formatBytes(checkedInWaveBytes > 0 ? checkedInWaveBytes : wave.totalBytes)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {checkedInWaveCount > 0 ? `${checkedInWaveCount} of ${wave.files.length}` : `${wave.files.length}`} files
                        </div>
                      </div>

                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleCleanWave(wave.files)}
                        title={`Clean wave ${wave.label}`}
                      >
                        <Trash2 size={12} />
                        <span>Clean This Part</span>
                      </button>

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        onClick={() => {
                          const next = new Set(expandedStageIds);
                          if (next.has(wave.id)) next.delete(wave.id);
                          else next.add(wave.id);
                          setExpandedStageIds(next);
                        }}
                      >
                        <span>{isExpanded ? 'Hide' : 'Review Files'}</span>
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Dropdown Table inside this Time Wave */}
                  {isExpanded && (
                    <div style={{ padding: '12px 16px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => (isAllChecked ? deselectAllFilesInWave(wave.files, wave.id) : selectAllFilesInWave(wave.files, wave.id))}
                          >
                            {isAllChecked ? <CheckSquare size={12} /> : isSomeChecked ? <MinusSquare size={12} /> : <Square size={12} />}
                            <span>{isAllChecked ? 'Deselect Wave' : 'Select All in Wave'}</span>
                          </button>

                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            Showing {displayedFiles.length.toLocaleString()} files from {wave.year} (Sorted by {tableSortBy} {tableSortOrder.toUpperCase()})
                          </span>
                        </div>
                      </div>

                      {/* Scrollable File List for this Time Slice */}
                      <div
                        style={{
                          maxHeight: '260px',
                          overflowY: 'auto',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-panel)'
                        }}
                      >
                        <table className="file-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '30px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isAllChecked}
                                  ref={input => {
                                    if (input) input.indeterminate = isSomeChecked;
                                  }}
                                  onChange={() => (isAllChecked ? deselectAllFilesInWave(wave.files, wave.id) : selectAllFilesInWave(wave.files, wave.id))}
                                />
                              </th>
                              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('name')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Name</span>
                                  {tableSortBy === 'name' ? (
                                    tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                  ) : (
                                    <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                  )}
                                </div>
                              </th>
                              <th style={{ width: '75px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('extension')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Type</span>
                                  {tableSortBy === 'extension' ? (
                                    tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                  ) : (
                                    <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                  )}
                                </div>
                              </th>
                              <th style={{ width: '100px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('size')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontWeight: tableSortBy === 'size' ? 700 : 500, color: tableSortBy === 'size' ? 'var(--text-main)' : undefined }}>Size</span>
                                  {tableSortBy === 'size' ? (
                                    tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                  ) : (
                                    <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                  )}
                                </div>
                              </th>
                              <th style={{ width: '140px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('modifiedAt')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Modified</span>
                                  {tableSortBy === 'modifiedAt' ? (
                                    tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                  ) : (
                                    <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                  )}
                                </div>
                              </th>
                              <th>Location</th>
                              <th style={{ width: '60px', textAlign: 'center' }}>Inspect</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedFiles.map(file => {
                              const isChecked = checkedFilePaths.has(file.path);
                              const isPreviewActive = previewedFilePath === file.path;

                              return (
                                <tr
                                  key={file.path}
                                  className={`${isChecked ? 'selected' : ''} ${isPreviewActive ? 'preview-active' : ''}`}
                                  style={{
                                    background: isPreviewActive ? 'var(--bg-subtle)' : undefined,
                                    borderLeft: isPreviewActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
                                  }}
                                >
                                  <td
                                    style={{ textAlign: 'center', cursor: 'pointer' }}
                                    onClick={() => toggleFileCheckbox(file.path)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleFileCheckbox(file.path)}
                                      onClick={e => e.stopPropagation()}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ cursor: 'pointer' }} onClick={() => onPreviewFile?.(file)}>
                                    <div className="file-name-cell">
                                      {getCategoryIcon(file.category)}
                                      <span className="file-name-text" title={file.name}>
                                        {file.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="badge-category">.{file.extension}</span>
                                  </td>
                                  <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                    {file.formattedSize}
                                  </td>
                                  <td style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                    {format(new Date(file.modifiedAt), 'yyyy-MM-dd HH:mm')}
                                  </td>
                                  <td>
                                    <span className="file-path-text" title={file.path}>
                                      {file.path}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '2px 5px',
                                        borderRadius: '3px',
                                        background: isPreviewActive ? 'var(--accent-primary)' : undefined,
                                        color: isPreviewActive ? '#ffffff' : undefined
                                      }}
                                      title="Inspect & preview file"
                                      onClick={() => onPreviewFile?.(file)}
                                    >
                                      <Info size={11} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODE 2: CATEGORIZED SAFETY STAGES */}
      {optimizerMode === 'safety_stages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Categorized Safety Waves</span>
          </div>

          {safetyStages.map(stage => {
            const isSelected = selectedWaveIds.has(stage.id);
            const isExpanded = expandedStageIds.has(stage.id);
            const hasFiles = stage.files.length > 0;
            const checkedInStageCount = stage.files.filter(f => checkedFilePaths.has(f.path)).length;
            const checkedInStageBytes = stage.files.filter(f => checkedFilePaths.has(f.path)).reduce((s, f) => s + f.size, 0);

            const isAllChecked = hasFiles && checkedInStageCount === stage.files.length;
            const isSomeChecked = checkedInStageCount > 0 && checkedInStageCount < stage.files.length;

            const query = searchFilter.toLowerCase();
            const filteredList = query
              ? stage.files.filter(f => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
              : stage.files;

            const displayedFiles = sortPartFiles(filteredList);

            return (
              <div
                key={stage.id}
                className="panel"
                style={{
                  overflow: 'hidden',
                  borderColor: isSelected && hasFiles ? 'var(--accent-primary)' : undefined,
                  background: 'var(--bg-panel)',
                  opacity: hasFiles ? 1 : 0.6,
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: isSelected && hasFiles ? 'var(--bg-subtle)' : undefined,
                    borderBottom: isExpanded && hasFiles ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={isSelected && hasFiles}
                      disabled={!hasFiles}
                      onChange={() => toggleWaveSelection(stage.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: hasFiles ? 'pointer' : 'not-allowed' }}
                    />
                    <div style={{ flexShrink: 0 }}>{stage.icon}</div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: hasFiles ? 'pointer' : 'default' }}
                      onClick={() => {
                        const next = new Set(expandedStageIds);
                        if (next.has(stage.id)) next.delete(stage.id);
                        else next.add(stage.id);
                        setExpandedStageIds(next);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{stage.title}</span>
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', fontWeight: 600, background: stage.safetyLevel === 'safe' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: stage.safetyLevel === 'safe' ? '#10b981' : '#60a5fa' }}>
                          {stage.safetyLabel}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{stage.subtitle}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatBytes(checkedInStageBytes > 0 ? checkedInStageBytes : stage.totalBytes)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{stage.files.length} files</div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      disabled={!hasFiles}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                      onClick={() => handleCleanWave(stage.files)}
                    >
                      <Trash2 size={12} />
                      <span>Clean Wave</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      disabled={!hasFiles}
                      style={{ padding: '4px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => {
                        const next = new Set(expandedStageIds);
                        if (next.has(stage.id)) next.delete(stage.id);
                        else next.add(stage.id);
                        setExpandedStageIds(next);
                      }}
                    >
                      <span>{isExpanded ? 'Hide' : 'Review Files'}</span>
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Dropdown Table inside Safety Category */}
                {isExpanded && hasFiles && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => (isAllChecked ? deselectAllFilesInWave(stage.files, stage.id) : selectAllFilesInWave(stage.files, stage.id))}
                        >
                          {isAllChecked ? <CheckSquare size={12} /> : isSomeChecked ? <MinusSquare size={12} /> : <Square size={12} />}
                          <span>{isAllChecked ? 'Deselect Wave' : 'Select All in Wave'}</span>
                        </button>

                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          Showing {displayedFiles.length.toLocaleString()} files (Sorted by {tableSortBy} {tableSortOrder.toUpperCase()})
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        maxHeight: '260px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-panel)'
                      }}
                    >
                      <table className="file-table" style={{ fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isAllChecked}
                                ref={input => {
                                  if (input) input.indeterminate = isSomeChecked;
                                }}
                                onChange={() => (isAllChecked ? deselectAllFilesInWave(stage.files, stage.id) : selectAllFilesInWave(stage.files, stage.id))}
                              />
                            </th>
                            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('name')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Name</span>
                                {tableSortBy === 'name' ? (
                                  tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                )}
                              </div>
                            </th>
                            <th style={{ width: '75px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('extension')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Type</span>
                                {tableSortBy === 'extension' ? (
                                  tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                )}
                              </div>
                            </th>
                            <th style={{ width: '100px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('size')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: tableSortBy === 'size' ? 700 : 500, color: tableSortBy === 'size' ? 'var(--text-main)' : undefined }}>Size</span>
                                {tableSortBy === 'size' ? (
                                  tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                )}
                              </div>
                            </th>
                            <th style={{ width: '140px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleTableColumnSort('modifiedAt')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Modified</span>
                                {tableSortBy === 'modifiedAt' ? (
                                  tableSortOrder === 'desc' ? <ArrowDown size={11} style={{ color: 'var(--accent-primary)' }} /> : <ArrowUp size={11} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                                )}
                              </div>
                            </th>
                            <th>Location</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>Inspect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedFiles.map(file => {
                            const isChecked = checkedFilePaths.has(file.path);
                            const isPreviewActive = previewedFilePath === file.path;

                            return (
                              <tr
                                key={file.path}
                                className={`${isChecked ? 'selected' : ''} ${isPreviewActive ? 'preview-active' : ''}`}
                                style={{
                                  background: isPreviewActive ? 'var(--bg-subtle)' : undefined,
                                  borderLeft: isPreviewActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
                                }}
                              >
                                <td
                                  style={{ textAlign: 'center', cursor: 'pointer' }}
                                  onClick={() => toggleFileCheckbox(file.path)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleFileCheckbox(file.path)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ cursor: 'pointer' }} onClick={() => onPreviewFile?.(file)}>
                                  <div className="file-name-cell">
                                    {getCategoryIcon(file.category)}
                                    <span className="file-name-text" title={file.name}>
                                      {file.name}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge-category">.{file.extension}</span>
                                </td>
                                <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                  {file.formattedSize}
                                </td>
                                <td style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                  {format(new Date(file.modifiedAt), 'yyyy-MM-dd HH:mm')}
                                </td>
                                <td>
                                  <span className="file-path-text" title={file.path}>
                                    {file.path}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '2px 5px',
                                      borderRadius: '3px',
                                      background: isPreviewActive ? 'var(--accent-primary)' : undefined,
                                      color: isPreviewActive ? '#ffffff' : undefined
                                    }}
                                    title="Inspect & preview file"
                                    onClick={() => onPreviewFile?.(file)}
                                  >
                                    <Info size={11} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar for Selected Waves */}
      {selectedFilesToClean.length > 0 && (
        <div className="floating-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
              {selectedFilesToClean.length.toLocaleString()} files selected ({formatBytes(totalSelectedBytes)} to free)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => setCheckedFilePaths(new Set())}
            >
              Clear
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={handleCleanSelectedWaves}
            >
              <Trash2 size={13} />
              <span>Clean Selected Files</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
