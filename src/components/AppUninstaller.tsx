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
  FolderOpen
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

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: statusMessage.type === 'success' ? '#34d399' : '#f87171'
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

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
          filteredApps.map((app) => (
            <div
              key={app.id}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                gap: '16px',
                transition: 'all 0.2s ease'
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
          ))
        )}
      </div>
    </div>
  );
};
