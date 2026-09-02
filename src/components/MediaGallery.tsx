import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Film,
  Grid,
  Trash2,
  CheckCircle,
  Play,
  Maximize2,
  FolderOpen,
  Filter,
  Eye,
  Search,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  X,
  Zap,
  ChevronDown,
  Activity,
  ImagePlay
} from 'lucide-react';
import { FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format, subDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

interface MediaGalleryProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSetSelectedPaths: (paths: Set<string>) => void;
  onSelectPreview: (file: FileInfo) => void;
  onOpenDeleteModal: () => void;
}

type MediaFilterType = 'all' | 'video' | 'image' | 'gif';
type GridSize = 'compact' | 'standard' | 'large' | 'list';
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

type SortOption =
  | 'size_desc'
  | 'size_asc'
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'type_asc';

const INITIAL_BATCH_SIZE = 120;

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  files,
  selectedPaths,
  onToggleSelect,
  onSetSelectedPaths,
  onSelectPreview,
  onOpenDeleteModal,
}) => {
  const [mediaType, setMediaType] = useState<MediaFilterType>('all');
  const [gridSize, setGridSize] = useState<GridSize>('standard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [minSizeBytes, setMinSizeBytes] = useState<number>(0);
  const [selectedExtension, setSelectedExtension] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('size_desc');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Smooth Media Scan state (Progressive chunking for zero lag)
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const [isSmoothScanMode, setIsSmoothScanMode] = useState<boolean>(true);

  // Helper to determine precise media kind (video, gif, photo)
  const getMediaSubtype = (file: FileInfo): 'video' | 'gif' | 'photo' => {
    const ext = (file.extension || '').toLowerCase();
    if (ext === 'gif') return 'gif';
    if (file.category === 'video') return 'video';
    return 'photo';
  };

  // Discover all distinct media extensions in current scan
  const mediaExtensions = useMemo(() => {
    const extMap = new Map<string, number>();
    files.forEach(f => {
      if (f.category === 'image' || f.category === 'video') {
        const ext = (f.extension || '').toLowerCase();
        if (ext) extMap.set(ext, (extMap.get(ext) || 0) + 1);
      }
    });
    return Array.from(extMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [files]);

  // Counts for each subtype
  const counts = useMemo(() => {
    let video = 0;
    let gif = 0;
    let photo = 0;
    files.forEach(f => {
      if (f.category === 'video') video++;
      else if (f.category === 'image') {
        if (f.extension.toLowerCase() === 'gif') gif++;
        else photo++;
      }
    });
    return { all: video + gif + photo, video, gif, photo };
  }, [files]);

  // Filter media files with full date, custom range, size, type, extension, and search
  const allFilteredMediaFiles = useMemo(() => {
    const now = new Date();

    return files.filter(f => {
      // 1. Category and subtype check
      if (f.category !== 'image' && f.category !== 'video') return false;
      const subtype = getMediaSubtype(f);
      if (mediaType === 'video' && subtype !== 'video') return false;
      if (mediaType === 'image' && subtype !== 'photo') return false;
      if (mediaType === 'gif' && subtype !== 'gif') return false;

      // 2. Specific extension filter
      if (selectedExtension !== 'all' && f.extension.toLowerCase() !== selectedExtension.toLowerCase()) {
        return false;
      }

      // 3. Minimum Size filter
      if (minSizeBytes > 0 && f.size < minSizeBytes) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!f.name.toLowerCase().includes(q) && !f.path.toLowerCase().includes(q)) return false;
      }

      // 5. Date preset & Custom Range filter
      const fileDate = new Date(f.modifiedAt || f.createdAt);
      if (datePreset === 'today') {
        if (isBefore(fileDate, subDays(now, 1))) return false;
      } else if (datePreset === '7days') {
        if (isBefore(fileDate, subDays(now, 7))) return false;
      } else if (datePreset === '30days') {
        if (isBefore(fileDate, subDays(now, 30))) return false;
      } else if (datePreset === '90days') {
        if (isBefore(fileDate, subDays(now, 90))) return false;
      } else if (datePreset === '6months') {
        if (isBefore(fileDate, subDays(now, 180))) return false;
      } else if (datePreset === '1year') {
        if (isBefore(fileDate, subDays(now, 365))) return false;
      } else if (datePreset === 'older_1year') {
        if (!isBefore(fileDate, subDays(now, 365))) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const start = startOfDay(new Date(customStartDate));
          if (isBefore(fileDate, start)) return false;
        }
        if (customEndDate) {
          const end = endOfDay(new Date(customEndDate));
          if (isAfter(fileDate, end)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'size_desc':
          return b.size - a.size || b.modifiedAt - a.modifiedAt;
        case 'size_asc':
          return a.size - b.size || b.modifiedAt - a.modifiedAt;
        case 'date_desc':
          return b.modifiedAt - a.modifiedAt || b.size - a.size;
        case 'date_asc':
          return a.modifiedAt - b.modifiedAt || b.size - a.size;
        case 'name_asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        case 'name_desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true });
        case 'type_asc':
          return a.extension.localeCompare(b.extension) || b.size - a.size;
        default:
          return b.size - a.size;
      }
    });
  }, [files, mediaType, selectedExtension, minSizeBytes, searchQuery, datePreset, customStartDate, customEndDate, sortBy]);

  // Sliced items for smooth rendering without DOM freeze
  const displayedMediaFiles = useMemo(() => {
    if (!isSmoothScanMode || visibleCount >= allFilteredMediaFiles.length) {
      return allFilteredMediaFiles;
    }
    return allFilteredMediaFiles.slice(0, visibleCount);
  }, [allFilteredMediaFiles, isSmoothScanMode, visibleCount]);

  const totalMediaBytes = useMemo(() => {
    return allFilteredMediaFiles.reduce((acc, f) => acc + f.size, 0);
  }, [allFilteredMediaFiles]);

  const selectedMediaCount = useMemo(() => {
    return allFilteredMediaFiles.filter(f => selectedPaths.has(f.path)).length;
  }, [allFilteredMediaFiles, selectedPaths]);

  const selectedMediaBytes = useMemo(() => {
    return allFilteredMediaFiles
      .filter(f => selectedPaths.has(f.path))
      .reduce((acc, f) => acc + f.size, 0);
  }, [allFilteredMediaFiles, selectedPaths]);

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedPaths);
    allFilteredMediaFiles.filter(f => !f.isProtected).forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const handleDeselectFiltered = () => {
    const next = new Set(selectedPaths);
    allFilteredMediaFiles.forEach(f => next.delete(f.path));
    onSetSelectedPaths(next);
  };

  const handleSelectLargeMedia = (minBytes: number) => {
    const next = new Set(selectedPaths);
    allFilteredMediaFiles.filter(f => !f.isProtected && f.size >= minBytes).forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const resetAllFilters = () => {
    setMediaType('all');
    setSelectedExtension('all');
    setMinSizeBytes(0);
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    setSortBy('size_desc');
    setVisibleCount(INITIAL_BATCH_SIZE);
  };

  const isFilterApplied =
    mediaType !== 'all' ||
    selectedExtension !== 'all' ||
    minSizeBytes > 0 ||
    datePreset !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    searchQuery.trim() !== '';

  const getTileWidth = () => {
    if (gridSize === 'compact') return '140px';
    if (gridSize === 'large') return '280px';
    return '190px';
  };

  const getTileHeight = () => {
    if (gridSize === 'compact') return '155px';
    if (gridSize === 'large') return '285px';
    return '205px';
  };

  // Keyboard navigation listener (Arrow keys, Spacebar toggle, Enter preview)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (displayedMediaFiles.length === 0) return;

      const cols = gridSize === 'list' ? 1 : gridSize === 'compact' ? 6 : gridSize === 'large' ? 3 : 4;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.min(displayedMediaFiles.length - 1, prev + 1);
          if (next >= visibleCount - 10 && visibleCount < allFilteredMediaFiles.length) {
            setVisibleCount(c => c + INITIAL_BATCH_SIZE);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.min(displayedMediaFiles.length - 1, prev + (gridSize === 'list' ? 1 : cols));
          if (next >= visibleCount - 10 && visibleCount < allFilteredMediaFiles.length) {
            setVisibleCount(c => c + INITIAL_BATCH_SIZE);
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - (gridSize === 'list' ? 1 : cols)));
      } else if (e.key === ' ') {
        e.preventDefault();
        if (displayedMediaFiles[focusedIndex]) {
          onToggleSelect(displayedMediaFiles[focusedIndex].path);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayedMediaFiles[focusedIndex]) {
          onSelectPreview(displayedMediaFiles[focusedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedMediaFiles, allFilteredMediaFiles, focusedIndex, gridSize, visibleCount, onToggleSelect, onSelectPreview]);

  // Ensure focused item is scrolled into view smoothly
  useEffect(() => {
    const activeEl = document.querySelector(`[data-media-index="${focusedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={20} style={{ color: 'var(--accent-primary)' }} />
            Media Gallery & Visual Cleaner
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {allFilteredMediaFiles.length} media items ({formatBytes(totalMediaBytes)})
            {isFilterApplied ? ' matching active filters.' : ' in scanned folder.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedMediaCount > 0 && (
            <button
              className="btn btn-danger"
              onClick={onOpenDeleteModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={15} />
              <span>Delete {selectedMediaCount} Selected ({formatBytes(selectedMediaBytes)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Smooth Media Scan Optimizer Banner */}
      {allFilteredMediaFiles.length > INITIAL_BATCH_SIZE && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            fontSize: '12px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              Smooth Media Scan Optimizer:
            </span>
            <span style={{ color: 'var(--text-dim)' }}>
              Showing Part {Math.ceil(displayedMediaFiles.length / INITIAL_BATCH_SIZE)} ({displayedMediaFiles.length} of {allFilteredMediaFiles.length.toLocaleString()} media loaded without lag)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {displayedMediaFiles.length < allFilteredMediaFiles.length ? (
              <>
                <button
                  className="btn btn-primary"
                  style={{ padding: '3px 10px', fontSize: '11px' }}
                  onClick={() => setVisibleCount(c => Math.min(allFilteredMediaFiles.length, c + INITIAL_BATCH_SIZE))}
                >
                  Load Next Part (+{Math.min(INITIAL_BATCH_SIZE, allFilteredMediaFiles.length - displayedMediaFiles.length)})
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setIsSmoothScanMode(false);
                    setVisibleCount(allFilteredMediaFiles.length);
                  }}
                >
                  Show All ({allFilteredMediaFiles.length.toLocaleString()})
                </button>
              </>
            ) : (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <CheckCircle size={13} /> All {allFilteredMediaFiles.length.toLocaleString()} media items loaded
              </span>
            )}
          </div>
        </div>
      )}

      {/* Control Bar: Row 1 - Media Subtype Tabs (Photos, Videos, GIFs), Search, Shortcuts, Grid Mode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {/* Media Subtype Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '4px' }}>
          <button
            className={`btn btn-secondary ${mediaType === 'all' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', background: mediaType === 'all' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'all' ? '#fff' : undefined }}
            onClick={() => setMediaType('all')}
          >
            All Media ({counts.all})
          </button>
          <button
            className={`btn btn-secondary ${mediaType === 'image' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: mediaType === 'image' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'image' ? '#fff' : undefined }}
            onClick={() => setMediaType('image')}
          >
            <ImageIcon size={13} />
            <span>Photos ({counts.photo})</span>
          </button>
          <button
            className={`btn btn-secondary ${mediaType === 'video' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: mediaType === 'video' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'video' ? '#fff' : undefined }}
            onClick={() => setMediaType('video')}
          >
            <Film size={13} />
            <span>Videos ({counts.video})</span>
          </button>
          <button
            className={`btn btn-secondary ${mediaType === 'gif' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: mediaType === 'gif' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'gif' ? '#fff' : undefined }}
            onClick={() => setMediaType('gif')}
            title="GIF animated images (Frozen preview with badge to avoid memory lag)"
          >
            <ImagePlay size={13} />
            <span>GIFs ({counts.gif})</span>
          </button>
        </div>

        {/* Filename / Search Box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '280px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search photos, videos, GIFs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        {/* Selection Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={handleSelectAllFiltered}
            title="Select all displayed media"
          >
            Select All
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={handleDeselectFiltered}
            title="Deselect all displayed media"
          >
            Deselect
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px', color: '#f87171' }}
            onClick={() => handleSelectLargeMedia(100 * 1024 * 1024)}
            title="Select media larger than 100 MB"
          >
            Select &gt;100MB
          </button>
        </div>

        {/* Grid Size & View Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 6px' }}>View:</span>
          <button
            className={`btn btn-secondary ${gridSize === 'compact' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'compact' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'compact' ? '#fff' : undefined }}
            onClick={() => setGridSize('compact')}
            title="Small compact tiles"
          >
            Small
          </button>
          <button
            className={`btn btn-secondary ${gridSize === 'standard' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'standard' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'standard' ? '#fff' : undefined }}
            onClick={() => setGridSize('standard')}
            title="Standard medium tiles"
          >
            Medium
          </button>
          <button
            className={`btn btn-secondary ${gridSize === 'large' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'large' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'large' ? '#fff' : undefined }}
            onClick={() => setGridSize('large')}
            title="Large detailed preview tiles"
          >
            Large
          </button>
          <button
            className={`btn btn-secondary ${gridSize === 'list' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'list' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'list' ? '#fff' : undefined }}
            onClick={() => setGridSize('list')}
            title="Detailed table list view without tiles"
          >
            List
          </button>
        </div>
      </div>

      {/* Control Bar: Row 2 - Date Preset + Custom Date Range, Minimum Size, Format, Sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date / Time Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date:</span>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as DateFilterPreset)}
              style={{ padding: '3px 8px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', outline: 'none' }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '11px', outline: 'none' }}
              />
            </div>
          )}

          {/* Minimum Size Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <SlidersHorizontal size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Minimum Size:</span>
            <select
              value={minSizeBytes}
              onChange={e => setMinSizeBytes(Number(e.target.value))}
              style={{ padding: '3px 8px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
            >
              <option value={0}>Any Size</option>
              <option value={10 * 1024 * 1024}>&gt; 10 MB</option>
              <option value={50 * 1024 * 1024}>&gt; 50 MB</option>
              <option value={100 * 1024 * 1024}>&gt; 100 MB</option>
              <option value={500 * 1024 * 1024}>&gt; 500 MB</option>
              <option value={1024 * 1024 * 1024}>&gt; 1 GB (Giant Videos)</option>
              <option value={5 * 1024 * 1024 * 1024}>&gt; 5 GB (4K/RAW)</option>
            </select>
          </div>

          {/* Format / Extension Dropdown */}
          {mediaExtensions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Format:</span>
              <select
                value={selectedExtension}
                onChange={e => setSelectedExtension(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
              >
                <option value="all">All Formats</option>
                {mediaExtensions.map(([ext, count]) => (
                  <option key={ext} value={ext}>
                    .{ext.toUpperCase()} ({count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Button */}
          {isFilterApplied && (
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={resetAllFilters}
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            style={{ padding: '3px 8px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
          >
            <option value="size_desc">Largest Size First (Highest GB)</option>
            <option value="size_asc">Smallest Size First</option>
            <option value="date_desc">Newest Date First (Recent)</option>
            <option value="date_asc">Oldest Date First (Forgotten)</option>
            <option value="name_asc">Name A ➔ Z</option>
            <option value="name_desc">Name Z ➔ A</option>
            <option value="type_asc">Format / Extension</option>
          </select>
        </div>
      </div>

      {/* Media Display Area (List vs Tiles) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayedMediaFiles.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Film size={44} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No media files match your criteria</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              {isFilterApplied ? 'Try adjusting your filters or date range.' : 'Scan a drive with images or videos to view them here.'}
            </p>
            {isFilterApplied && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: '12px', fontSize: '12px' }}
                onClick={resetAllFilters}
              >
                Clear Active Filters
              </button>
            )}
          </div>
        ) : gridSize === 'list' ? (
          /* List View without Tiles */
          <div className="table-wrapper" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ width: '38px', padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={displayedMediaFiles.length > 0 && displayedMediaFiles.every(f => selectedPaths.has(f.path))}
                      onChange={e => {
                        if (e.target.checked) handleSelectAllFiltered();
                        else handleDeselectFiltered();
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '55px', padding: '8px 10px' }}>Type</th>
                  <th style={{ padding: '8px 10px' }}>File Name</th>
                  <th style={{ padding: '8px 10px' }}>Folder Location</th>
                  <th style={{ width: '110px', padding: '8px 10px', textAlign: 'right' }}>Size</th>
                  <th style={{ width: '110px', padding: '8px 10px' }}>Modified</th>
                  <th style={{ width: '80px', padding: '8px 10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedMediaFiles.map((file, idx) => {
                  const isSelected = selectedPaths.has(file.path);
                  const isFocused = focusedIndex === idx;
                  const subtype = getMediaSubtype(file);

                  return (
                    <tr
                      key={file.path}
                      data-media-index={idx}
                      onClick={() => {
                        setFocusedIndex(idx);
                        onToggleSelect(file.path);
                      }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isFocused
                          ? 'rgba(59, 130, 246, 0.12)'
                          : undefined,
                        borderLeft: isFocused ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                      className={`${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                    >
                      <td style={{ textAlign: 'center', padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setFocusedIndex(idx);
                            onToggleSelect(file.path);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {subtype === 'video' ? (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Film size={10} /> VIDEO
                          </span>
                        ) : subtype === 'gif' ? (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ImagePlay size={10} /> GIF
                          </span>
                        ) : (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ImageIcon size={10} /> PHOTO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 500, color: isSelected ? '#f87171' : 'var(--text-main)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                        {file.name}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-dim)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.path}>
                        {file.path}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: file.size > 1024 * 1024 * 500 ? '#ff6b81' : 'var(--text-main)' }}>
                        {file.formattedSize}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-dim)' }}>
                        {format(new Date(file.modifiedAt || file.createdAt), 'yyyy-MM-dd')}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          onClick={() => {
                            setFocusedIndex(idx);
                            onSelectPreview(file);
                          }}
                          title="Open Live Preview"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Tiles View */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${getTileWidth()}, 1fr))`,
              gap: '12px',
              paddingBottom: '20px'
            }}
          >
            {displayedMediaFiles.map((file, idx) => {
              const isSelected = selectedPaths.has(file.path);
              const isFocused = focusedIndex === idx;
              const subtype = getMediaSubtype(file);

              return (
                <div
                  key={file.path}
                  data-media-index={idx}
                  className="glass-panel"
                  style={{
                    height: getTileHeight(),
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isFocused
                      ? '2px solid var(--accent-primary)'
                      : isSelected
                      ? '2px solid #ef4444'
                      : '1px solid var(--border-color)',
                    boxShadow: isFocused ? '0 0 12px rgba(59, 130, 246, 0.4)' : undefined,
                    background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setFocusedIndex(idx);
                    onToggleSelect(file.path);
                  }}
                >
                  {/* Thumbnail / Media Container */}
                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      background: '#090d16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {subtype === 'video' ? (
                      <video
                        src={`file:///${file.path.replace(/\\/g, '/')}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        preload="none"
                        muted
                      />
                    ) : (
                      <img
                        src={`file:///${file.path.replace(/\\/g, '/')}`}
                        alt={file.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* Overlay Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setFocusedIndex(idx);
                          onToggleSelect(file.path);
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />

                      {/* Precise Media Type Badges: PHOTO, GIF, VIDEO */}
                      {subtype === 'video' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.85)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Play size={10} fill="#fff" /> VIDEO
                        </span>
                      )}
                      {subtype === 'gif' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.9)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <ImagePlay size={10} /> GIF
                        </span>
                      )}
                      {subtype === 'photo' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.85)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <ImageIcon size={10} /> PHOTO
                        </span>
                      )}
                    </div>

                    {/* Preview Trigger Button */}
                    <button
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        zIndex: 2,
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedIndex(idx);
                        onSelectPreview(file);
                      }}
                      title="Inspect in Live Preview Drawer"
                    >
                      <Eye size={12} />
                      {gridSize === 'large' && <span>Preview</span>}
                    </button>
                  </div>

                  {/* Tile Bottom Info */}
                  <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isSelected ? '#f87171' : 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      <span style={{ fontWeight: 700, color: file.size > 1024 * 1024 * 500 ? '#ff6b81' : undefined }}>
                        {file.formattedSize}
                      </span>
                      <span>{format(new Date(file.modifiedAt || file.createdAt), 'yyyy-MM-dd')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
