import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  FolderOpen,
  RotateCw,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye
} from 'lucide-react';
import { DuplicateGroup, FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';

interface DuplicateFinderProps {
  duplicates: DuplicateGroup[];
  isScanning: boolean;
  onScanDuplicates: () => void;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSetSelectedPaths: (paths: Set<string>) => void;
  onOpenDeleteModal: () => void;
}

export const DuplicateFinder: React.FC<DuplicateFinderProps> = ({
  duplicates,
  isScanning,
  onScanDuplicates,
  selectedPaths,
  onToggleSelect,
  onSetSelectedPaths,
  onOpenDeleteModal,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const totalWastedBytes = duplicates.reduce((acc, d) => acc + d.wastedBytes, 0);

  // Smart selection helpers
  const handleKeepNewest = () => {
    const next = new Set<string>();
    duplicates.forEach(group => {
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
    duplicates.forEach(group => {
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

  const selectedCount = duplicates.reduce((acc, g) => {
    return acc + g.files.filter(f => selectedPaths.has(f.path)).length;
  }, 0);

  const selectedBytes = duplicates.reduce((acc, g) => {
    return acc + g.files.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0);
  }, 0);

  const handleShowInExplorer = async (filePath: string) => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(filePath);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} style={{ color: '#a855f7' }} />
            Duplicate File Finder
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Found {duplicates.length.toLocaleString()} duplicate groups consuming {formatBytes(totalWastedBytes)} redundant space.
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

      {/* Smart Select Action Toolbar */}
      {duplicates.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            padding: '8px 12px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600 }}>
              Smart Mark:
            </span>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleKeepNewest}>
              Keep Newest (Mark Old Copies)
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleKeepOldest}>
              Keep Oldest (Mark New Copies)
            </button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleDeselectAll}>
              Deselect All
            </button>
          </div>

          <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 700 }}>
            {selectedCount} copies selected ({formatBytes(selectedBytes)})
          </span>
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
        ) : duplicates.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.6, color: '#10b981' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>No duplicate files found</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              All indexed files in this folder are unique.
            </p>
          </div>
        ) : (
          duplicates.map((group, gIdx) => {
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
                            background: isSelected ? 'rgba(239, 68, 68, 0.08)' : undefined,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onClick={() => onToggleSelect(file.path)}
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {formattedDate}
                            </span>

                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
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
