import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Folder,
  ShieldCheck,
  Zap,
  HardDrive
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
    new Set(junkItems.filter(j => j.isSafe && j.totalBytes > 0).map(j => j.id))
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllSafe = () => {
    setSelectedIds(new Set(junkItems.filter(j => j.isSafe && j.totalBytes > 0).map(j => j.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedItems = junkItems.filter(j => selectedIds.has(j.id));
  const totalSelectedBytes = selectedItems.reduce((acc, j) => acc + j.totalBytes, 0);

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} style={{ color: 'var(--accent-amber)' }} />
            Windows System Junk & Cache Cleaner
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Safely remove temporary caches, error reports, and abandoned log files to reclaim drive space.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Rescan Junk</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#1a1003' }}
            disabled={selectedItems.length === 0}
            onClick={() => onCleanJunk(selectedItems)}
          >
            <Trash2 size={16} />
            <span>Clean Selected Junk ({formatBytes(totalSelectedBytes)})</span>
          </button>
        </div>
      </div>

      {/* Action quick links */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={selectAllSafe}>
          <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
          <span>Select Safe Categories</span>
        </button>
        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={clearSelection}>
          <span>Deselect All</span>
        </button>
      </div>

      {/* Junk Item Cards Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px', alignContent: 'start' }}>
        {junkItems.map(item => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`glass-panel stat-card ${isSelected ? 'selected' : ''}`}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'rgba(245, 158, 11, 0.5)' : undefined,
                background: isSelected ? 'rgba(245, 158, 11, 0.08)' : undefined,
                padding: '16px'
              }}
              onClick={() => toggleSelect(item.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    style={{ marginTop: '4px', cursor: 'pointer' }}
                    onClick={e => e.stopPropagation()}
                  />
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                      {item.description}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: item.totalBytes > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                    {item.formattedBytes}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {item.fileCount} files
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.path}>
                  {item.path}
                </span>
                {item.isSafe ? (
                  <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Safe to remove
                  </span>
                ) : (
                  <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Review first
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
