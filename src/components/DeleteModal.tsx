import React, { useState } from 'react';
import {
  Trash2,
  Recycle,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Check,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { FileInfo, DeleteResult } from '../types';
import { formatBytes } from '../utils/filterUtils';

interface DeleteModalProps {
  files: FileInfo[];
  selectedPaths: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (paths: string[], toRecycleBin: boolean) => Promise<DeleteResult>;
  onDeleteFinished: (result: DeleteResult) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  files,
  selectedPaths,
  isOpen,
  onClose,
  onConfirmDelete,
  onDeleteFinished,
}) => {
  if (!isOpen) return null;

  // Selected files array
  const [activePaths, setActivePaths] = useState<Set<string>>(new Set(selectedPaths));
  const [toRecycleBin, setToRecycleBin] = useState<boolean>(true); // Default safe Recycle Bin
  const [searchFilter, setSearchFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [resultSummary, setResultSummary] = useState<DeleteResult | null>(null);

  const selectedFiles = files.filter(f => activePaths.has(f.path));
  const totalBytesToFree = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const toggleFile = (path: string) => {
    const next = new Set(activePaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setActivePaths(next);
  };

  const filteredPreview = selectedFiles.filter(f =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.path.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleExecuteDelete = async () => {
    if (activePaths.size === 0) return;
    setIsDeleting(true);
    setDeletionProgress(15);

    const targetPaths = Array.from(activePaths);
    const result = await onConfirmDelete(targetPaths, toRecycleBin);

    setDeletionProgress(100);
    setIsDeleting(false);
    setResultSummary(result);
    onDeleteFinished(result);
  };

  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: resultSummary
                  ? 'rgba(16, 185, 129, 0.2)'
                  : toRecycleBin
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                color: resultSummary ? '#10b981' : toRecycleBin ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {resultSummary ? <CheckCircle2 size={18} /> : toRecycleBin ? <Recycle size={18} /> : <Trash2 size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                {resultSummary ? 'Cleanup Complete' : 'Confirm Storage Deletion'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {resultSummary
                  ? `Reclaimed ${formatBytes(resultSummary.freedBytes)} of storage space`
                  : `${activePaths.size.toLocaleString()} files selected • ${formatBytes(totalBytesToFree)} total`}
              </p>
            </div>
          </div>

          {!isDeleting && (
            <button
              className="window-btn"
              onClick={onClose}
              style={{ width: '28px', height: '28px' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {resultSummary ? (
            /* Post-deletion Solid Dark Summary Card */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0' }}>
              <div
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h4 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                    {formatBytes(resultSummary.freedBytes)} Reclaimed!
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {resultSummary.successCount.toLocaleString()} {resultSummary.successCount === 1 ? 'file' : 'files'} successfully removed.
                  </p>
                </div>

                {/* Quick Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    width: '100%',
                    marginTop: '6px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Space Freed</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                      {formatBytes(resultSummary.freedBytes)}
                    </div>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Destination</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {resultSummary.recycleBin ? 'Recycle Bin' : 'Permanent'}
                    </div>
                  </div>
                </div>
              </div>

              {resultSummary.errors.length > 0 && (
                <div style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px', color: '#f87171' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {resultSummary.errors.length} files could not be removed (in use or permission denied):
                  </div>
                  <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                    {resultSummary.errors.map((e, idx) => (
                      <div key={idx} style={{ marginTop: '2px' }}>• {e.path}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : isDeleting ? (
            /* Active Deletion Progress */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '24px 0' }}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${deletionProgress}%` }} />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {toRecycleBin ? 'Moving files to Windows Recycle Bin...' : 'Permanently deleting files...'}
              </p>
            </div>
          ) : (
            /* Deletion Options & File Preview */
            <>
              {/* Option Selector: Recycle Bin vs Permanent */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                  Choose Deletion Method:
                </label>

                <div className="delete-mode-cards">
                  {/* Option 1: Recycle Bin */}
                  <div
                    className={`delete-mode-card ${toRecycleBin ? 'selected recycle' : ''}`}
                    onClick={() => setToRecycleBin(true)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                        <Recycle size={16} />
                        <span>Move to Recycle Bin</span>
                      </div>
                      {toRecycleBin && <Check size={15} style={{ color: '#10b981' }} />}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                      <strong>Safe & Recommended.</strong> Files can be restored from the Recycle Bin if needed.
                    </p>
                  </div>

                  {/* Option 2: Permanent Delete */}
                  <div
                    className={`delete-mode-card ${!toRecycleBin ? 'selected permanent' : ''}`}
                    onClick={() => setToRecycleBin(false)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                        <Trash2 size={16} />
                        <span>Delete Permanently</span>
                      </div>
                      {!toRecycleBin && <Check size={15} style={{ color: '#ef4444' }} />}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                      <strong>Immediate space reclaim.</strong> Bypasses Recycle Bin. Files cannot be recovered!
                    </p>
                  </div>
                </div>
              </div>

              {!toRecycleBin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#f87171' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>Caution: Permanent deletion cannot be undone.</span>
                </div>
              )}

              {/* Preview & Deselect List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Files to be removed ({activePaths.size.toLocaleString()}):
                  </span>
                  <input
                    type="text"
                    placeholder="Search in preview..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      width: '160px'
                    }}
                  />
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px' }}>
                  {filteredPreview.map(file => {
                    const isChecked = activePaths.has(file.path);
                    return (
                      <div
                        key={file.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleFile(file.path)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFile(file.path)}
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px', color: isChecked ? 'var(--text-main)' : 'var(--text-dim)' }} title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '11px', flexShrink: 0 }}>
                          {file.formattedSize}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {resultSummary ? (
            <button className="btn btn-primary" style={{ padding: '6px 20px' }} onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={`btn ${toRecycleBin ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleExecuteDelete}
                disabled={activePaths.size === 0 || isDeleting}
                style={toRecycleBin ? { background: '#10b981', color: '#ffffff' } : undefined}
              >
                {toRecycleBin ? <Recycle size={15} /> : <Trash2 size={15} />}
                <span>
                  {toRecycleBin ? 'Move to Recycle Bin' : 'Permanently Delete'} ({formatBytes(totalBytesToFree)})
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
