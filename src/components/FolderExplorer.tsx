import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FolderTree,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Trash2,
  ExternalLink,
  Shield,
  ShieldAlert,
  HardDrive,
  CornerDownRight,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { FolderInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';

interface FolderExplorerProps {
  currentRootPath: string;
  folders: FolderInfo[];
  onNavigateToFolder: (path: string) => void;
  onScanFolder: (path: string) => void;
  onOpenDeleteModalForPaths: (paths: string[]) => void;
}

type FolderSortBy = 'size' | 'fileCount' | 'name' | 'modifiedAt';

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  currentRootPath,
  folders,
  onNavigateToFolder,
  onScanFolder,
  onOpenDeleteModalForPaths,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<FolderSortBy>('size');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<Set<string>>(new Set());

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    const parts = currentRootPath.split(/[\\/]/).filter(Boolean);
    const crumbs: Array<{ name: string; path: string }> = [];
    let accumulated = '';

    parts.forEach((p, index) => {
      if (index === 0 && p.includes(':')) {
        accumulated = p + '\\';
      } else {
        accumulated = accumulated ? accumulated + (accumulated.endsWith('\\') ? '' : '\\') + p : p;
      }
      crumbs.push({ name: p, path: accumulated });
    });

    return crumbs;
  }, [currentRootPath]);

  // Handle up one level
  const handleUpLevel = () => {
    if (breadcrumbs.length > 1) {
      const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
      onNavigateToFolder(parentPath);
    }
  };

  // Filter & sort folders
  const filteredFolders = useMemo(() => {
    let list = folders.filter(f => f.path !== currentRootPath);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }

    // Robust Sort
    return [...list].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'size') {
        const sizeA = Number(a.size) || 0;
        const sizeB = Number(b.size) || 0;
        comp = sizeA - sizeB;
      } else if (sortBy === 'fileCount') {
        const cntA = Number(a.fileCount) || 0;
        const cntB = Number(b.fileCount) || 0;
        comp = cntA - cntB;
      } else if (sortBy === 'name') {
        comp = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'modifiedAt') {
        const modA = Number(a.modifiedAt) || 0;
        const modB = Number(b.modifiedAt) || 0;
        comp = modA - modB;
      }
      if (comp === 0) {
        comp = (a.name || '').localeCompare(b.name || '');
      }
      return sortOrder === 'desc' ? -comp : comp;
    });
  }, [folders, currentRootPath, searchQuery, sortBy, sortOrder]);

  const maxFolderSize = filteredFolders.length > 0 ? filteredFolders[0].size : 1;

  const handleToggleSort = (field: FolderSortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleToggleSelect = (path: string, isProtected: boolean) => {
    if (isProtected) return; // Disallow selecting protected system folders
    const next = new Set(selectedFolderPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedFolderPaths(next);
  };

  const handleSelectAllNonProtected = () => {
    const next = new Set(selectedFolderPaths);
    filteredFolders.filter(f => !f.isProtected).forEach(f => next.add(f.path));
    setSelectedFolderPaths(next);
  };

  const handleDeselectAll = () => {
    setSelectedFolderPaths(new Set());
  };

  const handleShowInExplorer = async (folderPath: string) => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(folderPath);
    }
  };

  const totalSelectedBytes = filteredFolders
    .filter(f => selectedFolderPaths.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  const renderSortIcon = (field: FolderSortBy) => {
    if (sortBy !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />;
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} style={{ color: 'var(--accent-cyan)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} style={{ color: 'var(--accent-cyan)', marginLeft: 4 }} />
    );
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden', position: 'relative' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderTree size={18} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Folder Size Analyzer & Tree Manager
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Rank folders by disk footprint, navigate directories, and safely clean bloated folders.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onScanFolder(currentRootPath)}
            title="Scan this specific directory"
          >
            <RefreshCw size={13} />
            <span>Deep Scan This Folder</span>
          </button>
        </div>
      </div>

      {/* Interactive Breadcrumb Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '12px', overflowX: 'auto' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          disabled={breadcrumbs.length <= 1}
          onClick={handleUpLevel}
          title="Go up one folder level"
        >
          <ArrowUp size={13} />
          <span>Up</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
          <HardDrive size={14} style={{ color: 'var(--accent-cyan)' }} />
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: idx === breadcrumbs.length - 1 ? '#38bdf8' : 'var(--text-secondary)',
                  fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => onNavigateToFolder(crumb.path)}
                title={`Jump to ${crumb.path}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ maxWidth: '320px' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search folders by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</span>
          <button
            className={`btn btn-secondary ${sortBy === 'size' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => handleToggleSort('size')}
          >
            <span>Size</span>
            {renderSortIcon('size')}
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'fileCount' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => handleToggleSort('fileCount')}
          >
            <span>Files</span>
            {renderSortIcon('fileCount')}
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'name' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => handleToggleSort('name')}
          >
            <span>Name</span>
            {renderSortIcon('name')}
          </button>
        </div>
      </div>

      {/* Folder Table List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredFolders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Folder size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)' }}>No subfolders found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Click 'Deep Scan This Folder' to analyze nested directories.</p>
          </div>
        ) : (
          filteredFolders.map((folder, idx) => {
            const isSelected = selectedFolderPaths.has(folder.path);
            const percentage = maxFolderSize > 0 ? Math.max(3, (folder.size / maxFolderSize) * 100) : 0;

            return (
              <div
                key={folder.path}
                className="panel"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderColor: isSelected ? 'var(--accent-danger)' : folder.isProtected ? 'rgba(59, 130, 246, 0.3)' : undefined,
                  background: isSelected ? 'var(--bg-subtle)' : folder.isProtected ? 'rgba(59, 130, 246, 0.04)' : undefined,
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left section: Checkbox, Folder Icon, Name, and Relative Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: folder.isProtected ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleToggleSelect(folder.path, folder.isProtected)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={folder.isProtected}
                      onChange={() => handleToggleSelect(folder.path, folder.isProtected)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: folder.isProtected ? 'not-allowed' : 'pointer', opacity: folder.isProtected ? 0.3 : 1 }}
                      title={folder.isProtected ? 'Protected System Folder (Safety Lock)' : 'Select for deletion'}
                    />
                  </div>

                  <div
                    style={{ color: folder.isProtected ? '#60a5fa' : 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => onNavigateToFolder(folder.path)}
                  >
                    <Folder size={18} fill="currentColor" fillOpacity={0.2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigateToFolder(folder.path)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {folder.name}
                      </span>

                      {folder.isProtected && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '10px', fontWeight: 600 }}>
                          <Shield size={11} /> Protected
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }} title={folder.path}>
                      {folder.path}
                    </div>

                    {/* Proportional size bar */}
                    <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: folder.isProtected
                            ? '#3b82f6'
                            : 'var(--accent-primary)',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right section: Size, File Count & Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {folder.formattedSize}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {folder.fileCount.toLocaleString()} files
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 6px' }}
                      title="Show in File Explorer"
                      onClick={() => handleShowInExplorer(folder.path)}
                    >
                      <FolderOpen size={13} />
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 6px' }}
                      title="Explore inside this folder"
                      onClick={() => onNavigateToFolder(folder.path)}
                    >
                      <CornerDownRight size={13} />
                    </button>

                    {!folder.isProtected && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 6px', color: '#ff6b81' }}
                        title="Delete this folder"
                        onClick={() => onOpenDeleteModalForPaths([folder.path])}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Bar for Selected Folders */}
      {selectedFolderPaths.size > 0 && (
        <div className="floating-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              {selectedFolderPaths.size} {selectedFolderPaths.size === 1 ? 'folder' : 'folders'} selected
            </span>
            <span style={{ fontSize: '12px', color: '#ff6b81', fontWeight: 700 }}>
              ({formatBytes(totalSelectedBytes)} space to free)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={handleDeselectAll}
            >
              Clear
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 16px', fontSize: '13px' }}
              onClick={() => onOpenDeleteModalForPaths(Array.from(selectedFolderPaths))}
            >
              <Trash2 size={15} />
              <span>Clean / Delete Selected Folders</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
