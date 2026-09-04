import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Layers,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  Archive,
  Code2,
  Trash,
  SlidersHorizontal,
  X,
  Plus,
  Tag,
  Filter
} from 'lucide-react';
import { FileInfo, FileCategory, FilterState, DatePreset, DateMode } from '../types';
import { formatBytes } from '../utils/filterUtils';

interface FileFilterBarProps {
  files: FileInfo[];
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  onResetFilter: () => void;
  selectedPartFilter?: number | 'all';
  onSelectPartFilter?: (part: number | 'all') => void;
  availableParts?: number[];
}

const CATEGORY_ITEMS: Array<{ id: FileCategory; label: string; icon: any }> = [
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'document', label: 'Docs', icon: FileText },
  { id: 'archive', label: 'Archives', icon: Archive },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'system', label: 'Temp', icon: Trash },
];

export const FileFilterBar: React.FC<FileFilterBarProps> = ({
  files,
  filter,
  onFilterChange,
  onResetFilter,
  selectedPartFilter = 'all',
  onSelectPartFilter,
  availableParts = [],
}) => {
  const [customExtInput, setCustomExtInput] = useState('');
  const [isExtDropdownOpen, setIsExtDropdownOpen] = useState(false);

  // Aggregate all extensions from scanned files
  const extensionMap = new Map<string, { count: number; bytes: number }>();
  files.forEach(f => {
    const ext = f.extension.toLowerCase();
    const cur = extensionMap.get(ext) || { count: 0, bytes: 0 };
    cur.count++;
    cur.bytes += f.size;
    extensionMap.set(ext, cur);
  });

  const allExtensionsSorted = Array.from(extensionMap.entries())
    .sort((a, b) => b[1].bytes - a[1].bytes);

  const topExtensions = allExtensionsSorted.slice(0, 10);

  const toggleCategory = (cat: FileCategory) => {
    const exists = filter.categories.includes(cat);
    const newCats = exists
      ? filter.categories.filter(c => c !== cat)
      : [...filter.categories, cat];
    onFilterChange({ ...filter, categories: newCats });
  };

  const toggleExtension = (ext: string) => {
    const clean = ext.toLowerCase().replace(/^\./, '').trim();
    if (!clean) return;
    const exists = filter.extensions.includes(clean);
    const newExts = exists
      ? filter.extensions.filter(e => e !== clean)
      : [...filter.extensions, clean];
    onFilterChange({ ...filter, extensions: newExts });
  };

  const handleAddCustomExt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customExtInput.trim()) return;

    // Support comma or space separated extensions e.g. "mp4, mkv, log"
    const parsedExts = customExtInput
      .split(/[, ]+/)
      .map(s => s.toLowerCase().replace(/^\./, '').trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...filter.extensions, ...parsedExts]));
    onFilterChange({ ...filter, extensions: merged });
    setCustomExtInput('');
  };

  const removeExtension = (ext: string) => {
    onFilterChange({
      ...filter,
      extensions: filter.extensions.filter(e => e !== ext)
    });
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    onFilterChange({ ...filter, datePreset: preset });
  };

  const handleDateModeChange = (mode: DateMode) => {
    onFilterChange({ ...filter, dateMode: mode });
  };

  const handleSizeFilter = (minBytes: number) => {
    onFilterChange({ ...filter, minSizeBytes: minBytes });
  };

  const isFilterActive =
    filter.categories.length > 0 ||
    filter.extensions.length > 0 ||
    filter.datePreset !== 'all' ||
    filter.minSizeBytes > 0 ||
    filter.searchQuery.trim() !== '';

  return (
    <div className="filter-container">
      {/* Row 1: Filename Search, Category Pills, and Reset */}
      <div className="filter-row-top">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={filter.searchQuery}
            onChange={e => onFilterChange({ ...filter, searchQuery: e.target.value })}
          />
        </div>

        <div className="category-pills">
          <button
            className={`cat-pill ${filter.categories.length === 0 ? 'selected' : ''}`}
            onClick={() => onFilterChange({ ...filter, categories: [] })}
          >
            <Layers size={13} />
            <span>All</span>
          </button>

          {CATEGORY_ITEMS.map(item => {
            const Icon = item.icon;
            const isSelected = filter.categories.includes(item.id);
            return (
              <button
                key={item.id}
                className={`cat-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleCategory(item.id)}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {isFilterActive && (
          <button
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '11px' }}
            onClick={onResetFilter}
            title="Clear all active filters"
          >
            <X size={12} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Row 2: Custom Extension Search, Active Ext Tags & Quick Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '4px 0' }}>
        {/* Custom Extension Input Field */}
        <form onSubmit={handleAddCustomExt} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Tag size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Custom ext (e.g. .iso, .log, .zip)"
              value={customExtInput}
              onChange={e => setCustomExtInput(e.target.value)}
              style={{
                paddingLeft: '26px',
                paddingRight: '28px',
                width: '210px',
                fontSize: '11px',
                height: '28px'
              }}
            />
            {customExtInput && (
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: '4px',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '10px'
                }}
                title="Add extension filter"
              >
                <Plus size={12} />
              </button>
            )}
          </div>
        </form>

        {/* Active Selected Extension Tags */}
        {filter.extensions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Active Types:</span>
            {filter.extensions.map(ext => (
              <span
                key={ext}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                .{ext}
                <X
                  size={11}
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }}
                  onClick={() => removeExtension(ext)}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                />
              </span>
            ))}
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => onFilterChange({ ...filter, extensions: [] })}
            >
              Clear
            </button>
          </div>
        )}

        {/* Quick Top Extension Chips */}
        {topExtensions.length > 0 && filter.extensions.length === 0 && (
          <div className="extension-chips-container">
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              Discovered:
            </span>
            {topExtensions.map(([ext, info]) => {
              const isSelected = filter.extensions.includes(ext);
              return (
                <button
                  key={ext}
                  className={`ext-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleExtension(ext)}
                  title={`${info.count} files, ${formatBytes(info.bytes)}`}
                >
                  .{ext} <span style={{ color: 'var(--text-dim)' }}>({info.count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: Date Mode / Date Range & Size Threshold */}
      <div className="filter-row-bottom">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={13} style={{ color: 'var(--text-dim)' }} />
          <select
            value={filter.dateMode}
            onChange={e => handleDateModeChange(e.target.value as DateMode)}
          >
            <option value="modified">Modified Date</option>
            <option value="created">Created Date</option>
            <option value="accessed">Accessed Date</option>
          </select>

          <select
            value={filter.datePreset}
            onChange={e => handleDatePresetChange(e.target.value as DatePreset)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
            <option value="90days">Past 90 Days</option>
            <option value="6months">Past 6 Months</option>
            <option value="1year">Past 1 Year</option>
            <option value="older_1year">Older than 1 Year (&gt;365d)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filter.datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={filter.customStartDate || ''}
                onChange={e => onFilterChange({ ...filter, customStartDate: e.target.value })}
              />
              <span style={{ color: 'var(--text-dim)' }}>-</span>
              <input
                type="date"
                value={filter.customEndDate || ''}
                onChange={e => onFilterChange({ ...filter, customEndDate: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Part Selector Dropdown (Shown when more than 1 part has been scanned) */}
        {availableParts.length > 1 && onSelectPartFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>Part:</span>
            <select
              value={selectedPartFilter}
              onChange={e => onSelectPartFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{
                border: selectedPartFilter !== 'all' ? '1px solid var(--accent-primary)' : undefined,
                background: selectedPartFilter !== 'all' ? 'rgba(59, 130, 246, 0.1)' : undefined,
                fontWeight: selectedPartFilter !== 'all' ? 700 : 500
              }}
              title="Navigate and isolate specific scan parts"
            >
              <option value="all">
                🌐 All Scanned Parts (1–{availableParts.length} • {files.length.toLocaleString()} files • {formatBytes(files.reduce((s, f) => s + f.size, 0))})
              </option>
              {availableParts.map(p => {
                const partFiles = files.filter(f => (f.scanPart || 1) === p);
                const count = partFiles.length;
                const partBytes = partFiles.reduce((s, f) => s + f.size, 0);
                return (
                  <option key={p} value={p}>
                    📦 Part {p} ({count.toLocaleString()} files • {formatBytes(partBytes)})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SlidersHorizontal size={13} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Minimum Size:</span>
          <select
            value={filter.minSizeBytes}
            onChange={e => handleSizeFilter(Number(e.target.value))}
            title="Filter by Minimum File Size"
          >
            <option value={0}>Any Size</option>
            <option value={10 * 1024 * 1024}>&gt; 10 MB</option>
            <option value={50 * 1024 * 1024}>&gt; 50 MB</option>
            <option value={100 * 1024 * 1024}>&gt; 100 MB</option>
            <option value={500 * 1024 * 1024}>&gt; 500 MB</option>
            <option value={1024 * 1024 * 1024}>&gt; 1 GB</option>
          </select>
        </div>
      </div>
    </div>
  );
};
