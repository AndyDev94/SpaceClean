import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Folder,
  ShieldCheck,
  Zap,
  HardDrive,
  ExternalLink,
  FolderOpen,
  Check,
  Flame
} from 'lucide-react';
import { JunkItem } from '../types';
import { formatBytes } from '../utils/filterUtils';

interface JunkCleanerProps {
  junkItems: JunkItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onCleanJunk: (selectedItems: JunkItem[]) => void;
}

export const JunkCleaner: React.FC<JunkCleanerProps> = ({
  junkItems,
  isLoading,
  onRefresh,
  onCleanJunk,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(junkItems.filter(j => j.isSafe && (j.totalBytes > 0 || j.fileCount > 0)).map(j => j.id))
  );
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllSafe = () => {
    setSelectedIds(new Set(junkItems.filter(j => j.isSafe && (j.totalBytes > 0 || j.fileCount > 0)).map(j => j.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedItems = junkItems.filter(j => selectedIds.has(j.id));
  const totalSelectedBytes = selectedItems.reduce((acc, j) => acc + j.totalBytes, 0);

  // Handle viewing / opening a folder or Windows Recycle Bin
  const handleOpenFolder = async (item: JunkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.category === 'recycle_bin' || item.id === 'recycle_bin') {
      if (window.electronAPI?.openRecycleBin) {
        await window.electronAPI.openRecycleBin();
      }
    } else {
      if (window.electronAPI?.showItemInFolder) {
        await window.electronAPI.showItemInFolder(item.path);
      }
    }
  };

  // Handle direct 1-click empty of Recycle Bin
  const handleEmptyRecycleBinDirect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently empty all items in the Windows Recycle Bin?')) return;
    setIsActionLoading('recycle_bin');
    try {
      if (window.electronAPI?.emptyRecycleBin) {
        await window.electronAPI.emptyRecycleBin();
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to empty recycle bin:', err);
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} style={{ color: 'var(--accent-amber)' }} />
            Windows System Junk, Cache & Recycle Bin
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Safely remove temporary caches, error reports, abandoned logs, and empty the Windows Recycle Bin.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading || !!isActionLoading}
            title="Rescan System Junk and Recycle Bin"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Rescan Junk</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#1a1003', fontWeight: 600 }}
            disabled={selectedItems.length === 0 || isLoading}
            onClick={() => onCleanJunk(selectedItems)}
          >
            <Trash2 size={16} />
            <span>Clean Selected ({formatBytes(totalSelectedBytes)})</span>
          </button>
        </div>
      </div>

      {/* Action quick selection links */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={clearSelection} title="Ignore all items and keep all caches/junk">
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span>Ignore All (Keep All)</span>
          </button>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={selectAllSafe} title="Select all safe temporary caches and error logs">
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>Select All Safe Targets</span>
          </button>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={clearSelection}>
            <span>Deselect All</span>
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {selectedItems.length} of {junkItems.length} cleanup targets selected
        </div>
      </div>

      {/* Junk Item Cards Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px', alignContent: 'start', paddingBottom: '16px' }}>
        {junkItems.map(item => {
          const isSelected = selectedIds.has(item.id);
          const isRecycleBin = item.category === 'recycle_bin' || item.id === 'recycle_bin';

          return (
            <div
              key={item.id}
              className={`glass-panel stat-card ${isSelected ? 'selected' : ''}`}
              style={{
                cursor: 'pointer',
                borderColor: isRecycleBin
                  ? isSelected ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.3)'
                  : isSelected ? 'rgba(245, 158, 11, 0.5)' : undefined,
                background: isRecycleBin
                  ? isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.03)'
                  : isSelected ? 'rgba(245, 158, 11, 0.08)' : undefined,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
              onClick={() => toggleSelect(item.id)}
            >
              {/* Card Header & Checkbox */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                      onClick={e => e.stopPropagation()}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRecycleBin ? (
                          <Trash2 size={16} style={{ color: '#10b981' }} />
                        ) : (
                          <Folder size={15} style={{ color: 'var(--accent-primary)' }} />
                        )}
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.name}
                        </h3>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: isRecycleBin ? '#10b981' : item.totalBytes > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                      {item.formattedBytes}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.fileCount.toLocaleString()} {item.fileCount === 1 ? 'item' : 'files'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Bottom: Path & Action Buttons (View, Open, Empty) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={item.path}>
                  <span>{item.path}</span>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* View / Open Folder or Windows Recycle Bin */}
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => handleOpenFolder(item, e)}
                    title={isRecycleBin ? 'Open Windows Recycle Bin to view deleted files' : 'Open folder in File Explorer'}
                  >
                    <ExternalLink size={11} />
                    <span>{isRecycleBin ? 'View Trash' : 'Open'}</span>
                  </button>

                  {/* 1-Click Empty Recycle Bin Button */}
                  {isRecycleBin && item.fileCount > 0 && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={handleEmptyRecycleBinDirect}
                      disabled={isActionLoading === 'recycle_bin'}
                      title="Permanently empty Windows Recycle Bin now"
                    >
                      <Trash2 size={11} className={isActionLoading === 'recycle_bin' ? 'animate-spin' : ''} />
                      <span>Empty</span>
                    </button>
                  )}

                  {/* Safety badge */}
                  {item.isSafe ? (
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(52, 211, 153, 0.1)' }}>
                      <ShieldCheck size={11} /> Safe
                    </span>
                  ) : (
                    <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.1)' }}>
                      <AlertTriangle size={11} /> Review
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
