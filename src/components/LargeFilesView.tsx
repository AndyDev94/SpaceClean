import React from 'react';
import {
  BarChart3,
  Trash2,
  FolderOpen,
  ExternalLink,
  Flame,
  FileText,
  Info
} from 'lucide-react';
import { FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';

interface LargeFilesViewProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onOpenDeleteModal: () => void;
  onPreviewFile?: (file: FileInfo) => void;
  previewedFilePath?: string | null;
}

export const LargeFilesView: React.FC<LargeFilesViewProps> = ({
  files,
  selectedPaths,
  onToggleSelect,
  onOpenDeleteModal,
  onPreviewFile,
  previewedFilePath,
}) => {
  // Sort top 100 biggest files
  const largeFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 100);
  const maxFileSize = largeFiles.length > 0 ? largeFiles[0].size : 1;

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

  const selectedCount = largeFiles.filter(f => selectedPaths.has(f.path)).length;
  const selectedBytes = largeFiles
    .filter(f => selectedPaths.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} style={{ color: 'var(--accent-coral)' }} />
            Space Hogs (Top 100 Largest Files)
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Directly pinpoint and remove giant files consuming the most disk space. Click Inspect to preview.
          </p>
        </div>

        {selectedCount > 0 && (
          <button
            className="btn btn-danger"
            onClick={onOpenDeleteModal}
          >
            <Trash2 size={16} />
            <span>Delete {selectedCount} Selected ({formatBytes(selectedBytes)})</span>
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {largeFiles.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)' }}>No files indexed yet</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Click 'Start Scan' to analyze large files.</p>
          </div>
        ) : (
          largeFiles.map((file, idx) => {
            const isSelected = selectedPaths.has(file.path);
            const isPreviewActive = previewedFilePath === file.path;
            const percentage = Math.max(4, (file.size / maxFileSize) * 100);

            return (
              <div
                key={file.path}
                className="panel"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  borderColor: isPreviewActive ? 'var(--accent-primary)' : isSelected ? 'rgba(255, 71, 87, 0.4)' : undefined,
                  background: isPreviewActive ? 'var(--bg-subtle)' : isSelected ? 'rgba(255, 71, 87, 0.08)' : undefined,
                }}
                onClick={() => onToggleSelect(file.path)}
              >
                {/* Left section: Rank & Checkbox & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: idx < 3 ? '#ff4757' : 'var(--text-dim)', width: '28px' }}>
                    #{idx + 1}
                  </span>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(file.path)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span className="badge-category">
                        .{file.extension}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }} title={file.path}>
                      {file.path}
                    </div>

                    {/* Proportional visual bar */}
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: idx < 3 ? 'linear-gradient(90deg, #ff4757, #ff6b81)' : 'linear-gradient(90deg, #00e5ff, #8b5cf6)',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right section: Size & Date & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171' }}>
                      {file.formattedSize}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {format(new Date(file.modifiedAt), 'yyyy-MM-dd')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '4px 6px',
                        background: isPreviewActive ? 'var(--accent-primary)' : undefined,
                        color: isPreviewActive ? '#ffffff' : undefined
                      }}
                      title="Inspect & Preview file"
                      onClick={() => onPreviewFile?.(file)}
                    >
                      <Info size={13} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 6px' }}
                      title="Show in File Explorer"
                      onClick={() => handleShowInExplorer(file.path)}
                    >
                      <FolderOpen size={13} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 6px' }}
                      title="Open file"
                      onClick={() => handleOpenFile(file.path)}
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
