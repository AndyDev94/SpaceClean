import React, { useState, useMemo } from 'react';
import {
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Archive,
  Code2,
  Trash,
  File,
  FolderOpen,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Info,
  Sparkles,
  HardDrive,
  Play,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { FileInfo, FilterState, FileCategory } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { osProtectedFileLabel } from '../utils/platform';
import { formatDisplayDate, usePreferredDateFormat } from '../utils/dateUtils';

interface FileTableProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectOlderThanDays: (days: number) => void;
  onOpenDeleteModal: () => void;
  filter: FilterState;
  onSortChange: (sortBy: FilterState['sortBy']) => void;
  onPreviewFile?: (file: FileInfo) => void;
  previewedFilePath?: string | null;
  onBrowseFolder?: () => void;
  onStartScan?: () => void;
  selectedPath?: string;
}

export const FileTable: React.FC<FileTableProps> = ({
  files,
  selectedPaths,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onSelectOlderThanDays,
  onOpenDeleteModal,
  filter,
  onSortChange,
  onPreviewFile,
  previewedFilePath,
  onBrowseFolder,
  onStartScan,
  selectedPath,
}) => {
  const preferredDateFormat = usePreferredDateFormat();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(100);

  const numericPageSize = pageSize === 'all' ? Infinity : Number(pageSize);
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(files.length / numericPageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedFiles = useMemo(() => {
    if (pageSize === 'all') return files;
    const startIndex = (validCurrentPage - 1) * numericPageSize;
    return files.slice(startIndex, startIndex + numericPageSize);
  }, [files, validCurrentPage, pageSize, numericPageSize]);

  const getCategoryIcon = (cat: FileCategory) => {
    switch (cat) {
      case 'video': return <Film size={14} className="text-red-400" />;
      case 'image': return <ImageIcon size={14} className="text-emerald-400" />;
      case 'audio': return <Music size={14} className="text-amber-400" />;
      case 'document': return <FileText size={14} className="text-blue-400" />;
      case 'archive': return <Archive size={14} className="text-purple-400" />;
      case 'code': return <Code2 size={14} className="text-pink-400" />;
      case 'system': return <Trash size={14} className="text-slate-400" />;
      default: return <File size={14} className="text-slate-400" />;
    }
  };

  const handleShowInExplorer = async (filePath: string) => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(filePath);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    if (window.electronAPI?.openFile) {
      await window.electronAPI.openFile(filePath);
    }
  };

  // Sync current page when navigating with Arrow keys
  React.useEffect(() => {
    if (previewedFilePath && pageSize !== 'all') {
      const index = files.findIndex(f => f.path === previewedFilePath);
      if (index !== -1) {
        const targetPage = Math.floor(index / numericPageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [previewedFilePath, files, pageSize, numericPageSize]);

  // Scroll active preview row into view
  React.useEffect(() => {
    if (previewedFilePath) {
      const activeEl = document.querySelector('.file-table tr.preview-active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [previewedFilePath, currentPage]);

  const isAllSelected = files.length > 0 && files.filter(f => !f.isProtected).every(f => selectedPaths.has(f.path));
  const isSomeSelected = files.some(f => selectedPaths.has(f.path)) && !isAllSelected;

  const totalSelectedBytes = files
    .filter(f => selectedPaths.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  const renderSortIcon = (column: FilterState['sortBy']) => {
    if (filter.sortBy !== column) {
      return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />;
    }
    return filter.sortOrder === 'asc' ? (
      <ArrowUp size={12} style={{ color: 'var(--accent-primary)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} style={{ color: 'var(--accent-primary)', marginLeft: 4 }} />
    );
  };

  return (
    <div className="panel file-view-container">
      {/* Table Action Bar */}
      <div className="table-header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
          >
            {isAllSelected ? <CheckSquare size={13} /> : isSomeSelected ? <MinusSquare size={13} /> : <Square size={13} />}
            <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Quick:</span>
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 6px', fontSize: '11px' }}
              onClick={() => onSelectOlderThanDays(30)}
              title="Select files unmodified in the last 30 days"
            >
              <Clock size={11} /> &gt;30d
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 6px', fontSize: '11px' }}
              onClick={() => onSelectOlderThanDays(90)}
              title="Select files unmodified in the last 90 days"
            >
              <Clock size={11} /> &gt;90d
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 6px', fontSize: '11px' }}
              onClick={() => onSelectOlderThanDays(365)}
              title="Select files unmodified in over 1 year"
            >
              <Clock size={11} /> &gt;1y
            </button>
          </div>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
            <span>Rows:</span>
            <select
              value={String(pageSize)}
              onChange={e => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setPageSize(val);
                setCurrentPage(1);
              }}
              style={{ padding: '2px 6px', fontSize: '11px', height: '24px' }}
            >
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
              <option value="250">250 rows</option>
              <option value="500">500 rows</option>
              <option value="all">All ({files.length.toLocaleString()})</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>
              {pageSize === 'all'
                ? `All ${files.length.toLocaleString()} files`
                : files.length > 0
                ? `${(validCurrentPage - 1) * (pageSize as number) + 1}-${Math.min(validCurrentPage * (pageSize as number), files.length)} of ${files.length.toLocaleString()}`
                : '0 files'}
            </span>

            {pageSize !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 5px', height: '24px' }}
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft size={12} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 5px', height: '24px' }}
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={12} />
                </button>
                <span style={{ padding: '0 4px', fontSize: '11px' }}>
                  {validCurrentPage}/{totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 5px', height: '24px' }}
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 5px', height: '24px' }}
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-scroll-area">
        {files.length === 0 ? (
          (filter.searchQuery && filter.searchQuery.trim() !== '') ||
          filter.categories.length > 0 ||
          filter.extensions.length > 0 ||
          filter.datePreset !== 'all' ||
          filter.minSizeBytes > 0 ? (
            /* Filter Empty State */
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>No files match your current search filters</p>
              <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>Try clearing your search query, adjusting date range, or removing file category filters.</p>
            </div>
          ) : (
            /* Clean Starting Screen with Highlighted Browse & Scan Actions */
            <div
              style={{
                padding: '44px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '620px',
                margin: '0 auto'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Ready to Analyze & Clean Disk Space
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '22px', maxWidth: '480px' }}>
                To use the app, pick a drive from the top bar or click below to browse any custom folder and start scanning.
              </p>

              {/* Highlighted Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '28px' }}>
                <button
                  className="btn btn-primary"
                  onClick={onBrowseFolder}
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
                  }}
                  title="Open file dialog to pick any folder"
                >
                  <FolderOpen size={16} />
                  <span>Browse Folder to Scan</span>
                </button>

                {onStartScan && (
                  <button
                    className="btn btn-secondary"
                    onClick={onStartScan}
                    style={{
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    title={`Scan ${selectedPath || 'Selected Drive'}`}
                  >
                    <Play size={15} style={{ color: 'var(--accent-primary)' }} />
                    <span>Scan {selectedPath ? selectedPath : 'Selected Drive'}</span>
                  </button>
                )}
              </div>

              {/* Quick Feature Guides */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>RAM Optimizer</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Scans 500GB+ folders in smooth parts without system lag.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    <HardDrive size={14} style={{ color: '#a855f7' }} />
                    <span>Duplicate Finder</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    MD5 cryptographic checksums identify redundant clones.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    <Layers size={14} style={{ color: '#f59e0b' }} />
                    <span>Smart Findings</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Chronological year waves and safety groups for guided cleaning.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <table className="file-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={isAllSelected ? onDeselectAll : onSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th onClick={() => onSortChange('name')} style={{ minWidth: '240px' }}>
                  Name {renderSortIcon('name')}
                </th>
                <th onClick={() => onSortChange('extension')} style={{ width: '90px' }}>
                  Type {renderSortIcon('extension')}
                </th>
                <th onClick={() => onSortChange('size')} style={{ width: '100px' }}>
                  Size {renderSortIcon('size')}
                </th>
                <th onClick={() => onSortChange('modifiedAt')} style={{ width: '140px' }}>
                  Modified {renderSortIcon('modifiedAt')}
                </th>
                <th style={{ minWidth: '200px' }}>Location</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles.map(file => {
                const isSelected = selectedPaths.has(file.path);
                const isProtected = file.isProtected || false;
                const isPreviewActive = previewedFilePath === file.path;

                return (
                  <tr
                    key={file.path}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === ' ' && !isProtected) {
                        e.preventDefault();
                        onToggleSelect(file.path);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        onPreviewFile?.(file);
                      }
                    }}
                    className={`${isSelected ? 'selected' : ''} ${isPreviewActive ? 'preview-active' : ''}`}
                    style={{
                      opacity: isProtected ? 0.75 : 1,
                      background: isPreviewActive ? 'var(--bg-subtle)' : undefined,
                      borderLeft: isPreviewActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      outline: 'none'
                    }}
                  >
                    {/* Checkbox Column */}
                    <td
                      style={{ textAlign: 'center', cursor: isProtected ? 'not-allowed' : 'pointer' }}
                      onClick={() => !isProtected && onToggleSelect(file.path)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isProtected}
                        onChange={() => onToggleSelect(file.path)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: isProtected ? 'not-allowed' : 'pointer' }}
                        title={isProtected ? osProtectedFileLabel : 'Select for deletion'}
                      />
                    </td>

                    {/* Name Column */}
                    <td
                      onClick={() => onPreviewFile?.(file)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="file-name-cell">
                        {getCategoryIcon(file.category)}
                        <span className="file-name-text" title={file.name}>
                          {file.name}
                        </span>
                        {isProtected && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '10px', fontWeight: 600 }}>
                            Protected
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Extension */}
                    <td onClick={() => onPreviewFile?.(file)} style={{ cursor: 'pointer' }}>
                      <span className="badge-category">
                        .{file.extension}
                      </span>
                    </td>

                    {/* Size */}
                    <td onClick={() => onPreviewFile?.(file)} style={{ fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer' }}>
                      {file.formattedSize}
                    </td>

                    {/* Modified Date */}
                    <td onClick={() => onPreviewFile?.(file)} style={{ fontSize: '11px', color: 'var(--text-dim)', cursor: 'pointer' }}>
                      {formatDisplayDate(file.modifiedAt, false, preferredDateFormat)}
                    </td>

                    {/* Location */}
                    <td onClick={() => onPreviewFile?.(file)} style={{ cursor: 'pointer' }}>
                      <span className="file-path-text" title={file.path}>
                        {file.path}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {/* 👁️ Preview / Info button */}
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 6px',
                            borderRadius: '3px',
                            background: isPreviewActive ? 'var(--accent-primary)' : undefined,
                            color: isPreviewActive ? '#ffffff' : undefined
                          }}
                          title="Inspect & Preview file (Image, Video, Audio, Text, Docs)"
                          onClick={() => onPreviewFile?.(file)}
                        >
                          <Info size={12} />
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 5px', borderRadius: '3px' }}
                          title="Show in File Explorer"
                          onClick={() => handleShowInExplorer(file.path)}
                        >
                          <FolderOpen size={12} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 5px', borderRadius: '3px' }}
                          title="Open file"
                          onClick={() => handleOpenFile(file.path)}
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedPaths.size > 0 && (
        <div className="floating-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
              {selectedPaths.size.toLocaleString()} {selectedPaths.size === 1 ? 'file' : 'files'} selected
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-danger)', fontWeight: 600 }}>
              ({formatBytes(totalSelectedBytes)} to free)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={onDeselectAll}
            >
              Clear
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={onOpenDeleteModal}
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
