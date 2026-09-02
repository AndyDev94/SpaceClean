import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  FileCode2,
  Trash2,
  FolderOpen,
  Eye,
  CheckSquare,
  Square,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Flame,
  RotateCw,
  Sparkles,
  Lock,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { ThreatItem, ThreatRiskLevel, FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';
import { osName, fileManagerName, trashName } from '../utils/platform';

interface ThreatDetectorProps {
  threats: ThreatItem[];
  scannedFilesCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onDeleteThreats: (threatsToDelete: ThreatItem[]) => void;
  onToggleTrustThreat: (threatId: string, isTrusted: boolean) => void;
  onPreviewFile?: (file: FileInfo) => void;
  onShowInFolder?: (path: string) => void;
}

export const ThreatDetector: React.FC<ThreatDetectorProps> = ({
  threats,
  scannedFilesCount,
  isLoading,
  onRefresh,
  onDeleteThreats,
  onToggleTrustThreat,
  onPreviewFile,
  onShowInFolder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'suspicious' | 'trusted'>('all');
  const [selectedThreatIds, setSelectedThreatIds] = useState<Set<string>>(new Set());
  const [expandedThreatId, setExpandedThreatId] = useState<string | null>(null);

  // Filtered threats
  const filteredThreats = useMemo(() => {
    return threats.filter(t => {
      // Risk filter
      if (selectedRiskFilter === 'trusted' && !t.isIgnored) return false;
      if (selectedRiskFilter === 'high' && (t.riskLevel !== 'high' || t.isIgnored)) return false;
      if (selectedRiskFilter === 'suspicious' && (t.riskLevel !== 'suspicious' || t.isIgnored)) return false;
      if (selectedRiskFilter === 'all' && t.isIgnored) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.file.name.toLowerCase().includes(q) ||
          t.file.path.toLowerCase().includes(q) ||
          t.ruleName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [threats, selectedRiskFilter, searchQuery]);

  // Counts
  const highRiskCount = useMemo(() => threats.filter(t => t.riskLevel === 'high' && !t.isIgnored).length, [threats]);
  const suspiciousCount = useMemo(() => threats.filter(t => t.riskLevel === 'suspicious' && !t.isIgnored).length, [threats]);
  const trustedCount = useMemo(() => threats.filter(t => t.isIgnored).length, [threats]);
  const activeThreatsCount = highRiskCount + suspiciousCount;

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedThreatIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedThreatIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedThreatIds.size === filteredThreats.length && filteredThreats.length > 0) {
      setSelectedThreatIds(new Set());
    } else {
      setSelectedThreatIds(new Set(filteredThreats.map(t => t.id)));
    }
  };

  const handleSelectAllHighRisk = () => {
    const highRiskIds = threats.filter(t => t.riskLevel === 'high' && !t.isIgnored).map(t => t.id);
    setSelectedThreatIds(new Set(highRiskIds));
  };

  const handleBatchDelete = () => {
    const itemsToDelete = threats.filter(t => selectedThreatIds.has(t.id));
    if (itemsToDelete.length > 0) {
      onDeleteThreats(itemsToDelete);
      setSelectedThreatIds(new Set());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Banner & Security Summary */}
      <div
        style={{
          padding: '16px 20px',
          background: activeThreatsCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          borderBottom: `1px solid ${activeThreatsCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: activeThreatsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: activeThreatsCount > 0 ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {activeThreatsCount > 0 ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {activeThreatsCount > 0 ? `${activeThreatsCount} Security Risks Detected` : 'Zero Threat Signatures Found'}
              </h2>
              {activeThreatsCount > 0 ? (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }}>
                  Attention Needed
                </span>
              ) : (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700 }}>
                  Protected & Clean
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Heuristic scanner evaluated <strong>{scannedFilesCount.toLocaleString()}</strong> scanned files for masquerading executables, rogue temp binaries, and suspicious script payloads.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            title="Rescan current folder for security threats"
          >
            <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Rescan Threats</span>
          </button>

          {selectedThreatIds.size > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleBatchDelete}
              style={{ fontSize: '12px', padding: '6px 14px', background: '#ef4444', borderColor: '#dc2626' }}
            >
              <Trash2 size={13} />
              <span>Quarantine & Delete ({selectedThreatIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Risk Filter Cards & Search */}
      <div
        style={{
          padding: '12px 20px',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Risk Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className={`btn ${selectedRiskFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px', padding: '5px 10px', height: '28px' }}
            onClick={() => setSelectedRiskFilter('all')}
          >
            <span>All Active ({activeThreatsCount})</span>
          </button>

          <button
            className={`btn ${selectedRiskFilter === 'high' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: '11px',
              padding: '5px 10px',
              height: '28px',
              borderColor: highRiskCount > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined
            }}
            onClick={() => setSelectedRiskFilter('high')}
          >
            <span style={{ color: '#ef4444', fontWeight: 700 }}>●</span>
            <span>High Risk ({highRiskCount})</span>
          </button>

          <button
            className={`btn ${selectedRiskFilter === 'suspicious' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px', padding: '5px 10px', height: '28px' }}
            onClick={() => setSelectedRiskFilter('suspicious')}
          >
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>●</span>
            <span>Suspicious ({suspiciousCount})</span>
          </button>

          {trustedCount > 0 && (
            <button
              className={`btn ${selectedRiskFilter === 'trusted' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '5px 10px', height: '28px' }}
              onClick={() => setSelectedRiskFilter('trusted')}
            >
              <ShieldCheck size={12} style={{ color: '#10b981' }} />
              <span>Trusted / Whitelisted ({trustedCount})</span>
            </button>
          )}
        </div>

        {/* Quick Select & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {highRiskCount > 0 && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '5px 10px', height: '28px', color: '#ef4444' }}
              onClick={handleSelectAllHighRisk}
            >
              <span>Select High Risk ({highRiskCount})</span>
            </button>
          )}

          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search threat name/path..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px 4px 28px', height: '28px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {filteredThreats.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '520px',
              margin: '0 auto'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                marginBottom: '16px'
              }}
            >
              <ShieldCheck size={36} />
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              {selectedRiskFilter === 'trusted' ? 'No Whitelisted Files' : 'No Threat Signatures In This View'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {scannedFilesCount === 0
                ? 'Scan a drive or folder to analyze all contents for concealed malware, double extensions, and suspicious scripts.'
                : 'All scanned files adhere to standard security boundaries. No double-extension disguise or unauthorized temp binaries found.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Table Selection Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-dim)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={handleSelectAllFiltered}>
                {selectedThreatIds.size === filteredThreats.length && filteredThreats.length > 0 ? (
                  <CheckSquare size={14} style={{ color: 'var(--accent-primary)' }} />
                ) : (
                  <Square size={14} />
                )}
                <span>Select All ({filteredThreats.length} items)</span>
              </div>

              <span>Click item to inspect danger rationale & recommendations</span>
            </div>

            {/* Threat Cards */}
            {filteredThreats.map(threat => {
              const isSelected = selectedThreatIds.has(threat.id);
              const isExpanded = expandedThreatId === threat.id;

              return (
                <div
                  key={threat.id}
                  style={{
                    background: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-panel)',
                    border: `1px solid ${
                      threat.riskLevel === 'high'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : threat.riskLevel === 'suspicious'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'var(--border-color)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Card Header Row */}
                  <div
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedThreatId(isExpanded ? null : threat.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(threat.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        )}
                      </div>

                      {/* Risk Badge */}
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            threat.riskLevel === 'high'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : threat.riskLevel === 'suspicious'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(100, 116, 139, 0.15)',
                          color:
                            threat.riskLevel === 'high'
                              ? '#ef4444'
                              : threat.riskLevel === 'suspicious'
                              ? '#f59e0b'
                              : 'var(--text-muted)',
                          textTransform: 'uppercase',
                          flexShrink: 0
                        }}
                      >
                        {threat.riskLevel}
                      </span>

                      {/* Title & Path */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {threat.file.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg-subtle)', padding: '1px 6px', borderRadius: '3px' }}>
                            {threat.category}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px'
                          }}
                          title={threat.file.path}
                        >
                          {threat.file.path}
                        </div>
                      </div>
                    </div>

                    {/* Right side Info & Expand Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {threat.file.formattedSize}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          {format(threat.file.modifiedAt, 'MMM d, yyyy')}
                        </div>
                      </div>

                      {isExpanded ? <ChevronDown size={16} color="var(--text-dim)" /> : <ChevronRight size={16} color="var(--text-dim)" />}
                    </div>
                  </div>

                  {/* Expanded Inspector Panel */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--bg-subtle)',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* Danger Explanation */}
                      <div style={{ background: 'var(--bg-panel)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: threat.riskLevel === 'high' ? '#ef4444' : '#f59e0b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={13} />
                          <span>Detection Trigger: {threat.ruleName}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                          {threat.description}
                        </p>
                      </div>

                      {/* Recommendation */}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '2px 4px' }}>
                        💡 <strong>Security Action:</strong> {threat.recommendation}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {onShowInFolder && (
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => onShowInFolder(threat.file.path)}
                            >
                              <FolderOpen size={12} />
                              <span>Reveal in {fileManagerName}</span>
                            </button>
                          )}

                          {onPreviewFile && (
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => onPreviewFile(threat.file)}
                            >
                              <Eye size={12} />
                              <span>Inspect Preview</span>
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => onToggleTrustThreat(threat.id, !threat.isIgnored)}
                          >
                            <ShieldCheck size={12} style={{ color: threat.isIgnored ? 'var(--text-dim)' : '#10b981' }} />
                            <span>{threat.isIgnored ? 'Untrust' : 'Trust File (Whitelist)'}</span>
                          </button>

                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '11px', padding: '4px 12px', background: '#ef4444', borderColor: '#dc2626' }}
                            onClick={() => onDeleteThreats([threat])}
                          >
                            <Trash2 size={12} />
                            <span>Quarantine / Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
