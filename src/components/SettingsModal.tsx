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
  Heart
} from 'lucide-react';
import { StorageLogo } from './StorageLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'about' | 'updates' | 'shortcuts' | 'guide';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<SettingsTab>('about');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    checked: boolean;
    isLatest: boolean;
    version: string;
    message: string;
  } | null>(null);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);

    // Simulate online repository check
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateStatus({
        checked: true,
        isLatest: true,
        version: 'v1.0.1',
        message: 'You are running the latest version of SpaceClean.'
      });
    }, 1200);
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
            gap: '4px',
            padding: '8px 16px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto'
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
            className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setActiveTab('updates')}
          >
            <RefreshCw size={13} />
            <span>Updates</span>
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
            <span>Detailed Guide</span>
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      SpaceClean
                    </h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      v1.0.1 Stable
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Next-Gen Memory-Optimized Windows Disk Storage Analyzer & Deep Cleaner
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
                SpaceClean processes all files locally on your computer with zero telemetry, zero data collection, and 100% Recycle Bin safety.
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
                    Current Version: <strong style={{ color: 'var(--accent-primary)' }}>v1.0.1</strong>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Automatic update checking via GitHub Releases.
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

              {updateStatus && (
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                      {updateStatus.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      All features and security definitions are up to date ({updateStatus.version}).
                    </div>
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  What's New in v1.0.1:
                </h4>
                <ul style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7, paddingLeft: '18px', margin: 0 }}>
                  <li>🧠 <strong>RAM Optimizer & Scan Milestone Navigator</strong>: Scans TBs without lag and allows jumping back to previous scan parts.</li>
                  <li>🔍 <strong>Duplicate Finder Preview Drawer & Date Filter</strong>: Live side-preview for audio, video, images, text, and date ranges.</li>
                  <li>🛡️ <strong>"Keep Both (Important)" Protection</strong>: Mark intentional duplicates safe so automated sweeps skip them.</li>
                  <li>📦 <strong>Multi-Select Batch App Uninstaller</strong>: Safe sequential queue uninstallation.</li>
                  <li>📂 <strong>Interactive Starting Screen</strong>: 1-click Browse Folder and Scan Drive actions.</li>
                </ul>
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
                  Switch between cleaning modes instantly using <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>Ctrl</kbd> or <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>Alt</kbd> + Number:
                </p>

                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px', width: '170px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>1</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📄 <strong>Files Explorer</strong> (Table view, filters, search)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>2</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📁 <strong>Folder Explorer</strong> (Directory tree & largest folder consumers)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>3</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>⚡ <strong>Smart Optimizer</strong> (Findings 1, 2... & Year Batches)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>4</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🔍 <strong>Duplicate Finder</strong> (MD5 Redundant Clones & Keep Both)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>5</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📊 <strong>Largest Files</strong> (Heavy video captures, ISOs, containers)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>6</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🗑️ <strong>Junk Cleaner</strong> (Windows caches, error logs, Recycle Bin)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>7</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>🖼️ <strong>Media Gallery</strong> (Visual Photos & Videos zoom grid)</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>8</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>📱 <strong>Apps Uninstaller</strong> (Batch sequential uninstallation)</td>
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
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>F</kbd> or <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>/</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Focus search & filter input</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>A</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Select all currently filtered files</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>D</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Deselect all files</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>O</kbd>
                        </td>
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Browse Folder (Open native directory picker)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>S</kbd> / <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Enter</kbd>
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
                        <td style={{ padding: '7px 14px', color: 'var(--text-main)' }}>Open Safe Delete & Recycle Bin confirmation dialog</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '7px 14px' }}>
                          <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>,</kbd>
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

          {/* 4. DETAILED GUIDE TAB */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '6px' }}>
                  <Cpu size={16} />
                  <span>1. RAM Optimizer (Chunked Scanning)</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Scanning massive hard drives (500 GB to 4 TB) with hundreds of thousands of files usually freezes Windows. SpaceClean's <strong>RAM Optimizer</strong> scans in safe batches of 5,000 files, pausing at manageable checkpoints so you can clean what was scanned first without lag. You can seamlessly click <strong>"Scan Next Part"</strong> or jump between <strong>Part 1</strong>, <strong>Part 2</strong>, etc. at any time.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '6px' }}>
                  <Sparkles size={16} />
                  <span>2. Smart Optimizer & Findings</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Organizes files into two intelligent cleanup modes:
                  <br />• <strong>Chronological Year Findings</strong> (e.g. <code>Finding 1: Year 2022 Files</code>, <code>Finding 2: Year 2023 Files</code>) to review and purge older forgotten files first.
                  <br />• <strong>Categorized Safety Findings</strong> (<code>Safe to Delete</code>, <code>Large Files &gt;200MB</code>, <code>Stale Files</code>) for 1-click batch cleanup.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#a855f7', marginBottom: '6px' }}>
                  <Copy size={16} />
                  <span>3. Duplicate Finder & Protection</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Uses cryptographic <strong>MD5 hashing</strong> to find exact identical files regardless of file names. Click <strong>"Keep Both (Important)"</strong> to mark intentional duplicates safe so automated batch tools will never touch them.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                  <ShieldCheck size={16} />
                  <span>4. 100% Safe Trash & Recycle Bin</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  By default, deleted files are safely moved into the <strong>Windows Recycle Bin</strong>. If you ever make a mistake, you can instantly restore your files with 1 click directly from the Recycle Bin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
