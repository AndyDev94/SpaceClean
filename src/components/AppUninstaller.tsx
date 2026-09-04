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
  Filter,
  CheckSquare,
  Square,
  Play,
  X,
  Sparkles
} from 'lucide-react';
import { InstalledApp } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { osName } from '../utils/platform';

export const AppUninstaller: React.FC = () => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Status & Batch Modal
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; appName: string } | null>(null);

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
      setSelectedAppIds(new Set());
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
    return apps.filter(app => (app.sizeBytes || 0) >= 500 * 1024 * 1024 && !app.isSystemProtected);
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

  // Selection handlers
  const toggleSelectApp = (id: string) => {
    const next = new Set(selectedAppIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAppIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedAppIds);
    filteredApps.filter(app => !app.isSystemProtected).forEach(app => next.add(app.id));
    setSelectedAppIds(next);
  };

  const deselectAll = () => {
    setSelectedAppIds(new Set());
  };

  const selectHeavyApps = () => {
    const next = new Set(selectedAppIds);
    heavyApps.forEach(app => next.add(app.id));
    setSelectedAppIds(next);
  };

  const selectedAppsList = useMemo(() => {
    return apps.filter(app => selectedAppIds.has(app.id));
  }, [apps, selectedAppIds]);

  const selectedBytes = useMemo(() => {
    return selectedAppsList.reduce((acc, app) => acc + (app.sizeBytes || 0), 0);
  }, [selectedAppsList]);

  // Single App Uninstall
  const handleUninstallSingle = async (app: InstalledApp) => {
    if (!window.electronAPI?.uninstallApp) return;
    if (app.isSystemProtected) {
      setStatusMessage({ type: 'error', text: `${app.name} is a protected system application and cannot be removed.` });
      return;
    }

    if (!window.confirm(`Launch official uninstaller for "${app.name}"?`)) return;

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

  // Sequential Batch Uninstaller Executor
  const startSequentialBatchUninstall = async () => {
    if (!window.electronAPI?.uninstallApp || selectedAppsList.length === 0) return;
    setIsBatchRunning(true);

    for (let i = 0; i < selectedAppsList.length; i++) {
      const currentApp = selectedAppsList[i];
      setBatchProgress({
        current: i + 1,
        total: selectedAppsList.length,
        appName: currentApp.name
      });

      try {
        await window.electronAPI.uninstallApp(currentApp.uninstallString || '', currentApp.installLocation);
      } catch (err) {
        console.error(`Error uninstalling ${currentApp.name}`, err);
      }

      // Small pause between launching installers to allow Windows to register process handle
      await new Promise(r => setTimeout(r, 1200));
    }

    setIsBatchRunning(false);
    setIsBatchModalOpen(false);
    setBatchProgress(null);
    setStatusMessage({
      type: 'success',
      text: `All ${selectedAppsList.length} uninstaller wizards launched. Refresh when done!`
    });
    // Auto-refresh list after short delay
    setTimeout(() => {
      fetchApps();
    }, 2000);
  };

  const handleOpenFolder = async (folderPath?: string) => {
    if (!folderPath || !window.electronAPI?.showItemInFolder) return;
    try {
      await window.electronAPI.showItemInFolder(folderPath);
    } catch {}
  };

  // Keyboard navigation listener (Arrow Up/Down, Space to toggle select, Enter to uninstall)
  useEffect(() => {
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
      } else if (e.key === ' ') {
        e.preventDefault();
        const currentApp = filteredApps[focusedIndex];
        if (currentApp && !currentApp.isSystemProtected) {
          toggleSelectApp(currentApp.id);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentApp = filteredApps[focusedIndex];
        if (currentApp && !currentApp.isSystemProtected) {
          handleUninstallSingle(currentApp);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredApps, focusedIndex, selectedAppIds]);

  // Scroll active app into view
  useEffect(() => {
    const activeEl = document.querySelector(`[data-app-index="${focusedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        overflow: 'hidden',
        background: 'var(--bg-app)'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppWindow size={20} style={{ color: 'var(--accent-primary)' }} />
            App Uninstaller & Software Manager
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {apps.length.toLocaleString()} installed applications consuming ~{formatBytes(totalAppBytes)} of disk storage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchApps}
            disabled={isLoading}
            title="Refresh Installed Applications"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Apps</span>
          </button>

          {selectedAppsList.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setIsBatchModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Trash2 size={16} />
              <span>Batch Uninstall {selectedAppsList.length} Apps ({formatBytes(selectedBytes)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            flexShrink: 0
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* System Software Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px', flexShrink: 0 }}>
        {/* Card 1: Total Applications */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
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
              Whole System
            </div>
          </div>
        </div>

        {/* Card 2: Total Disk Space Consumed */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
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
              Total footprint
            </div>
          </div>
        </div>

        {/* Card 3: Large Apps > 500 MB */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
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
              Top cleanup targets
            </div>
          </div>
        </div>

        {/* Card 4: Selected for Removal */}
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckSquare size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Selected For Removal
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: selectedAppsList.length > 0 ? '#ef4444' : 'var(--text-main)', marginTop: '2px' }}>
              {selectedAppsList.length} Apps ({formatBytes(selectedBytes)})
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {selectedAppsList.length > 0 ? 'Ready to uninstall' : 'None selected'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search & Batch Selection Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search installed applications..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 32px',
                fontSize: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Batch Select Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={selectAllFiltered}
            title="Select all non-system applications in current view"
          >
            Select All ({filteredApps.filter(a => !a.isSystemProtected).length})
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={selectHeavyApps}
            title="Select all apps larger than 500 MB"
          >
            Select Heavy (&gt;500MB)
          </button>
          {selectedAppsList.length > 0 && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={deselectAll}
              title="Clear all selections"
            >
              Deselect All
            </button>
          )}
        </div>

        {/* Sort Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sort:</span>
          <button
            className={`btn btn-secondary ${sortBy === 'size' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: sortBy === 'size' ? 'var(--accent-primary)' : undefined, color: sortBy === 'size' ? '#fff' : undefined }}
            onClick={() => setSortBy('size')}
          >
            Largest
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'name' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: sortBy === 'name' ? 'var(--accent-primary)' : undefined, color: sortBy === 'name' ? '#fff' : undefined }}
            onClick={() => setSortBy('name')}
          >
            A–Z
          </button>
          <button
            className={`btn btn-secondary ${sortBy === 'date' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px', background: sortBy === 'date' ? 'var(--accent-primary)' : undefined, color: sortBy === 'date' ? '#fff' : undefined }}
            onClick={() => setSortBy('date')}
          >
            Date
          </button>
        </div>
      </div>

      {/* Selected Action Pill */}
      {selectedAppsList.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
            {selectedAppsList.length} apps selected ({formatBytes(selectedBytes)})
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={deselectAll}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '3px 12px', fontSize: '11px', fontWeight: 600 }}
              onClick={() => setIsBatchModalOpen(true)}
            >
              Batch Uninstall Selected ({selectedAppsList.length})
            </button>
          </div>
        </div>
      )}

      {/* Applications Cards List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RotateCw size={36} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.8, color: 'var(--accent-primary)' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Scanning installed software...</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Querying system registry and application directories</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AppWindow size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>No applications found</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Try a different search query or click refresh.</p>
          </div>
        ) : (
          filteredApps.map((app, idx) => {
            const isSelected = selectedAppIds.has(app.id);
            const isFocused = focusedIndex === idx;

            return (
              <div
                key={app.id}
                data-app-index={idx}
                className="panel"
                onClick={() => {
                  setFocusedIndex(idx);
                  if (!app.isSystemProtected) toggleSelectApp(app.id);
                }}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '1.5px solid #ef4444'
                    : isFocused
                    ? '1.5px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
                  background: isSelected
                    ? 'rgba(239, 68, 68, 0.08)'
                    : isFocused
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-panel)',
                  boxShadow: isFocused ? '0 0 10px rgba(59, 130, 246, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                  gap: '16px',
                  cursor: app.isSystemProtected ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Checkbox & App Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: '1' }}>
                  {/* Multi-select Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={app.isSystemProtected}
                    onChange={() => toggleSelectApp(app.id)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      cursor: app.isSystemProtected ? 'not-allowed' : 'pointer',
                      width: '16px',
                      height: '16px',
                      opacity: app.isSystemProtected ? 0.3 : 1
                    }}
                    title={app.isSystemProtected ? 'Protected system app' : 'Select for batch uninstallation'}
                  />

                  {app.icon ? (
                    <img
                      src={app.icon}
                      alt={app.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        flexShrink: 0
                      }}
                      onError={e => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
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
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#ef4444' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: app.sizeBytes && app.sizeBytes > 1024 * 1024 * 500 ? '#ff6b81' : 'var(--text-main)' }}>
                      {app.formattedSize || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Disk Space
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {app.installLocation && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="Open App Folder in File Explorer"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenFolder(app.installLocation);
                        }}
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
                          gap: '4px',
                          fontWeight: 600
                        }}
                        title="System App (Required by OS)"
                      >
                        <Shield size={12} /> System App
                      </span>
                    ) : (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={e => {
                          e.stopPropagation();
                          handleUninstallSingle(app);
                        }}
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

      {/* Sequential Batch Uninstall Confirmation Modal */}
      {isBatchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Batch Uninstall {selectedAppsList.length} Applications?
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Total disk space to be recovered: <strong>{formatBytes(selectedBytes)}</strong>
                </p>
              </div>
            </div>

            {/* Apps Queue List */}
            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-subtle)',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {selectedAppsList.map((app, i) => (
                <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {app.icon ? (
                      <img src={app.icon} alt="" style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'contain', flexShrink: 0 }} />
                    ) : (
                      <AppWindow size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    )}
                    <span style={{ color: 'var(--text-main)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i + 1}. {app.name}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {app.formattedSize || '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Execution Warning / Note */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', lineHeight: 1.5 }}>
              💡 <strong>Sequential Execution:</strong> {osName} runs each uninstaller in sequence. Please complete the setup prompt for each application as it appears on your screen.
            </div>

            {/* Live Progress Indicator if running */}
            {isBatchRunning && batchProgress && (
              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  <RotateCw size={14} className="animate-spin" />
                  <span>Uninstalling {batchProgress.current} of {batchProgress.total}: {batchProgress.appName}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Please interact with the uninstaller window on your screen.
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isBatchRunning}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={startSequentialBatchUninstall}
                disabled={isBatchRunning}
                style={{ padding: '6px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <Play size={13} />
                <span>{isBatchRunning ? 'Running Queue...' : 'Start Batch Uninstaller'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
