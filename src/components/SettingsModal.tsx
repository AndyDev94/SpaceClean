import React, { useState } from 'react';
import {
  X,
  Info,
  RefreshCw,
  Keyboard,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  HardDrive,
  Copy,
  Layers,
  Film,
  AppWindow,
  Cpu,
  Heart,
  ShieldAlert,
  Search,
  Globe,
  SlidersHorizontal,
  Calendar,
  Gauge,
  AlertTriangle,
  RotateCcw,
  Check,
  Pencil
} from 'lucide-react';
import { StorageLogo } from './StorageLogo';
import { osName, cmdOrCtrl, trashName, fileManagerName } from '../utils/platform';
import {
  DateFormatOption,
  DATE_FORMAT_OPTIONS,
  getPreferredDateFormat,
  setPreferredDateFormat,
  formatDisplayDate
} from '../utils/dateUtils';
import packageInfo from '../../package.json';
import { formatBytes } from '../utils/filterUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasScannedData?: boolean;
  hasActivePartScan?: boolean;
  onTriggerRescan?: () => void;
}

type SettingsTab = 'about' | 'preferences' | 'updates' | 'shortcuts' | 'guide';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasScannedData = false,
  hasActivePartScan = false,
  onTriggerRescan,
}) => {
  if (!isOpen) return null;

  const defaultVersion = packageInfo.version.startsWith('v') ? packageInfo.version : `v${packageInfo.version}`;
  const [activeTab, setActiveTab] = useState<SettingsTab>('about');
  const [currentAppVersion, setCurrentAppVersion] = useState(defaultVersion);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    transferred: number;
    total: number;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev-mode';
    version?: string;
    message: string;
    releaseUrl?: string;
  } | null>(null);

  // Preference Settings States
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatOption>(getPreferredDateFormat);
  const [chunkEnabled, setChunkEnabled] = useState<boolean>(() => {
    return localStorage.getItem('spaceclean_chunk_enabled') !== 'false';
  });
  const [chunkFiles, setChunkFiles] = useState<number>(() => {
    return parseInt(localStorage.getItem('spaceclean_chunk_files') || '20000', 10);
  });
  const [chunkBytes, setChunkBytes] = useState<number>(() => {
    return parseInt(localStorage.getItem('spaceclean_chunk_bytes') || String(25 * 1024 * 1024 * 1024), 10);
  });
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showRescanPrompt, setShowRescanPrompt] = useState<boolean>(false);

  // Custom inputs state
  const [isEditingCustomFiles, setIsEditingCustomFiles] = useState<boolean>(() => {
    const defaultPresets = [5000, 10000, 20000, 50000, 100000];
    const saved = parseInt(localStorage.getItem('spaceclean_chunk_files') || '20000', 10);
    return !defaultPresets.includes(saved);
  });
  const [customFilesInput, setCustomFilesInput] = useState<string>(() => {
    return localStorage.getItem('spaceclean_chunk_files') || '20000';
  });

  const [isEditingCustomBytes, setIsEditingCustomBytes] = useState<boolean>(() => {
    const defaultBytePresets = [
      10 * 1024 * 1024 * 1024,
      25 * 1024 * 1024 * 1024,
      50 * 1024 * 1024 * 1024,
      100 * 1024 * 1024 * 1024
    ];
    const saved = parseInt(localStorage.getItem('spaceclean_chunk_bytes') || String(25 * 1024 * 1024 * 1024), 10);
    return !defaultBytePresets.includes(saved);
  });
  const [customGbInput, setCustomGbInput] = useState<string>(() => {
    const saved = parseInt(localStorage.getItem('spaceclean_chunk_bytes') || String(25 * 1024 * 1024 * 1024), 10);
    return String(Math.max(1, Math.round(saved / (1024 * 1024 * 1024))));
  });

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const notifyEngineChanged = (msg: string) => {
    if (hasScannedData || hasActivePartScan) {
      setShowRescanPrompt(true);
      showToast(`${msg} • Rescan required for full accuracy & safety`);
    } else {
      showToast(msg);
    }
  };

  const handleSelectDateFormat = (fmt: DateFormatOption) => {
    setSelectedDateFormat(fmt);
    setPreferredDateFormat(fmt);
    showToast(`Date format updated to ${fmt}`);
  };

  const handleToggleChunkEnabled = (enabled: boolean) => {
    setChunkEnabled(enabled);
    localStorage.setItem('spaceclean_chunk_enabled', String(enabled));
    notifyEngineChanged(enabled ? 'Smart Part Scanning enabled' : 'Continuous Full Scan enabled');
  };

  const handleSelectChunkFiles = (filesCount: number) => {
    setChunkFiles(filesCount);
    setCustomFilesInput(String(filesCount));
    setIsEditingCustomFiles(![5000, 10000, 20000, 50000, 100000].includes(filesCount));
    localStorage.setItem('spaceclean_chunk_files', String(filesCount));
    notifyEngineChanged(`Part file limit set to ${filesCount.toLocaleString()} files`);
  };

  const handleSelectChunkBytes = (bytesLimit: number) => {
    setChunkBytes(bytesLimit);
    setCustomGbInput(String(Math.max(1, Math.round(bytesLimit / (1024 * 1024 * 1024)))));
    const defaultBytePresets = [
      10 * 1024 * 1024 * 1024,
      25 * 1024 * 1024 * 1024,
      50 * 1024 * 1024 * 1024,
      100 * 1024 * 1024 * 1024
    ];
    setIsEditingCustomBytes(!defaultBytePresets.includes(bytesLimit));
    localStorage.setItem('spaceclean_chunk_bytes', String(bytesLimit));
    notifyEngineChanged(`Part size limit set to ${formatBytes(bytesLimit, 0)}`);
  };

  const handleApplyCustomFilesInput = (val: string) => {
    setCustomFilesInput(val);
    const n = parseInt(val, 10);
    if (n && n > 0) {
      setChunkFiles(n);
      localStorage.setItem('spaceclean_chunk_files', String(n));
      notifyEngineChanged(`Custom file limit set to ${n.toLocaleString()} files`);
    }
  };

  const handleApplyCustomGbInput = (val: string) => {
    setCustomGbInput(val);
    const gb = parseFloat(val);
    if (gb && gb > 0) {
      const bytes = Math.round(gb * 1024 * 1024 * 1024);
      setChunkBytes(bytes);
      localStorage.setItem('spaceclean_chunk_bytes', String(bytes));
      notifyEngineChanged(`Custom size limit set to ${gb} GB`);
    }
  };

  const handleResetPreferences = () => {
    setSelectedDateFormat('YYYY/MM/DD');
    setPreferredDateFormat('YYYY/MM/DD');
    setChunkEnabled(true);
    localStorage.setItem('spaceclean_chunk_enabled', 'true');
    setChunkFiles(20000);
    setCustomFilesInput('20000');
    setIsEditingCustomFiles(false);
    localStorage.setItem('spaceclean_chunk_files', '20000');
    setChunkBytes(25 * 1024 * 1024 * 1024);
    setCustomGbInput('25');
    setIsEditingCustomBytes(false);
    localStorage.setItem('spaceclean_chunk_bytes', String(25 * 1024 * 1024 * 1024));
    notifyEngineChanged('Reset all settings to recommended defaults');
  };

  // Fetch current version on mount
  React.useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((ver) => {
      if (ver) setCurrentAppVersion(ver.startsWith('v') ? ver : `v${ver}`);
    }).catch(() => {});
  }, []);

  // Subscribe to live auto-updater events
  React.useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const unsubStatus = window.electronAPI.onUpdateStatus((data) => {
      setIsCheckingUpdate(false);
      setUpdateStatus({
        status: data.status as any,
        version: data.version,
        message: data.message || ''
      });
    });

    const unsubProgress = window.electronAPI.onUpdateProgress?.((progress) => {
      setDownloadProgress({
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      });
    });

    return () => {
      unsubStatus?.();
      unsubProgress?.();
    };
  }, []);

  // Robust semver comparison: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
  const compareSemver = (v1: string, v2: string): number => {
    const parse = (v: string) =>
      v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const [maj1 = 0, min1 = 0, pat1 = 0] = parse(v1);
    const [maj2 = 0, min2 = 0, pat2 = 0] = parse(v2);

    if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
    if (min1 !== min2) return min1 > min2 ? 1 : -1;
    if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
    return 0;
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    setDownloadProgress(null);

    // Get live running version
    let runningVer = currentAppVersion;
    try {
      const liveVer = await window.electronAPI?.getAppVersion?.();
      if (liveVer) {
        runningVer = liveVer.startsWith('v') ? liveVer : `v${liveVer}`;
        setCurrentAppVersion(runningVer);
      }
    } catch (e) {}

    // First attempt: Query GitHub Releases directly
    try {
      const ghRes = await fetch('https://api.github.com/repos/AndyDev94/SpaceClean/releases/latest');
      if (ghRes.ok) {
        const release = await ghRes.json();
        const latestTag = release.tag_name || runningVer;
        const isNewer = compareSemver(latestTag, runningVer) > 0;

        setIsCheckingUpdate(false);
        setUpdateStatus({
          status: isNewer ? 'available' : 'not-available',
          version: latestTag,
          message: isNewer
            ? `New release ${latestTag} is available on GitHub Releases!`
            : `You are running the latest version (${runningVer}).`,
          releaseUrl: isNewer ? release.html_url : undefined
        });

        // If newer release exists, trigger electron auto-updater download if available
        if (isNewer && window.electronAPI?.checkForUpdates) {
          window.electronAPI.checkForUpdates().catch(() => {});
        }
        return;
      }
    } catch (ghErr) {
      // Offline fallback
    }

    // Fallback attempt: electron auto-updater IPC
    if (window.electronAPI?.checkForUpdates) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        setIsCheckingUpdate(false);
        if (res.status === 'error') {
          setUpdateStatus({
            status: 'error',
            message: `Could not contact update server: ${res.message || 'Offline / unreachable'}`
          });
        } else {
          setUpdateStatus({
            status: 'not-available',
            version: runningVer,
            message: `You are running the latest version (${runningVer}).`
          });
        }
        return;
      } catch (err: any) {
        setIsCheckingUpdate(false);
        setUpdateStatus({
          status: 'error',
          message: 'Could not contact update server: ' + (err?.message || 'Network error')
        });
        return;
      }
    }

    setIsCheckingUpdate(false);
    setUpdateStatus({
      status: 'not-available',
      version: runningVer,
      message: `You are running the latest version (${runningVer}).`
    });
  };

  const handleInstallNow = () => {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  };

  const handleOpenGitHub = () => {
    window.open('https://github.com/AndyDev94/SpaceClean', '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-panel)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StorageLogo size={20} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              SpaceClean Settings & Help
            </h2>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '4px 6px', borderRadius: '4px' }}
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Horizontal Navigation Sub-tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}
        >
          <button
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('about')}
          >
            <Info size={13} />
            <span>About</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('preferences')}
          >
            <SlidersHorizontal size={13} />
            <span>Engine & Preferences</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={13} />
            <span>Shortcuts</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={13} />
            <span>Guide</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('updates')}
          >
            <RefreshCw size={13} />
            <span>Updates</span>
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Toast Notification */}
          {saveToast && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                marginBottom: '14px',
                padding: '8px 14px',
                background: 'rgba(59, 130, 246, 0.95)',
                color: '#ffffff',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              }}
            >
              <span>{saveToast}</span>
              <Check size={14} />
            </div>
          )}

          {/* 0. ENGINE & PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* SECTION 1: SMART PART SCANNING ENGINE */}
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gauge size={18} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Smart Part Scanning Engine
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                        Prevents memory spikes and UI freezing on large drives by indexing in responsive milestone parts.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>
                      {chunkEnabled ? 'Part Scanning (Active)' : 'Continuous Full Scan'}
                    </span>
                    <button
                      className={`btn ${chunkEnabled ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                      onClick={() => handleToggleChunkEnabled(!chunkEnabled)}
                    >
                      {chunkEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Rescan Required Warning Banner if limits modified during/after scan */}
                {showRescanPrompt && (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(234, 179, 8, 0.12)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(234, 179, 8, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <AlertTriangle size={16} style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, fontSize: '12px', lineHeight: '1.45', color: 'var(--text-main)' }}>
                        <strong style={{ color: '#eab308' }}>Rescan Recommended: </strong>
                        You modified the scanning engine limits while a scan was already performed. To ensure smooth operations, prevent missed files, and guarantee maximum safety, please run a fresh scan with your new engine configuration.
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => setShowRescanPrompt(false)}
                      >
                        Dismiss
                      </button>
                      {onTriggerRescan && (
                        <button
                          className="btn btn-primary"
                          style={{
                            fontSize: '11px',
                            padding: '4px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onClick={() => {
                            setShowRescanPrompt(false);
                            onTriggerRescan();
                          }}
                        >
                          <RefreshCw size={12} />
                          <span>Start Fresh Scan Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {chunkEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    {/* Threshold Rule Info Banner */}
                    <div
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}
                    >
                      <Sparkles size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '11.5px', lineHeight: '1.45', color: 'var(--text-main)' }}>
                        <strong style={{ color: 'var(--accent-primary)' }}>How Part Limits Work: </strong>
                        Whichever threshold is reached first — <strong>maximum file count</strong> or <strong>maximum storage volume</strong> — will complete the current part. You can inspect/clean files right away or resume the next part anytime.
                      </div>
                    </div>

                    {/* File Limit per Part */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          Maximum Files Indexed Per Part:
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          Current: {chunkFiles.toLocaleString()} files
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {[
                          { val: 5000, label: '5,000' },
                          { val: 10000, label: '10,000' },
                          { val: 20000, label: '20,000 (Default)' },
                          { val: 50000, label: '50,000' },
                          { val: 100000, label: '100,000' }
                        ].map(item => (
                          <button
                            key={item.val}
                            className={`btn ${!isEditingCustomFiles && chunkFiles === item.val ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => {
                              setIsEditingCustomFiles(false);
                              handleSelectChunkFiles(item.val);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                        <button
                          className={`btn ${isEditingCustomFiles ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onClick={() => {
                            setIsEditingCustomFiles(true);
                          }}
                        >
                          <Pencil size={11} />
                          <span>Custom {isEditingCustomFiles ? `(${chunkFiles.toLocaleString()})` : ''}</span>
                        </button>
                      </div>

                      {/* Custom Files Inline Input */}
                      {isEditingCustomFiles && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--bg-panel)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            width: 'fit-content'
                          }}
                        >
                          <Pencil size={12} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Custom File Limit:</span>
                          <input
                            type="number"
                            min="500"
                            step="500"
                            className="search-input"
                            style={{
                              width: '110px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}
                            value={customFilesInput}
                            onChange={(e) => handleApplyCustomFilesInput(e.target.value)}
                            placeholder="e.g. 15000"
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>files / part</span>
                        </div>
                      )}
                    </div>

                    {/* Data Size Limit per Part */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          Maximum Storage Volume Per Part:
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          Current: {formatBytes(chunkBytes, 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {[
                          { val: 10 * 1024 * 1024 * 1024, label: '10 GB' },
                          { val: 25 * 1024 * 1024 * 1024, label: '25 GB (Default)' },
                          { val: 50 * 1024 * 1024 * 1024, label: '50 GB' },
                          { val: 100 * 1024 * 1024 * 1024, label: '100 GB' }
                        ].map(item => (
                          <button
                            key={item.val}
                            className={`btn ${!isEditingCustomBytes && chunkBytes === item.val ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                            onClick={() => {
                              setIsEditingCustomBytes(false);
                              handleSelectChunkBytes(item.val);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                        <button
                          className={`btn ${isEditingCustomBytes ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onClick={() => {
                            setIsEditingCustomBytes(true);
                          }}
                        >
                          <Pencil size={11} />
                          <span>Custom {isEditingCustomBytes ? `(${formatBytes(chunkBytes, 0)})` : ''}</span>
                        </button>
                      </div>

                      {/* Custom GB Inline Input */}
                      {isEditingCustomBytes && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--bg-panel)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            width: 'fit-content'
                          }}
                        >
                          <Pencil size={12} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Custom Volume Limit:</span>
                          <input
                            type="number"
                            min="1"
                            max="2048"
                            step="1"
                            className="search-input"
                            style={{
                              width: '90px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}
                            value={customGbInput}
                            onChange={(e) => handleApplyCustomGbInput(e.target.value)}
                            placeholder="e.g. 15"
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>GB / part</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: UNIVERSAL DATE FORMAT */}
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Universal Date Format
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                        Customize how dates are displayed across all 9 modes in SpaceClean.
                      </p>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600 }}>
                    Live Preview: <strong style={{ color: 'var(--accent-primary)' }}>{formatDisplayDate(new Date(), false, selectedDateFormat)}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {DATE_FORMAT_OPTIONS.map(opt => {
                    const isSelected = selectedDateFormat === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectDateFormat(opt.id)}
                        className="panel"
                        style={{
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-panel)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                            {opt.id}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {opt.label.split('(')[1]?.replace(')', '') || opt.example}
                          </div>
                        </div>

                        {isSelected && <Check size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RESET BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleResetPreferences}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                  <RotateCcw size={13} />
                  <span>Restore Factory Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. ABOUT TAB */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <StorageLogo size={32} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      SpaceClean
                    </h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {currentAppVersion} Stable
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('updates');
                        handleCheckUpdate();
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 4px',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px'
                      }}
                      title="Switch to Updates tab and check for latest releases"
                    >
                      <RefreshCw size={11} className={isCheckingUpdate ? 'animate-spin' : ''} />
                      <span>{isCheckingUpdate ? 'Checking...' : 'Check for updates'}</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>
                    Next-Gen Memory-Optimized {osName} Disk Storage Analyzer & Deep Cleaner
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Developer</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>Aneesh Gupta</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Architecture</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>Electron 34 + React 18 + Vite</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>License</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>MIT Open Source</div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Repository</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleOpenGitHub}>
                    <span>github.com/AndyDev94/SpaceClean</span>
                    <ExternalLink size={12} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                  <ShieldCheck size={16} />
                  <span>Safe & Private</span>
                </div>
                SpaceClean processes all files locally on your {osName} device with zero telemetry, zero cloud tracking, and 100% {trashName} safety.
              </div>
            </div>
          )}

          {/* 2. UPDATES TAB */}
          {activeTab === 'updates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Current Version: <strong style={{ color: 'var(--accent-primary)' }}>{currentAppVersion}</strong>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Automatic update checking via GitHub Releases for {osName}.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  <RefreshCw size={13} className={isCheckingUpdate ? 'animate-spin' : ''} />
                  <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              </div>

              {/* Download Progress Bar */}
              {downloadProgress && (
                <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    <span>Downloading Update...</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{downloadProgress.percent}%</span>
                  </div>
                  <div className="progress-bar-track" style={{ height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${downloadProgress.percent}%` }} />
                  </div>
                </div>
              )}

              {/* Update Status Card */}
              {updateStatus && (
                <div
                  style={{
                    padding: '14px',
                    background: updateStatus.status === 'error'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : updateStatus.status === 'downloaded' || updateStatus.status === 'available'
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${
                      updateStatus.status === 'error'
                        ? '#ef4444'
                        : updateStatus.status === 'downloaded' || updateStatus.status === 'available'
                        ? 'var(--accent-primary)'
                        : '#10b981'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {updateStatus.status === 'error' ? (
                      <X size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                    ) : (
                      <CheckCircle2
                        size={18}
                        style={{
                          color: updateStatus.status === 'downloaded' || updateStatus.status === 'available'
                            ? 'var(--accent-primary)'
                            : '#10b981',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: updateStatus.status === 'error'
                            ? '#ef4444'
                            : updateStatus.status === 'downloaded' || updateStatus.status === 'available'
                            ? 'var(--accent-primary)'
                            : '#10b981'
                        }}
                      >
                        {updateStatus.message}
                      </div>
                      {updateStatus.version && (updateStatus.status === 'available' || updateStatus.status === 'downloaded') && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Available Version: {updateStatus.version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Update */}
                  {updateStatus.status === 'downloaded' && (
                    <button
                      className="btn btn-primary"
                      onClick={handleInstallNow}
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      <span>🚀 Restart & Install Now</span>
                    </button>
                  )}

                  {updateStatus.releaseUrl && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => window.open(updateStatus.releaseUrl, '_blank')}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <ExternalLink size={12} />
                      <span>View on GitHub</span>
                    </button>
                  )}
                </div>
              )}

              {/* Scrollable Version Release History */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 🌟 What's New in v3.0.0 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={15} style={{ color: '#10b981' }} />
                      <span>What's New in SpaceClean v3.0.0</span>
                    </h4>
                    <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700 }}>
                      Latest Major Release
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Duplicate Finder Multi-Field & Date Sorting */}
                    <div style={{ padding: '9px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Copy size={13} style={{ color: '#a855f7' }} />
                        <span>Duplicate Finder: New → Old & Old → New Date Sorting</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        Added 1-click segmented sorting controls to sort duplicate groups by <strong>Date (Newest to Oldest & Oldest to Newest)</strong>, <strong>Waste Size</strong>, <strong>Duplicate Copies Count</strong>, and <strong>Alphabetical Name</strong>.
                      </div>
                    </div>

                    {/* Threats Mode Navigation & Ignore All */}
                    <div style={{ padding: '9px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <ShieldAlert size={13} style={{ color: '#ef4444' }} />
                        <span>Threats Mode: Part Navigation, 1-Click Whitelist & Multi-Field Sorting</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        Integrated RAM Optimizer part-by-part scanning banner directly inside Threats Mode, 1-click <strong>Ignore All (Trust All)</strong> with persistent whitelist storage & restore, plus multi-field date, risk, and size sorting.
                      </div>
                    </div>

                    {/* Live Video Thumbnail Frame Generator */}
                    <div style={{ padding: '9px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Film size={13} style={{ color: '#3b82f6' }} />
                        <span>Media Gallery: Live Video Thumbnail Frame Extraction</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        Hardware-accelerated native HTML5 video frame capture automatically seeks to real representative frames (<code>1.0s</code> / <code>0.1s</code>) with glassmorphic play badges and graceful format fallback.
                      </div>
                    </div>

                    {/* Universal High Contrast Segmented Redesign */}
                    <div style={{ padding: '9px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Sparkles size={13} style={{ color: '#f59e0b' }} />
                        <span>Universal Theme Contrast & UI Streamlining</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        High-contrast segmented pill containers across all 9 modes ensuring pristine readability in Light Mode, Solarized Light, Obsidian, and Dark Modern themes. Streamlined Junk Cleaner selection controls.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🚀 What's New in v2.0.0 */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>What's New in SpaceClean v2.0.0</span>
                    </h4>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>v2.0.0</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Mode 7: Threat Detection */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <ShieldAlert size={13} style={{ color: '#ef4444' }} />
                        <span>Mode 7: Threat Detection & VirusTotal Cloud Intelligence</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Heuristic scanner for camouflaged malware (<code>.pdf.exe</code>), rogue temp binaries, ransomware locking patterns, with direct 1-click <strong>VirusTotal (70+ Antivirus engines)</strong> cloud verification.
                      </div>
                    </div>

                    {/* Mode 8: Media Gallery */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Film size={13} style={{ color: '#10b981' }} />
                        <span>Mode 8: Media Gallery & Hardware-Accelerated Visual Grid</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Interactive visual manager for photos, screenshots, and videos with a responsive zoom grid slider, inline video playback with timeline scrubbing, and 1-click multi-select cleanup.
                      </div>
                    </div>

                    {/* Mode 9: Apps Uninstaller */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <AppWindow size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span>Mode 9: Multi-Select Batch Applications Uninstaller</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Detects installed software, publishers, and storage footprint. Select multiple unwanted programs or heavy games (&gt;500MB) to uninstall sequentially without installer conflicts.
                      </div>
                    </div>

                    {/* Smart RAM Optimizer */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Sparkles size={13} style={{ color: '#f59e0b' }} />
                        <span>Smart RAM Optimizer & Milestone Part Navigator</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Effortlessly scans massive 500GB–2TB+ drives in smooth 5,000-file parts without memory bloat. Switch seamlessly between Part 1, Part 2, and All Scanned parts.
                      </div>
                    </div>

                    {/* Duplicate Finder */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Search size={13} style={{ color: '#a855f7' }} />
                        <span>Duplicate Finder Preview Drawer & "Keep Both" Protection</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Live side-preview for audio, video, images, and text. Lock intentional copies permanently with <strong>Keep Both (Important)</strong>.
                      </div>
                    </div>

                    {/* Cross-Platform & Auto-Updates */}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <Globe size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span>Dynamic Cross-Platform Engine & Auto-Updates</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Auto-detects macOS, Linux, and Windows for OS terminology (Cmd vs Ctrl, Finder vs File Explorer, Trash vs Recycle Bin) and supports silent background auto-updates.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 📦 What's New in v1.0.0 */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      <span>SpaceClean v1.0.0 (Foundation)</span>
                    </h4>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontWeight: 600 }}>v1.0.0</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Initial foundation release featuring ultra-fast multithreaded directory scanning, recursive folder size analysis, Top 100 space hogs, Windows system junk cleaner, and OS Recycle Bin safety.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. KEYBINDS & SHORTCUTS TAB */}
          {activeTab === 'shortcuts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  🌐 Tab & Mode Quick-Switch Shortcuts
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Switch between cleaning modes instantly using <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>{cmdOrCtrl}</kbd> or <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>Alt</kbd> + Number:
                </p>

                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px', width: '170px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>1</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📄 <strong>Files Explorer</strong> (Table view, filters, search)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>2</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📁 <strong>Folder Explorer</strong> (Directory tree & largest folder consumers)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>3</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>⚡ <strong>Smart Optimizer</strong> (Findings 1, 2... & Year Batches)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>4</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🔍 <strong>Duplicate Finder</strong> (MD5 Redundant Clones & Keep Both)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>5</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📊 <strong>Largest Files</strong> (Heavy video captures, ISOs, containers)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>6</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🗑️ <strong>Junk Cleaner</strong> ({osName} caches, error logs, {trashName})</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>7</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🛡️ <strong>Threat Detection</strong> (Camouflage executables, rogue binaries, scripts)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>8</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🖼️ <strong>Media Gallery</strong> (Visual Photos & Videos zoom grid)</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>9</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>💻 <strong>Apps Uninstaller</strong> (Batch sequential uninstallation)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  ⚡ Actions, Selection & Controls
                </h4>

                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px', width: '170px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>F</kbd> or <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>/</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Focus search & filter input</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>A</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Select all currently filtered files</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>D</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Deselect all files</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>O</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Browse Folder (Open native directory picker)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>S</kbd> / <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Enter</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Start scan or rescan current target</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Space</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Toggle selection checkbox on highlighted file</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Enter</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Open file with default app / Inspect in Side Preview Drawer</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Delete</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Open Safe Delete & {trashName} confirmation dialog</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{cmdOrCtrl}</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>,</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Open Settings & Help Guide dialog</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>↑</kbd> / <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>↓</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Navigate row-by-row in file table</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Esc</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Close preview drawer, dismiss modals, or deselect text</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. GUIDE TAB */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Step-by-Step Workflow */}
              <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span>3-Step Quick Start Workflow</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>STEP 1: SELECT & SCAN</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      Select a drive from the top bar or click <strong>Browse Folder</strong> (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+O</kbd>). Click <strong>Start Scan</strong>.
                    </p>
                  </div>

                  <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>STEP 2: PICK A CLEANUP TOOL</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      Switch between 8 specialized modes (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+1..8</kbd>) tailored for duplicates, heavy files, apps, or junk.
                    </p>
                  </div>

                  <div style={{ padding: '10px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>STEP 3: PREVIEW & SAFE DELETE</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      Inspect files with Live Preview (<kbd style={{ fontSize: '10px' }}>Enter</kbd>), select items, and delete safely to {trashName}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Comprehensive Tool & Mode Guide */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                  🛠️ Guide to Each Cleaning Mode & Tool
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Mode 1: Files Explorer */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        📄 1. Storage Files Explorer (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+1</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>Master Inventory</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Filtering, searching, and sorting thousands of files.
                      <br />• <strong>Features:</strong> Filter by date ranges (Today, Past 6 Months, Custom), categories (Videos, Archives, Code), and file size thresholds.
                      <br />• <strong>Usage:</strong> Click column headers (Size, Modified, Name) to sort, press <kbd style={{ fontSize: '10px' }}>Space</kbd> to toggle checkboxes, and click <strong>Delete</strong> (<kbd style={{ fontSize: '10px' }}>Del</kbd>).
                    </p>
                  </div>

                  {/* Mode 2: Folder Explorer */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        📁 2. Folder Explorer (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+2</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>Tree & Size Breakdown</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Pinpointing which large folders (e.g. <code>Downloads</code>, <code>Games</code>, <code>node_modules</code>) are consuming all your disk space.
                      <br />• <strong>Features:</strong> Expandable directory tree with percentage consumption bars and file counts.
                      <br />• <strong>Usage:</strong> Drill down into nested subfolders to immediately see where gigabytes are clustered.
                    </p>
                  </div>

                  {/* Mode 3: Smart Optimizer */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ⚡ 3. Smart Optimizer (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+3</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>Guided Findings</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Cleanups guided by age and safety without manual sorting.
                      <br />• <strong>Year Findings:</strong> Groups files into <code>Finding 1: Year 2022 Files</code>, <code>Finding 2: Year 2023 Files</code> so you can purge forgotten older archives first.
                      <br />• <strong>Safety Findings:</strong> One-click safety categories (<code>Safe to Delete Cache</code>, <code>Large Files &gt;200MB</code>, <code>Stale Files</code>).
                    </p>
                  </div>

                  {/* Mode 4: Duplicate Finder */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        🔍 4. Duplicate Finder (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+4</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 600 }}>MD5 Checksums</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Finding redundant clone files regardless of renamed file names.
                      <br />• <strong>Features:</strong> Cryptographic MD5 checksum verification, real-time search, date range filters, and live media side-preview.
                      <br />• <strong>Usage:</strong> Click <strong>Keep Newest</strong> / <strong>Keep Oldest</strong> to auto-mark copies. Click <strong>Keep Both (Important)</strong> on intentional backups to lock and protect them permanently.
                    </p>
                  </div>

                  {/* Mode 5: Largest Files */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        📊 5. Largest Files (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+5</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>Fast Space Reclamation</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Freeing 50 GB to 200 GB in seconds.
                      <br />• <strong>Features:</strong> Ranks the top 100 heaviest files (large video screen captures, ISO disk images, virtual machines).
                      <br />• <strong>Usage:</strong> Inspect each large file with the live preview drawer and delete heavy space hogs.
                    </p>
                  </div>

                  {/* Mode 6: Junk Cleaner */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        🗑️ 6. System Junk & {trashName} (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+6</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>OS Maintenance</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Cleaning temporary OS caches, error logs, and emptying the {trashName}.
                      <br />• <strong>Features:</strong> Target individual cache locations, click <strong>Select All Safe Targets</strong>, or click <strong>Ignore All (Keep All)</strong> to hide notification dots and preserve logs.
                    </p>
                  </div>

                  {/* Mode 7: Threat Detection / Security Guard */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        🛡️ 7. Threat Detection & Security Guard (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+7</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>Heuristic Malware Guard</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Detecting camouflaged malware, double-extension executables, and rogue payloads.
                      <br />• <strong>Detection Capabilities:</strong> Catches double-extension disguise (<code>.pdf.exe</code>, <code>.jpg.vbs</code>), rogue executables in Temp/AppData, system binary impersonation outside System32, and ransomware locking patterns.
                      <br />• <strong>Controls:</strong> Review danger triggers and danger rationale. Use <strong>Quarantine / Delete</strong> or <strong>Trust File (Whitelist)</strong>.
                    </p>
                  </div>

                  {/* Mode 8: Media Gallery */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        🖼️ 8. Media Gallery (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+8</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>Visual Manager</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Visual inspection and cleanup of photos, screenshots, and video clips.
                      <br />• <strong>Features:</strong> Responsive thumbnail size zoom slider, hover duration metadata, and quick multi-select cards.
                    </p>
                  </div>

                  {/* Mode 9: Apps Uninstaller */}
                  <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        💻 9. Apps Uninstaller (<kbd style={{ fontSize: '10px' }}>{cmdOrCtrl}+9</kbd>)
                      </span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>Batch Software Removal</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Best For:</strong> Removing unwanted programs and games without uninstalling one-by-one.
                      <br />• <strong>Features:</strong> Check multiple software cards (or click <strong>Select Heavy &gt;500MB</strong>). Uninstalls run sequentially in a managed queue to prevent OS installer conflicts.
                    </p>
                  </div>
                </div>
              </div>

              {/* RAM Optimizer Architecture Explanation */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} />
                  <span>RAM Optimizer (Chunked Scanning) Architecture</span>
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                  When scanning massive 500GB+ drives or folders, SpaceClean scans in smooth 5,000-file parts to prevent system lag. Use the <strong>Part Navigator</strong> dropdown at the top to jump between Part 1, Part 2, or All Scanned files at any time. Any files deleted in previous parts will never reappear when navigating back.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
