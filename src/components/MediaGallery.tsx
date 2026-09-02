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
  ImagePlay,
  Clock,
  Camera,
  Scissors
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

type MediaFilterType = 'all' | 'video' | 'image' | 'gif' | 'screenshot' | 'heavy';
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

const BATCH_SIZE = 150;

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

  // Auto-Smooth Infinite Scrolling (Auto progressive batches on scroll)
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to determine precise media kind (video, gif, screenshot, photo)
  const isScreenshotFile = (name: string): boolean => {
    const lower = name.toLowerCase();
    return (
      lower.includes('screenshot') ||
      lower.includes('screen shot') ||
      lower.includes('capture') ||
      lower.includes('snip') ||
      lower.includes('screen_') ||
      lower.includes('rec_')
    );
  };

  const getMediaSubtype = (file: FileInfo): 'video' | 'gif' | 'screenshot' | 'photo' => {
    const ext = (file.extension || '').toLowerCase();
    if (ext === 'gif') return 'gif';
    if (file.category === 'video') return 'video';
    if (isScreenshotFile(file.name)) return 'screenshot';
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

  // Counts for each smart filter category
  const smartCounts = useMemo(() => {
    let video = 0;
    let gif = 0;
    let photo = 0;
    let screenshot = 0;
    let heavy = 0;

    files.forEach(f => {
      if (f.category === 'image' || f.category === 'video') {
        const ext = (f.extension || '').toLowerCase();
        if (f.category === 'video') video++;
        else if (ext === 'gif') gif++;
        else if (isScreenshotFile(f.name)) screenshot++;
        else photo++;

        if (f.size >= 100 * 1024 * 1024) heavy++;
      }
    });

    return {
      all: video + gif + photo + screenshot,
      video,
      gif,
      photo: photo + screenshot,
      screenshot,
      heavy
    };
  }, [files]);

  // Filter media files
  const allFilteredMediaFiles = useMemo(() => {
    const now = new Date();

    return files.filter(f => {
      if (f.category !== 'image' && f.category !== 'video') return false;
      const subtype = getMediaSubtype(f);

      // Smart preset filtering
      if (mediaType === 'video' && f.category !== 'video') return false;
      if (mediaType === 'image' && f.category !== 'image') return false;
      if (mediaType === 'gif' && subtype !== 'gif') return false;
      if (mediaType === 'screenshot' && !isScreenshotFile(f.name)) return false;
      if (mediaType === 'heavy' && f.size < 100 * 1024 * 1024) return false;

      // Specific extension filter
      if (selectedExtension !== 'all' && f.extension.toLowerCase() !== selectedExtension.toLowerCase()) {
        return false;
      }

      // Minimum Size filter
      if (minSizeBytes > 0 && f.size < minSizeBytes) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!f.name.toLowerCase().includes(q) && !f.path.toLowerCase().includes(q)) return false;
      }

      // Date preset & Custom Range filter
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

  // Displayed items with auto-smooth progressive streaming
  const displayedMediaFiles = useMemo(() => {
    return allFilteredMediaFiles.slice(0, visibleCount);
  }, [allFilteredMediaFiles, visibleCount]);

  // Auto-load next batch on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      if (visibleCount < allFilteredMediaFiles.length) {
        setVisibleCount(prev => Math.min(allFilteredMediaFiles.length, prev + BATCH_SIZE));
      }
    }
  };

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

  const handleSelectHeavyMedia = () => {
    const next = new Set(selectedPaths);
    allFilteredMediaFiles
      .filter(f => !f.isProtected && f.size >= 100 * 1024 * 1024)
      .forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const handleSelectScreenshots = () => {
    const next = new Set(selectedPaths);
    allFilteredMediaFiles
      .filter(f => !f.isProtected && isScreenshotFile(f.name))
      .forEach(f => next.add(f.path));
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
    setVisibleCount(BATCH_SIZE);
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
          if (next >= visibleCount - 15 && visibleCount < allFilteredMediaFiles.length) {
            setVisibleCount(c => c + BATCH_SIZE);
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
          if (next >= visibleCount - 15 && visibleCount < allFilteredMediaFiles.length) {
            setVisibleCount(c => c + BATCH_SIZE);
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
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden', position: 'relative' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={20} style={{ color: 'var(--accent-primary)' }} />
            Media Gallery & Visual Cleaner
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {allFilteredMediaFiles.length.toLocaleString()} media items ({formatBytes(totalMediaBytes)}) in scanned folder
            {displayedMediaFiles.length < allFilteredMediaFiles.length && (
              <span style={{ color: 'var(--accent-primary)', marginLeft: '6px' }}>
                • Auto-streaming ({displayedMediaFiles.length} loaded smoothly)
              </span>
            )}
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

      {/* Smart Quick-Clean Presets Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Smart Media Views:
        </span>

        {/* All */}
        <button
          className={`btn btn-secondary ${mediaType === 'all' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', background: mediaType === 'all' ? 'var(--accent-primary)' : 'var(--bg-card)', color: mediaType === 'all' ? '#fff' : undefined }}
          onClick={() => setMediaType('all')}
        >
          All ({smartCounts.all})
        </button>

        {/* Heavy Videos */}
        <button
          className={`btn btn-secondary ${mediaType === 'heavy' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'heavy' ? '#ef4444' : 'var(--bg-card)', color: mediaType === 'heavy' ? '#fff' : '#f87171' }}
          onClick={() => setMediaType('heavy')}
          title="Large videos and media over 100 MB"
        >
          <Zap size={13} />
          <span>Heavy Videos &gt;100MB ({smartCounts.heavy})</span>
        </button>

        {/* Screenshots */}
        <button
          className={`btn btn-secondary ${mediaType === 'screenshot' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'screenshot' ? 'var(--accent-primary)' : 'var(--bg-card)', color: mediaType === 'screenshot' ? '#fff' : undefined }}
          onClick={() => setMediaType('screenshot')}
          title="Screenshots, screen recordings, and snips"
        >
          <Scissors size={13} />
          <span>Screenshots & Clutter ({smartCounts.screenshot})</span>
        </button>

        {/* Photos */}
        <button
          className={`btn btn-secondary ${mediaType === 'image' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'image' ? 'var(--accent-primary)' : 'var(--bg-card)', color: mediaType === 'image' ? '#fff' : undefined }}
          onClick={() => setMediaType('image')}
        >
          <ImageIcon size={13} />
          <span>Photos ({smartCounts.photo})</span>
        </button>

        {/* Videos */}
        <button
          className={`btn btn-secondary ${mediaType === 'video' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'video' ? 'var(--accent-primary)' : 'var(--bg-card)', color: mediaType === 'video' ? '#fff' : undefined }}
          onClick={() => setMediaType('video')}
        >
          <Film size={13} />
          <span>Videos ({smartCounts.video})</span>
        </button>

        {/* GIFs */}
        <button
          className={`btn btn-secondary ${mediaType === 'gif' ? 'active' : ''}`}
          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'gif' ? 'var(--accent-primary)' : 'var(--bg-card)', color: mediaType === 'gif' ? '#fff' : undefined }}
          onClick={() => setMediaType('gif')}
        >
          <ImagePlay size={13} />
          <span>GIFs ({smartCounts.gif})</span>
        </button>
      </div>

      {/* Control Bar: Search, Quick Selection Shortcuts, Grid Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {/* Filename / Search Box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '300px' }}>
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

        {/* Smart Selection Shortcuts */}
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
            title="Deselect all media"
          >
            Deselect
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px', color: '#ff6b81' }}
            onClick={handleSelectHeavyMedia}
            title="Select all media larger than 100 MB"
          >
            Select &gt;100MB
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={handleSelectScreenshots}
            title="Select all screenshot captures"
          >
            Select Screenshots
          </button>
        </div>

        {/* Grid View Zoom Controls */}
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

      {/* Media Display Area (List vs Tiles) with Auto-Smooth Stream Scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto' }}
      >
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
                  <th style={{ width: '65px', padding: '8px 10px' }}>Type</th>
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
                        ) : subtype === 'screenshot' ? (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Scissors size={10} /> SNIP
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
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: file.size > 1024 * 1024 * 100 ? '#ff6b81' : 'var(--text-main)' }}>
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
                  {/* Thumbnail Container (Hardware Friendly & Lazy Loaded) */}
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
                      /* Camera roll video poster */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #111827 0%, #1e1b4b 100%)',
                          color: '#fff',
                          gap: '6px'
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1.5px solid rgba(239, 68, 68, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444'
                          }}
                        >
                          <Play size={18} fill="#ef4444" />
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>
                          .{file.extension} Video
                        </span>
                      </div>
                    ) : (
                      <img
                        src={`file:///${file.path.replace(/\\/g, '/')}`}
                        alt={file.name}
                        loading="lazy"
                        decoding="async"
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

                      {/* Precise Media Type Badges: PHOTO, GIF, VIDEO, SNIP */}
                      {subtype === 'video' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.9)',
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
                            background: 'rgba(245, 158, 11, 0.95)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <ImagePlay size={10} /> GIF
                        </span>
                      )}
                      {subtype === 'screenshot' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(59, 130, 246, 0.9)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Scissors size={10} /> SNIP
                        </span>
                      )}
                      {subtype === 'photo' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.9)',
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
                      <span style={{ fontWeight: 700, color: file.size > 1024 * 1024 * 100 ? '#ff6b81' : undefined }}>
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

      {/* Floating Action Pill When Items Are Selected */}
      {selectedMediaCount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(239, 68, 68, 0.2)',
            borderRadius: '9999px',
            padding: '7px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 10,
            backdropFilter: 'blur(12px)',
            maxWidth: '90%'
          }}
        >
          {/* Left: High-contrast Selection Count & Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ fontWeight: 700, color: '#ff6b81' }}>
              {selectedMediaCount} Selected
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              {formatBytes(selectedMediaBytes)}
            </span>
          </div>

          {/* Right: Clean Selected (with visible size) + Cancel Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-danger"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
              }}
              onClick={onOpenDeleteModal}
              title="Delete all selected media items"
            >
              <Trash2 size={13} />
              <span>Clean Selected ({formatBytes(selectedMediaBytes)})</span>
            </button>

            <button
              className="btn btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#f1f5f9',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
              onClick={handleDeselectFiltered}
              title="Deselect all selected media"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
