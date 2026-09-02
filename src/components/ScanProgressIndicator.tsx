import React from 'react';
import { RefreshCw, Square, Folder, HardDrive } from 'lucide-react';
import { ScanProgress } from '../types';
import { formatBytes } from '../utils/filterUtils';

interface ScanProgressIndicatorProps {
  progress: ScanProgress;
  isScanning: boolean;
  onCancelScan: () => void;
}

export const ScanProgressIndicator: React.FC<ScanProgressIndicatorProps> = ({
  progress,
  isScanning,
  onCancelScan,
}) => {
  if (!isScanning) return null;

  const percent = (progress.percent && progress.percent > 0) ? progress.percent : null;

  return (
    <div
      style={{
        padding: '10px 16px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
            Scanning Directory...
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({progress.scannedFiles.toLocaleString()} files • {formatBytes(progress.scannedBytes)})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {percent !== null && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
              {percent}%
            </span>
          )}

          <button
            className="btn btn-secondary"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onCancelScan}
            title="Stop scanning and explore currently indexed files"
          >
            <Square size={11} fill="currentColor" />
            <span>Stop Scan</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="progress-bar-track" style={{ height: '5px' }}>
        <div
          className="progress-bar-fill"
          style={{
            width: percent !== null ? `${Math.max(5, percent)}%` : '100%',
            animation: percent === null ? 'pulseGlow 1.5s infinite ease-in-out' : undefined
          }}
        />
      </div>

      {/* Current Scanning Folder Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
        <Folder size={11} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '800px' }} title={progress.currentFolder}>
          {progress.currentFolder || 'Preparing scanner...'}
        </span>
      </div>
    </div>
  );
};
