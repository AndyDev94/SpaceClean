import React, { useState, useEffect, useMemo } from 'react';
import {
  AppWindow,
  Search,
  Trash2,
  RotateCw,
  ExternalLink,
  Shield,
  HardDrive,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Flame,
  Filter
} from 'lucide-react';
import { InstalledApp } from '../types';
import { formatBytes } from '../utils/filterUtils';

export const AppUninstaller: React.FC = () => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const fetchApps = async () => {
    if (!window.electronAPI?.getInstalledApps) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await window.electronAPI.getInstalledApps();
      setApps(data || []);
    } catch (e: any) {
      console.error('Error fetching apps:', e);
      setStatusMessage({ type: 'error', text: 'Failed to load installed applications list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const totalAppBytes = useMemo(() => {
    return apps.reduce((acc, app) => acc + (app.sizeBytes || 0), 0);
  }, [apps]);

  const heavyApps = useMemo(() => {
    return apps.filter(app => (app.sizeBytes || 0) >= 500 * 1024 * 1024);
  }, [apps]);

  const heavyAppsBytes = useMemo(() => {
    return heavyApps.reduce((acc, app) => acc + (app.sizeBytes || 0), 0);
  }, [heavyApps]);

  const filteredApps = useMemo(() => {
    return apps
      .filter(app => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          (app.publisher && app.publisher.toLowerCase().includes(q)) ||
          (app.version && app.version.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'size') {
          return (b.sizeBytes || 0) - (a.sizeBytes || 0) || a.name.localeCompare(b.name);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'date') {
          return (b.installDate || '').localeCompare(a.installDate || '') || a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [apps, searchQuery, sortBy]);

  const handleUninstall = async (app: InstalledApp) => {
    if (!window.electronAPI?.uninstallApp) return;
    if (app.isSystemProtected) {
      setStatusMessage({ type: 'error', text: `${app.name} is a protected system application and cannot be removed.` });
      return;
    }

    const confirmMsg = `Launch uninstaller for "${app.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUninstallingId(app.id);
    setStatusMessage(null);

    try {
      const res = await window.electronAPI.uninstallApp(app.uninstallString || '', app.installLocation);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Uninstaller launched for ${app.name}. Complete the wizard and refresh.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || `Failed to trigger uninstaller for ${app.name}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error executing uninstall'
      });
    } finally {
      setUninstallingId(null);
    }
  };

  const handleOpenFolder = async (folderPath?: string) => {
    if (!folderPath || !window.electronAPI?.showItemInFolder) return;
    try {
      await window.electronAPI.showItemInFolder(folderPath);
    } catch {}
  };

  // Keyboard navigation listener (Arrow Up/Down, Enter to uninstall)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (filteredApps.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(filteredApps.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentApp = filteredApps[focusedIndex];
        if (currentApp && !currentApp.isSystemProtected) {
          handleUninstall(currentApp);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredApps, focusedIndex]);

  // Scroll active app into view
  React.useEffect(() => {
    const activeEl = document.querySelector(`[data-app-index="${focusedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppWindow size={20} style={{ color: 'var(--accent-primary)' }} />
            App Uninstaller & Software Manager
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {apps.length} installed applications consuming ~{formatBytes(totalAppBytes)} of disk storage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchApps}
            disabled={isLoading}
            title="Refresh Installed Applications"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Apps</span>
          </button>
        </div>
      </div>

      {/* Dedicated App Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {/* Card 1: Total Applications */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AppWindow size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Installed Apps
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
              {isLoading ? '...' : `${apps.length.toLocaleString()} Apps`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Whole System (Computer)
            </div>
          </div>
        </div>

        {/* Card 2: Total Disk Space Consumed */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HardDrive size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              App Disk Space
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
              {isLoading ? '...' : formatBytes(totalAppBytes)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Total disk consumption
            </div>
          </div>
        </div>

        {/* Card 3: Large Apps > 500 MB */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Large Apps (&gt;500 MB)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>
              {isLoading ? '...' : `${heavyApps.length} Apps (${formatBytes(heavyAppsBytes)})`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Candidates for reclaim
            </div>
          </div>
        </div>

        {/* Card 4: Filter / Search Results */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Filter size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Matching Search
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
              {isLoading ? '...' : `${filteredApps.length} Apps`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {searchQuery.trim() ? `Filter: "${searchQuery}"` : 'All displayed'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search installed applications..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              fontSize: '13px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        {/* Sort Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sort by:</span>
          <button
            className={`btn btn-secondary ${sortBy === 'size' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', background: sortBy === 'size' ? 'var(--accent-primary)' : undefined, color: sortBy === 'size' ? '#fff' : undefined }}
            onClick={() => setSortBy('size')}
          >
            Largest Size
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'name' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', background: sortBy === 'name' ? 'var(--accent-primary)' : undefined, color: sortBy === 'name' ? '#fff' : undefined }}
            onClick={() => setSortBy('name')}
          >
            Name A–Z
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'date' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '12px', background: sortBy === 'date' ? 'var(--accent-primary)' : undefined, color: sortBy === 'date' ? '#fff' : undefined }}
            onClick={() => setSortBy('date')}
          >
            Install Date
          </button>
        </div>
      </div>

      {/* Applications Table / Cards List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RotateCw size={36} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.5, color: 'var(--accent-primary)' }} />
            <p style={{ fontSize: '14px', fontWeight: 500 }}>Scanning installed software...</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Querying system registry and application directories</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AppWindow size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No applications found</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Try a different search query or click refresh.</p>
          </div>
        ) : (
          filteredApps.map((app, idx) => {
            const isFocused = focusedIndex === idx;

            return (
              <div
                key={app.id}
                data-app-index={idx}
                className="glass-panel"
                onClick={() => setFocusedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isFocused ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  boxShadow: isFocused ? '0 0 10px rgba(59, 130, 246, 0.35)' : undefined,
                  background: isFocused ? 'rgba(59, 130, 246, 0.08)' : undefined,
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
              {/* App Identity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: '1' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    flexShrink: 0
                  }}
                >
                  <AppWindow size={20} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {app.publisher && <span>{app.publisher}</span>}
                    {app.version && (
                      <>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span>v{app.version}</span>
                      </>
                    )}
                    {app.installDate && (
                      <>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Calendar size={11} /> {app.installDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* App Size & Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right', minWidth: '90px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: app.sizeBytes && app.sizeBytes > 1024 * 1024 * 1024 ? '#ff6b81' : 'var(--text-main)' }}>
                    {app.formattedSize || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    App Size
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {app.installLocation && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      title="Open App Folder in File Explorer"
                      onClick={() => handleOpenFolder(app.installLocation)}
                    >
                      <FolderOpen size={14} />
                    </button>
                  )}

                  {app.isSystemProtected ? (
                    <span
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="System App (Required by Windows)"
                    >
                      <Shield size={12} /> System App
                    </span>
                  ) : (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleUninstall(app)}
                      disabled={uninstallingId === app.id}
                      title="Open Uninstaller"
                    >
                      <Trash2 size={13} />
                      <span>{uninstallingId === app.id ? 'Opening...' : 'Uninstall'}</span>
                    </button>
                  )}
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
