import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  FolderOpen,
  ExternalLink,
  RotateCw,
  Sparkles,
  CheckCircle,
  FileText
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
  const totalWastedBytes = duplicates.reduce((acc, d) => acc + d.wastedBytes, 0);

  // Smart selection helpers
  const handleKeepNewest = () => {
    const next = new Set<string>();
    duplicates.forEach(group => {
      // Sort newest first
      const sorted = [...group.files].sort((a, b) => b.modifiedAt - a.modifiedAt);
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
      const sorted = [...group.files].sort((a, b) => a.modifiedAt - b.modifiedAt);
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
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={20} style={{ color: 'var(--accent-violet)' }} />
            Duplicate File Finder
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Found {duplicates.length} duplicate groups consuming {formatBytes(totalWastedBytes)} redundant space.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onScanDuplicates}
            disabled={isScanning}
          >
            <RotateCw size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>Rescan Duplicates</span>
          </button>

          {selectedCount > 0 && (
            <button
              className="btn btn-danger"
              onClick={onOpenDeleteModal}
            >
              <Trash2 size={16} />
              <span>Delete {selectedCount} Duplicates ({formatBytes(selectedBytes)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart Select Action Toolbar */}
      {duplicates.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
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

          <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 600 }}>
            {selectedCount} copies selected
          </span>
        </div>
      )}

      {/* Duplicate Groups List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {duplicates.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#34d399' }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No duplicate files found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Scan files first or choose a broader directory.</p>
          </div>
        ) : (
          duplicates.map((group, gIdx) => (
            <div
              key={group.id}
              className="glass-panel"
              style={{
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}
            >
              {/* Group Header */}
              <div style={{ padding: '10px 14px', background: 'rgba(168, 85, 247, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#d8b4fe' }}>
                    Group #{gIdx + 1}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • {group.files.length} clones ({group.formattedSize} each)
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#ff6b81', fontWeight: 600 }}>
                  Wasted: {formatBytes(group.wastedBytes)}
                </div>
              </div>

              {/* Group Files */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.files.map(file => {
                  const isSelected = selectedPaths.has(file.path);
                  return (
                    <div
                      key={file.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isSelected ? 'rgba(255, 71, 87, 0.08)' : undefined,
                        cursor: 'pointer'
                      }}
                      onClick={() => onToggleSelect(file.path)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(file.path)}
                          onClick={e => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? '#ff6b81' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.path}>
                            {file.path}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {format(new Date(file.modifiedAt), 'yyyy-MM-dd HH:mm')}
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                          title="Show in File Explorer"
                          onClick={e => {
                            e.stopPropagation();
                            handleShowInExplorer(file.path);
                          }}
                        >
                          <FolderOpen size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
