import React, { useState, useMemo } from 'react';
import {
  Copy,
  Trash2,
  FolderOpen,
  RotateCw,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  Calendar,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { DuplicateGroup, FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format, subDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

type DateFilterPreset =
  | 'all'
  | 'today'
  | '7days'
  | '30days'
  | '90days'
  | '6months'
  | '1year'
  | 'older_1year'
  | 'custom';

interface DuplicateFinderProps {
  duplicates: DuplicateGroup[];
  isScanning: boolean;
  onScanDuplicates: () => void;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSetSelectedPaths: (paths: Set<string>) => void;
  onOpenDeleteModal: () => void;
  onPreviewFile?: (file: FileInfo) => void;
  previewedFilePath?: string;
}

export const DuplicateFinder: React.FC<DuplicateFinderProps> = ({
  duplicates,
  isScanning,
  onScanDuplicates,
  selectedPaths,
  onToggleSelect,
  onSetSelectedPaths,
  onOpenDeleteModal,
  onPreviewFile,
  previewedFilePath,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Filter duplicates by search and date range
  const filteredDuplicates = useMemo(() => {
    let result = duplicates;

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(g =>
        g.files.some(
          f =>
            f.name.toLowerCase().includes(q) ||
            f.path.toLowerCase().includes(q) ||
            (f.extension || '').toLowerCase().includes(q)
        )
      );
    }

    // 2. Date Filter
    if (datePreset !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      let isOlderThan = false;

      switch (datePreset) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        case '90days':
          startDate = subDays(now, 90);
          break;
        case '6months':
          startDate = subDays(now, 180);
          break;
        case '1year':
          startDate = subDays(now, 365);
          break;
        case 'older_1year':
          startDate = subDays(now, 365);
          isOlderThan = true;
          break;
        case 'custom':
          if (customStartDate) startDate = startOfDay(new Date(customStartDate));
          if (customEndDate) endDate = endOfDay(new Date(customEndDate));
          break;
      }

      result = result.filter(g => {
        return g.files.some(f => {
          const d = f.modifiedAt || f.createdAt;
          if (!d) return false;
          const fileDate = new Date(d);
          if (isOlderThan && startDate) return isBefore(fileDate, startDate);
          if (startDate && isBefore(fileDate, startDate)) return false;
          if (endDate && isAfter(fileDate, endDate)) return false;
          return true;
        });
      });
    }

    return result;
  }, [duplicates, searchQuery, datePreset, customStartDate, customEndDate]);

  const totalWastedBytes = filteredDuplicates.reduce((acc, d) => acc + d.wastedBytes, 0);

  // Smart selection helpers (operates on filtered list)
  const handleKeepNewest = () => {
    const next = new Set<string>();
    filteredDuplicates.forEach(group => {
      // Sort newest first
      const sorted = [...group.files].sort((a, b) => (b.modifiedAt || b.createdAt || 0) - (a.modifiedAt || a.createdAt || 0));
      // Keep first (newest), select remaining
      for (let i = 1; i < sorted.length; i++) {
        next.add(sorted[i].path);
      }
    });
    onSetSelectedPaths(next);
  };

  const handleKeepOldest = () => {
    const next = new Set<string>();
    filteredDuplicates.forEach(group => {
      // Sort oldest first
      const sorted = [...group.files].sort((a, b) => (a.modifiedAt || a.createdAt || 0) - (b.modifiedAt || b.createdAt || 0));
      // Keep first (oldest), select remaining
      for (let i = 1; i < sorted.length; i++) {
        next.add(sorted[i].path);
      }
    });
    onSetSelectedPaths(next);
  };

  const handleDeselectAll = () => {
    onSetSelectedPaths(new Set());
  };

  const handleSelectGroupCopies = (group: DuplicateGroup) => {
    const next = new Set(selectedPaths);
    // Keep first, select the rest
    for (let i = 1; i < group.files.length; i++) {
      next.add(group.files[i].path);
    }
    onSetSelectedPaths(next);
  };

  const selectedCount = filteredDuplicates.reduce((acc, g) => {
    return acc + g.files.filter(f => selectedPaths.has(f.path)).length;
  }, 0);

  const selectedBytes = filteredDuplicates.reduce((acc, g) => {
    return acc + g.files.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0);
  }, 0);

  const handleShowInExplorer = async (filePath: string) => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(filePath);
    }
  };

  const hasActiveFilters = searchQuery.trim() !== '' || datePreset !== 'all';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        overflow: 'hidden',
        background: 'var(--bg-app)'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} style={{ color: '#a855f7' }} />
            Duplicate File Finder
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Found {filteredDuplicates.length.toLocaleString()} duplicate groups consuming {formatBytes(totalWastedBytes)} redundant space
            {hasActiveFilters && ` (filtered from ${duplicates.length} total groups)`}.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onScanDuplicates}
            disabled={isScanning}
            title="Scan current indexed files for duplicates"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>Rescan Duplicates</span>
          </button>

          {selectedCount > 0 && (
            <button
              className="btn btn-danger"
              onClick={onOpenDeleteModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Trash2 size={16} />
              <span>Delete {selectedCount} Duplicates ({formatBytes(selectedBytes)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Search Box + Date Filter Dropdown + Custom Date Range */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '10px',
          flexWrap: 'wrap',
          padding: '8px 12px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Filename / Path Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '320px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search duplicate names, paths..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 30px',
                fontSize: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600 }}>Date:</span>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DateFilterPreset)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 500,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
              <option value="90days">Past 90 Days</option>
              <option value="6months">Past 6 Months</option>
              <option value="1year">Past 1 Year</option>
              <option value="older_1year">Older than 1 Year (&gt;365d)</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-panel)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid var(--accent-primary)',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.2)'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  padding: '2px 5px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  padding: '2px 5px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setDatePreset('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
              title="Reset search and date filters"
            >
              <X size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Smart Mark Action Buttons */}
        {filteredDuplicates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Smart Mark:
            </span>
            <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={handleKeepNewest}>
              Keep Newest
            </button>
            <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={handleKeepOldest}>
              Keep Oldest
            </button>
            <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={handleDeselectAll}>
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Selected Items Status Banner */}
      {selectedCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
            {selectedCount} duplicate files selected for cleanup ({formatBytes(selectedBytes)})
          </span>
          <button
            className="btn btn-danger"
            style={{ padding: '3px 10px', fontSize: '11px' }}
            onClick={onOpenDeleteModal}
          >
            Clean Selected Now
          </button>
        </div>
      )}

      {/* Scrollable Duplicate Groups List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingRight: '4px',
          paddingBottom: '24px'
        }}
      >
        {isScanning ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RotateCw size={36} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.8, color: '#a855f7' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Scanning for duplicate files...</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Computing cryptographic MD5 checksums across identical file sizes
            </p>
          </div>
        ) : filteredDuplicates.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.6, color: '#10b981' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              {hasActiveFilters ? 'No duplicate files match current search or date filter' : 'No duplicate files found'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {hasActiveFilters ? 'Try adjusting your search query or selecting "All Dates".' : 'All indexed files in this folder are unique.'}
            </p>
          </div>
        ) : (
          filteredDuplicates.map((group, gIdx) => {
            const isCollapsed = collapsedGroups.has(group.id);
            const groupSelectedCount = group.files.filter(f => selectedPaths.has(f.path)).length;

            return (
              <div
                key={group.id}
                style={{
                  flexShrink: 0,
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-panel)',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* Group Header */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => toggleGroupCollapse(group.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#a855f7',
                        background: 'rgba(168, 85, 247, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      Group #{gIdx + 1}
                    </span>

                    <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {group.files.length} Identical Copies ({group.formattedSize} each)
                    </span>

                    {groupSelectedCount > 0 && (
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                        {groupSelectedCount} marked for deletion
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                      Wasted Space: {formatBytes(group.wastedBytes)}
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGroupCopies(group);
                      }}
                      title="Keep 1 original and mark all other copies in this group for deletion"
                    >
                      Mark Clones
                    </button>
                  </div>
                </div>

                {/* Group Files List */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.files.map((file, fIdx) => {
                      const isSelected = selectedPaths.has(file.path);
                      const isPreviewed = previewedFilePath === file.path;
                      const fileDate = file.modifiedAt || file.createdAt;
                      const formattedDate = fileDate ? format(new Date(fileDate), 'yyyy-MM-dd HH:mm') : '—';

                      return (
                        <div
                          key={file.path}
                          style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: fIdx < group.files.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            borderLeft: isPreviewed ? '3px solid var(--accent-primary)' : '3px solid transparent',
                            background: isSelected
                              ? 'rgba(239, 68, 68, 0.08)'
                              : isPreviewed
                              ? 'var(--bg-subtle)'
                              : undefined,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onClick={() => {
                            onPreviewFile?.(file);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect(file.path)}
                              onClick={e => e.stopPropagation()}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: isSelected ? '#ef4444' : 'var(--text-main)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={file.name}
                              >
                                {file.name}
                              </div>

                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '2px'
                                }}
                                title={file.path}
                              >
                                {file.path}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {formattedDate}
                            </span>

                            {/* View / Preview button */}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Inspect in Live Preview Drawer"
                              onClick={e => {
                                e.stopPropagation();
                                onPreviewFile?.(file);
                              }}
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>

                            {/* Open in File Explorer button */}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Show file location in Explorer"
                              onClick={e => {
                                e.stopPropagation();
                                handleShowInExplorer(file.path);
                              }}
                            >
                              <FolderOpen size={12} />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
