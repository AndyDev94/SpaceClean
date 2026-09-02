import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format, subDays, isBefore, getYear } from 'date-fns';

interface MediaGalleryProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSetSelectedPaths: (paths: Set<string>) => void;
  onSelectPreview: (file: FileInfo) => void;
  onOpenDeleteModal: () => void;
}

type MediaFilterType = 'all' | 'video' | 'image';
type GridSize = 'compact' | 'standard' | 'large' | 'list';
type DateFilterPreset = 'all' | 'today' | '7days' | '30days' | '90days' | '6months' | '1year' | 'older_1year';
type SortOption =
  | 'size_desc'
  | 'size_asc'
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'type_asc';

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
  const [minSizeBytes, setMinSizeBytes] = useState<number>(0);
  const [selectedExtension, setSelectedExtension] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('size_desc');

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

  // Filter media files with full date, size, type, extension, and search
  const filteredMediaFiles = useMemo(() => {
    const now = new Date();

    return files.filter(f => {
      // 1. Category check
      if (f.category !== 'image' && f.category !== 'video') return false;
      if (mediaType === 'video' && f.category !== 'video') return false;
      if (mediaType === 'image' && f.category !== 'image') return false;

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

      // 5. Date preset filter
      if (datePreset !== 'all') {
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
  }, [files, mediaType, selectedExtension, minSizeBytes, searchQuery, datePreset, sortBy]);

  const totalMediaBytes = useMemo(() => {
    return filteredMediaFiles.reduce((acc, f) => acc + f.size, 0);
  }, [filteredMediaFiles]);

  const selectedMediaCount = useMemo(() => {
    return filteredMediaFiles.filter(f => selectedPaths.has(f.path)).length;
  }, [filteredMediaFiles, selectedPaths]);

  const selectedMediaBytes = useMemo(() => {
    return filteredMediaFiles
      .filter(f => selectedPaths.has(f.path))
      .reduce((acc, f) => acc + f.size, 0);
  }, [filteredMediaFiles, selectedPaths]);

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedPaths);
    filteredMediaFiles.filter(f => !f.isProtected).forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const handleDeselectFiltered = () => {
    const next = new Set(selectedPaths);
    filteredMediaFiles.forEach(f => next.delete(f.path));
    onSetSelectedPaths(next);
  };

  const handleSelectLargeMedia = (minBytes: number) => {
    const next = new Set(selectedPaths);
    filteredMediaFiles.filter(f => !f.isProtected && f.size >= minBytes).forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const resetAllFilters = () => {
    setMediaType('all');
    setSelectedExtension('all');
    setMinSizeBytes(0);
    setDatePreset('all');
    setSearchQuery('');
    setSortBy('size_desc');
  };

  const isFilterApplied =
    mediaType !== 'all' ||
    selectedExtension !== 'all' ||
    minSizeBytes > 0 ||
    datePreset !== 'all' ||
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
            {filteredMediaFiles.length} media items ({formatBytes(totalMediaBytes)})
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

      {/* Control Bar: Row 1 - Media Type Tabs, Search, Quick Select, Grid Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {/* Media Type Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '4px' }}>
          <button
            className={`btn btn-secondary ${mediaType === 'all' ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '12px', background: mediaType === 'all' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'all' ? '#fff' : undefined }}
            onClick={() => setMediaType('all')}
          >
            All Media ({files.filter(f => f.category === 'image' || f.category === 'video').length})
          </button>
          <button
            className={`btn btn-secondary ${mediaType === 'video' ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'video' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'video' ? '#fff' : undefined }}
            onClick={() => setMediaType('video')}
          >
            <Film size={13} />
            <span>Videos ({files.filter(f => f.category === 'video').length})</span>
          </button>
          <button
            className={`btn btn-secondary ${mediaType === 'image' ? 'active' : ''}`}
            style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: mediaType === 'image' ? 'var(--accent-primary)' : 'transparent', color: mediaType === 'image' ? '#fff' : undefined }}
            onClick={() => setMediaType('image')}
          >
            <ImageIcon size={13} />
            <span>Photos ({files.filter(f => f.category === 'image').length})</span>
          </button>
        </div>

        {/* Filename / Search Box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '300px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search photos & videos..."
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

      {/* Control Bar: Row 2 - Date Filter, Minimum Size Filter, Extension Filter, Sort Selector */}
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
            </select>
          </div>

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
        {filteredMediaFiles.length === 0 ? (
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
                      checked={filteredMediaFiles.length > 0 && filteredMediaFiles.every(f => selectedPaths.has(f.path))}
                      onChange={e => {
                        if (e.target.checked) handleSelectAllFiltered();
                        else handleDeselectFiltered();
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '50px', padding: '8px 10px' }}>Type</th>
                  <th style={{ padding: '8px 10px' }}>File Name</th>
                  <th style={{ padding: '8px 10px' }}>Folder Location</th>
                  <th style={{ width: '110px', padding: '8px 10px', textAlign: 'right' }}>Size</th>
                  <th style={{ width: '110px', padding: '8px 10px' }}>Modified</th>
                  <th style={{ width: '80px', padding: '8px 10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMediaFiles.map((file) => {
                  const isSelected = selectedPaths.has(file.path);
                  const isVideo = file.category === 'video';

                  return (
                    <tr
                      key={file.path}
                      onClick={() => onToggleSelect(file.path)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(239, 68, 68, 0.08)' : undefined,
                        borderBottom: '1px solid var(--border-subtle)'
                      }}
                      className={isSelected ? 'selected' : ''}
                    >
                      <td style={{ textAlign: 'center', padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(file.path)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {isVideo ? (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Film size={10} /> VID
                          </span>
                        ) : (
                          <span style={{ padding: '2px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <ImageIcon size={10} /> PIC
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
                          onClick={() => onSelectPreview(file)}
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
            {filteredMediaFiles.map((file) => {
              const isSelected = selectedPaths.has(file.path);
              const isVideo = file.category === 'video';

              return (
                <div
                  key={file.path}
                  className="glass-panel"
                  style={{
                    height: getTileHeight(),
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => onToggleSelect(file.path)}
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
                    {isVideo ? (
                      <video
                        src={`file:///${file.path.replace(/\\/g, '/')}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        preload="metadata"
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
                        onChange={() => onToggleSelect(file.path)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {isVideo && (
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
