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
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Play,
  Zap,
  Layers,
  Clock
} from 'lucide-react';
import { ThreatItem, ThreatRiskLevel, FileInfo, ScanChunkInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';
import { osName, fileManagerName, trashName } from '../utils/platform';
import { Globe, Copy, Check } from 'lucide-react';

interface ThreatDetectorProps {
  threats: ThreatItem[];
  scannedFilesCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onDeleteThreats: (threatsToDelete: ThreatItem[]) => void;
  onToggleTrustThreat: (threatId: string, isTrusted: boolean) => void;
  onIgnoreAllThreats?: () => void;
  onResetIgnoredThreats?: () => void;
  chunkInfo?: ScanChunkInfo | null;
  onResumeScan?: (unlimited?: boolean) => void;
  availableParts?: number[];
  selectedPartFilter?: number | 'all';
  onSelectPartFilter?: (part: number | 'all') => void;
  onPreviewFile?: (file: FileInfo) => void;
  onShowInFolder?: (path: string) => void;
}

type ThreatSortBy = 'risk' | 'date' | 'size' | 'name';
type ThreatSortOrder = 'asc' | 'desc';

export const ThreatDetector: React.FC<ThreatDetectorProps> = ({
  threats,
  scannedFilesCount,
  isLoading,
  onRefresh,
  onDeleteThreats,
  onToggleTrustThreat,
  onIgnoreAllThreats,
  onResetIgnoredThreats,
  chunkInfo,
  onResumeScan,
  availableParts = [],
  selectedPartFilter = 'all',
  onSelectPartFilter,
  onPreviewFile,
  onShowInFolder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'suspicious' | 'trusted'>('all');
  const [selectedThreatIds, setSelectedThreatIds] = useState<Set<string>>(new Set());
  const [expandedThreatId, setExpandedThreatId] = useState<string | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<ThreatSortBy>('risk');
  const [sortOrder, setSortOrder] = useState<ThreatSortOrder>('desc');

  const handleToggleSort = (field: ThreatSortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // File hash cache and loading states
  const [fileHashes, setFileHashes] = useState<Record<string, { sha256: string; md5: string; isLoading?: boolean }>>({});
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);
  const [virusTotalLoadingPath, setVirusTotalLoadingPath] = useState<string | null>(null);

  // Fetch hash on expand
  const fetchFileHash = async (filePath: string) => {
    if (fileHashes[filePath] || !window.electronAPI?.getFileHash) return;

    setFileHashes(prev => ({ ...prev, [filePath]: { sha256: '', md5: '', isLoading: true } }));
    try {
      const res = await window.electronAPI.getFileHash(filePath);
      setFileHashes(prev => ({
        ...prev,
        [filePath]: { sha256: res.sha256, md5: res.md5, isLoading: false }
      }));
      return res.sha256;
    } catch {
      setFileHashes(prev => ({
        ...prev,
        [filePath]: { sha256: '', md5: '', isLoading: false }
      }));
      return '';
    }
  };

  const handleVirusTotalLookup = async (filePath: string) => {
    setVirusTotalLoadingPath(filePath);
    try {
      let sha256 = fileHashes[filePath]?.sha256;
      if (!sha256) {
        sha256 = (await fetchFileHash(filePath)) || '';
      }

      if (sha256) {
        const vtUrl = `https://www.virustotal.com/gui/file/${sha256}/detection`;
        if (window.electronAPI?.openExternalUrl) {
          await window.electronAPI.openExternalUrl(vtUrl);
        } else {
          window.open(vtUrl, '_blank');
        }
      } else {
        // Fallback search by filename
        const filename = filePath.split(/[\\/]/).pop() || '';
        const searchUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(filename)}`;
        if (window.electronAPI?.openExternalUrl) {
          await window.electronAPI.openExternalUrl(searchUrl);
        } else {
          window.open(searchUrl, '_blank');
        }
      }
    } finally {
      setVirusTotalLoadingPath(null);
    }
  };

  const handleCopyHash = (hash: string, key: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashKey(key);
    setTimeout(() => setCopiedHashKey(null), 2000);
  };

  // Filtered & Sorted threats
  const filteredThreats = useMemo(() => {
    const list = threats.filter(t => {
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

    return [...list].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'risk') {
        const score = (r: ThreatRiskLevel) => (r === 'high' ? 3 : r === 'suspicious' ? 2 : 1);
        comp = score(a.riskLevel) - score(b.riskLevel);
      } else if (sortBy === 'date') {
        const dateA = a.file.modifiedAt || a.file.createdAt || 0;
        const dateB = b.file.modifiedAt || b.file.createdAt || 0;
        comp = dateA - dateB;
      } else if (sortBy === 'size') {
        comp = a.file.size - b.file.size;
      } else if (sortBy === 'name') {
        comp = a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (comp === 0) {
        comp = a.file.name.localeCompare(b.file.name);
      }

      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [threats, selectedRiskFilter, searchQuery, sortBy, sortOrder]);

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

  const renderSortIcon = (field: ThreatSortBy) => {
    if (sortBy !== field) return <ArrowUpDown size={11} style={{ opacity: 0.3, marginLeft: 3 }} />;
    return sortOrder === 'asc' ? (
      <ArrowUp size={11} style={{ color: 'var(--accent-primary)', marginLeft: 3 }} />
    ) : (
      <ArrowDown size={11} style={{ color: 'var(--accent-primary)', marginLeft: 3 }} />
    );
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

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeThreatsCount > 0 && onIgnoreAllThreats && (
            <button
              className="btn btn-secondary"
              onClick={onIgnoreAllThreats}
              style={{ fontSize: '12px', padding: '6px 12px', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              title="Mark all active threats as trusted (hide alerts)"
            >
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              <span>Ignore All (Trust All)</span>
            </button>
          )}

          {activeThreatsCount === 0 && trustedCount > 0 && onResetIgnoredThreats && (
            <button
              className="btn btn-secondary"
              onClick={onResetIgnoredThreats}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Clear whitelist and restore all threat alerts"
            >
              <RotateCw size={13} />
              <span>Restore All Alerts ({trustedCount})</span>
            </button>
          )}

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

      {/* RAM Optimizer Multi-Part Scanning & Part Navigation Banner for Threats Mode */}
      {chunkInfo?.isChunkPaused ? (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShieldAlert size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Part {chunkInfo.chunkNumber} Evaluated for Threats ({chunkInfo.scannedFiles.toLocaleString()} files scanned)
                </span>
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                  RAM Saver Active
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
                {chunkInfo.remainingQueueCount} subfolder queues remaining to scan for threats & camouflaged binaries.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {availableParts.length > 1 && onSelectPartFilter && (
              <select
                value={selectedPartFilter}
                onChange={e => onSelectPartFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
                title="Filter threats by scanned part"
              >
                <option value="all">🌐 All Scanned Parts (1–{availableParts.length})</option>
                {availableParts.map(p => (
                  <option key={p} value={p}>📦 Part {p} Only</option>
                ))}
              </select>
            )}

            {onResumeScan && (
              <>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 12px' }}
                  onClick={() => onResumeScan(false)}
                  title="Scan next part of directory for threats"
                >
                  <Play size={12} />
                  <span>Scan Next Part for Threats</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px' }}
                  onClick={() => onResumeScan(true)}
                  title="Scan all remaining files for threats without pausing"
                >
                  <Zap size={12} />
                  <span>Scan All Remaining for Threats</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Control Bar: Risk Filters, Sort Controls, Part Switcher & Search */}
      <div
        style={{
          padding: '10px 20px',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Left Side: Risk Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedRiskFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px', padding: '4px 8px', height: '26px' }}
            onClick={() => setSelectedRiskFilter('all')}
          >
            <span>All Active ({activeThreatsCount})</span>
          </button>

          <button
            className={`btn ${selectedRiskFilter === 'high' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              height: '26px',
              borderColor: highRiskCount > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined
            }}
            onClick={() => setSelectedRiskFilter('high')}
          >
            <span style={{ color: '#ef4444', fontWeight: 700 }}>●</span>
            <span>High Risk ({highRiskCount})</span>
          </button>

          <button
            className={`btn ${selectedRiskFilter === 'suspicious' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px', padding: '4px 8px', height: '26px' }}
            onClick={() => setSelectedRiskFilter('suspicious')}
          >
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>●</span>
            <span>Suspicious ({suspiciousCount})</span>
          </button>

          {trustedCount > 0 && (
            <button
              className={`btn ${selectedRiskFilter === 'trusted' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '4px 8px', height: '26px' }}
              onClick={() => setSelectedRiskFilter('trusted')}
            >
              <ShieldCheck size={12} style={{ color: '#10b981' }} />
              <span>Trusted ({trustedCount})</span>
            </button>
          )}
        </div>

        {/* Middle & Right: Sort Controls, Part Selector & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sort Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Sort:</span>
            <button
              className={`btn ${sortBy === 'risk' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              onClick={() => handleToggleSort('risk')}
              title="Sort by threat severity risk"
            >
              <span>Risk</span>
              {renderSortIcon('risk')}
            </button>
            <button
              className={`btn ${sortBy === 'date' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              onClick={() => handleToggleSort('date')}
              title="Sort by file modification date"
            >
              <span>Date</span>
              {renderSortIcon('date')}
            </button>
            <button
              className={`btn ${sortBy === 'size' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              onClick={() => handleToggleSort('size')}
              title="Sort by file size"
            >
              <span>Size</span>
              {renderSortIcon('size')}
            </button>
            <button
              className={`btn ${sortBy === 'name' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              onClick={() => handleToggleSort('name')}
              title="Sort by filename"
            >
              <span>Name</span>
              {renderSortIcon('name')}
            </button>
          </div>

          {/* Part Filter dropdown (when not paused) */}
          {availableParts.length > 1 && !chunkInfo?.isChunkPaused && onSelectPartFilter && (
            <select
              value={selectedPartFilter}
              onChange={e => onSelectPartFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                height: '26px'
              }}
              title="Filter threats by scanned part"
            >
              <option value="all">🌐 All Parts (1–{availableParts.length})</option>
              {availableParts.map(p => (
                <option key={p} value={p}>📦 Part {p}</option>
              ))}
            </select>
          )}

          {highRiskCount > 0 && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#ef4444' }}
              onClick={handleSelectAllHighRisk}
            >
              <span>Select High Risk ({highRiskCount})</span>
            </button>
          )}

          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: '11px', padding: '3px 8px 3px 26px', height: '26px', width: '100%' }}
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
                    onClick={() => {
                      const nextId = isExpanded ? null : threat.id;
                      setExpandedThreatId(nextId);
                      if (nextId) {
                        fetchFileHash(threat.file.path);
                      }
                    }}
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
                        gap: '12px'
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

                      {/* 🌐 VirusTotal Cloud Analysis Bar */}
                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            <Globe size={13} />
                            <span>VirusTotal Cloud Intelligence (70+ Antivirus Engines)</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Cross-checks this exact file's cryptographic hash against Kaspersky, Bitdefender, Microsoft Defender, and CrowdStrike on VirusTotal.
                          </div>
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={() => handleVirusTotalLookup(threat.file.path)}
                          disabled={virusTotalLoadingPath === threat.file.path}
                          style={{
                            fontSize: '11px',
                            padding: '5px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#2563eb',
                            borderColor: '#1d4ed8'
                          }}
                        >
                          <ExternalLink size={12} className={virusTotalLoadingPath === threat.file.path ? 'animate-spin' : ''} />
                          <span>{virusTotalLoadingPath === threat.file.path ? 'Hashing & Querying...' : 'Open on VirusTotal ↗'}</span>
                        </button>
                      </div>

                      {/* Cryptographic SHA-256 & MD5 Hash Checksum Card */}
                      <div style={{ background: 'var(--bg-panel)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                            Cryptographic SHA-256 Checksum:
                          </span>
                          {fileHashes[threat.file.path]?.sha256 && (
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '10px', padding: '2px 8px', height: '22px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleCopyHash(fileHashes[threat.file.path].sha256, `sha-${threat.id}`)}
                            >
                              {copiedHashKey === `sha-${threat.id}` ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                              <span>{copiedHashKey === `sha-${threat.id}` ? 'Copied SHA-256!' : 'Copy Hash'}</span>
                            </button>
                          )}
                        </div>

                        <code style={{ fontSize: '11px', color: 'var(--text-main)', background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '3px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {fileHashes[threat.file.path]?.isLoading
                            ? 'Calculating cryptographic SHA-256 hash...'
                            : fileHashes[threat.file.path]?.sha256 || 'Click "Open on VirusTotal" or expand to compute hash'}
                        </code>
                      </div>

                      {/* Recommendation */}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '2px 4px' }}>
                        💡 <strong>Recommended Action:</strong> {threat.recommendation}
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
