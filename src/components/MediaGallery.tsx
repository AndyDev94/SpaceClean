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
  Eye
} from 'lucide-react';
import { FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';

interface MediaGalleryProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSetSelectedPaths: (paths: Set<string>) => void;
  onSelectPreview: (file: FileInfo) => void;
  onOpenDeleteModal: () => void;
}

type MediaFilterType = 'all' | 'video' | 'image';
type GridSize = 'compact' | 'standard' | 'large';

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
  const [sortBy, setSortBy] = useState<'size' | 'date' | 'name'>('size');

  // Filter media files
  const mediaFiles = useMemo(() => {
    return files.filter(f => {
      if (f.category !== 'image' && f.category !== 'video') return false;
      if (mediaType === 'video' && f.category !== 'video') return false;
      if (mediaType === 'image' && f.category !== 'image') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!f.name.toLowerCase().includes(q) && !f.extension.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'date') return b.modifiedAt - a.modifiedAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [files, mediaType, searchQuery, sortBy]);

  const totalMediaBytes = useMemo(() => {
    return mediaFiles.reduce((acc, f) => acc + f.size, 0);
  }, [mediaFiles]);

  const selectedMediaCount = useMemo(() => {
    return mediaFiles.filter(f => selectedPaths.has(f.path)).length;
  }, [mediaFiles, selectedPaths]);

  const selectedMediaBytes = useMemo(() => {
    return mediaFiles
      .filter(f => selectedPaths.has(f.path))
      .reduce((acc, f) => acc + f.size, 0);
  }, [mediaFiles, selectedPaths]);

  const handleSelectAllMedia = () => {
    const next = new Set(selectedPaths);
    mediaFiles.filter(f => !f.isProtected).forEach(f => next.add(f.path));
    onSetSelectedPaths(next);
  };

  const handleDeselectAllMedia = () => {
    const next = new Set(selectedPaths);
    mediaFiles.forEach(f => next.delete(f.path));
    onSetSelectedPaths(next);
  };

  const getTileWidth = () => {
    if (gridSize === 'compact') return '140px';
    if (gridSize === 'large') return '280px';
    return '190px'; // standard
  };

  const getTileHeight = () => {
    if (gridSize === 'compact') return '150px';
    if (gridSize === 'large') return '280px';
    return '200px';
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={20} style={{ color: 'var(--accent-primary)' }} />
            Media Gallery & Visual Cleaner
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {mediaFiles.length} media items ({formatBytes(totalMediaBytes)}) in current scan location.
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

      {/* Control Bar: Filters, Search, Grid Sizing */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

        {/* Selection Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={handleSelectAllMedia}
          >
            Select All
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={handleDeselectAllMedia}
          >
            Deselect All
          </button>
        </div>

        {/* Grid Size Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 6px' }}>Grid Size:</span>
          <button
            className={`btn btn-secondary ${gridSize === 'compact' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'compact' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'compact' ? '#fff' : undefined }}
            onClick={() => setGridSize('compact')}
            title="Compact Tiles (Small)"
          >
            Small
          </button>
          <button
            className={`btn btn-secondary ${gridSize === 'standard' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'standard' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'standard' ? '#fff' : undefined }}
            onClick={() => setGridSize('standard')}
            title="Standard Tiles (Medium)"
          >
            Medium
          </button>
          <button
            className={`btn btn-secondary ${gridSize === 'large' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: gridSize === 'large' ? 'var(--accent-primary)' : 'transparent', color: gridSize === 'large' ? '#fff' : undefined }}
            onClick={() => setGridSize('large')}
            title="Large Tiles (Detailed)"
          >
            Large
          </button>
        </div>
      </div>

      {/* Media Tiles Grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {mediaFiles.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Film size={44} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No media files found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Scan a drive with images or videos to view them here.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${getTileWidth()}, 1fr))`,
              gap: '12px',
              paddingBottom: '20px'
            }}
          >
            {mediaFiles.map((file) => {
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
                          // Fallback on error
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
                        background: 'rgba(15, 23, 42, 0.8)',
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
                      <span>.{file.extension}</span>
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
