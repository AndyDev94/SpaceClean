import React, { useState, useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { Navbar, AppTab } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ScanProgressIndicator } from './components/ScanProgressIndicator';
import { FileFilterBar } from './components/FileFilterBar';
import { FileTable } from './components/FileTable';
import { FilePreviewDrawer } from './components/FilePreviewDrawer';
import { FolderExplorer } from './components/FolderExplorer';
import { SmartFolderCleanup } from './components/SmartFolderCleanup';
import { JunkCleaner } from './components/JunkCleaner';
import { DuplicateFinder } from './components/DuplicateFinder';
import { LargeFilesView } from './components/LargeFilesView';
import { MediaGallery } from './components/MediaGallery';
import { AppUninstaller } from './components/AppUninstaller';
import { DeleteModal } from './components/DeleteModal';

import { Play, Sparkles, AlertCircle, RefreshCw, Zap, Layers } from 'lucide-react';
import {
  FileInfo,
  FolderInfo,
  DriveInfo,
  FilterState,
  JunkItem,
  DuplicateGroup,
  DeleteResult,
  ScanResult,
  ScanProgress,
  ScanChunkInfo,
  ThemePreset
} from './types';
import { filterFiles, sortFiles, formatBytes } from './utils/filterUtils';
import { subDays, isBefore } from 'date-fns';

const INITIAL_FILTER: FilterState = {
  categories: [],
  extensions: [],
  dateMode: 'modified',
  datePreset: 'all',
  minSizeBytes: 0,
  searchQuery: '',
  sortBy: 'size',
  sortOrder: 'desc',
};

export const App: React.FC = () => {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('C:\\');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    currentFolder: '',
    scannedFiles: 0,
    scannedBytes: 0,
    percent: 0,
    isScanning: false,
  });

  const [activeTab, setActiveTab] = useState<AppTab>('explorer');
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [chunkInfo, setChunkInfo] = useState<ScanChunkInfo | null>(null);

  // Theme Management
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    return (localStorage.getItem('spaceclean_theme') as ThemePreset) || 'obsidian';
  });

  const handleSelectTheme = (newTheme: ThemePreset) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('spaceclean_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Junk & Duplicates
  const [junkItems, setJunkItems] = useState<JunkItem[]>([]);
  const [isJunkLoading, setIsJunkLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isDuplicatesScanning, setIsDuplicatesScanning] = useState(false);

  // Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Initialize Drives and Junk
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          const driveList = await window.electronAPI.getDrives();
          setDrives(driveList);
          if (driveList.length > 0) {
            const firstDrive = driveList[0].drive;
            const sep = firstDrive.includes(':') ? '\\' : '/';
            setSelectedPath(firstDrive.endsWith('/') || firstDrive.endsWith('\\') ? firstDrive : firstDrive + sep);
          }
        } catch (e) {
          console.error('Error fetching drives', e);
        }

        loadJunk();
      } else {
        setDrives([
          {
            drive: 'C:',
            label: 'Local Disk (C:)',
            totalBytes: 512 * 1024 * 1024 * 1024,
            freeBytes: 140 * 1024 * 1024 * 1024,
            usedBytes: 372 * 1024 * 1024 * 1024,
            usedPercentage: 72,
          }
        ]);
      }
    }
    init();
  }, []);

  // Listen to scan progress, streaming batches, and smart adaptive chunk pauses
  useEffect(() => {
    if (window.electronAPI) {
      const unsubProgress = window.electronAPI.onScanProgress(data => {
        setScanProgress(data);
      });

      const unsubBatch = window.electronAPI.onScanBatch(data => {
        if (data.files && data.files.length > 0) {
          setFiles(prev => {
            const map = new Map<string, FileInfo>();
            prev.forEach(f => map.set(f.path.toLowerCase(), f));
            data.files.forEach(f => map.set(f.path.toLowerCase(), f));
            return Array.from(map.values());
          });
        }
      });

      const unsubChunk = window.electronAPI.onScanChunkPaused(data => {
        setScanProgress(data);
        setChunkInfo(data.chunkInfo || null);
        setIsScanning(false);
      });

      return () => {
        unsubProgress();
        unsubBatch();
        unsubChunk();
      };
    }
  }, []);

  const loadJunk = async () => {
    if (window.electronAPI) {
      setIsJunkLoading(true);
      try {
        const items = await window.electronAPI.scanJunk();
        setJunkItems(items);
      } catch (e) {
        console.error('Error scanning junk', e);
      } finally {
        setIsJunkLoading(false);
      }
    }
  };

  // Browse Folder Picker
  const handleBrowseFolder = async () => {
    if (window.electronAPI) {
      const chosen = await window.electronAPI.selectFolder();
      if (chosen) {
        setSelectedPath(chosen);
        handleStartScan(chosen);
      }
    }
  };

  // Scan handler
  const handleStartScan = async (target = selectedPath) => {
    if (!window.electronAPI) return;
    setIsScanning(true);
    setChunkInfo(null);
    setFiles([]); // Clear previous files to stream fresh
    setFolders([]);
    setSelectedPaths(new Set());
    setPreviewFile(null);
    setScanProgress({ currentFolder: target, scannedFiles: 0, scannedBytes: 0, percent: 0, isScanning: true });

    // Find expected drive capacity for percentage estimation
    const matchedDrive = drives.find(d => target.toUpperCase().startsWith(d.drive.toUpperCase()));
    const totalExpectedBytes = matchedDrive ? matchedDrive.usedBytes : undefined;

    try {
      const scanRes: ScanResult = await window.electronAPI.startScan(target, totalExpectedBytes, true);
      const uniqueMap = new Map<string, FileInfo>();
      scanRes.files.forEach(f => uniqueMap.set(f.path.toLowerCase(), f));
      setFiles(Array.from(uniqueMap.values()));
      setFolders(scanRes.folders);
      if (scanRes.chunkInfo) {
        setChunkInfo(scanRes.chunkInfo);
      }
    } catch (e) {
      console.error('Scan failed', e);
    } finally {
      setIsScanning(false);
      setScanProgress(prev => ({ ...prev, isScanning: false }));
    }
  };

  // Resume scan for next part
  const handleResumeScan = async (unlimitedRemaining = false) => {
    if (!window.electronAPI) return;
    setIsScanning(true);
    setChunkInfo(null);
    setScanProgress(prev => ({ ...prev, isScanning: true, isChunkPaused: false }));

    try {
      const scanRes: ScanResult = await window.electronAPI.resumeScan(unlimitedRemaining);
      const uniqueMap = new Map<string, FileInfo>();
      scanRes.files.forEach(f => uniqueMap.set(f.path.toLowerCase(), f));
      setFiles(Array.from(uniqueMap.values()));
      setFolders(scanRes.folders);
      if (scanRes.chunkInfo) {
        setChunkInfo(scanRes.chunkInfo);
      }
    } catch (e) {
      console.error('Resume scan failed', e);
    } finally {
      setIsScanning(false);
      setScanProgress(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleCancelScan = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelScan();
      setIsScanning(false);
      setChunkInfo(null);
      setScanProgress(prev => ({ ...prev, isScanning: false }));
    }
  };

  // Folder navigation in FolderExplorer
  const handleNavigateToFolder = async (folderPath: string) => {
    setSelectedPath(folderPath);
    if (window.electronAPI) {
      try {
        const contents = await window.electronAPI.getFolderContents(folderPath);
        if (contents.folders.length > 0 || contents.files.length > 0) {
          setFolders(contents.folders);
        }
      } catch {}
    }
  };

  // Scan Duplicates manually
  const handleScanDuplicates = async () => {
    if (!window.electronAPI || files.length === 0) return;
    setIsDuplicatesScanning(true);
    try {
      const dups = await window.electronAPI.scanDuplicates(files);
      setDuplicates(dups);
    } catch (e) {
      console.error('Duplicate scan error', e);
    } finally {
      setIsDuplicatesScanning(false);
    }
  };

  // Selection handlers
  const handleToggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const handleSelectAll = () => {
    const next = new Set(selectedPaths);
    filteredFiles.filter(f => !f.isProtected).forEach(f => next.add(f.path));
    setSelectedPaths(next);
  };

  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleSelectOlderThanDays = (days: number) => {
    const cutoff = subDays(new Date(), days);
    const next = new Set(selectedPaths);
    filteredFiles.filter(f => !f.isProtected).forEach(f => {
      let ts = f.modifiedAt;
      if (filter.dateMode === 'created') ts = f.createdAt;
      else if (filter.dateMode === 'accessed') ts = f.accessedAt;
      if (isBefore(new Date(ts), cutoff)) {
        next.add(f.path);
      }
    });
    setSelectedPaths(next);
  };

  // Sort change handler
  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    if (filter.sortBy === sortBy) {
      setFilter({
        ...filter,
        sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setFilter({
        ...filter,
        sortBy,
        sortOrder: 'desc'
      });
    }
  };

  // Release Media Locks & Open Delete Modal
  const handleOpenDeleteModalForPaths = (paths: string[]) => {
    try {
      const mediaEls = document.querySelectorAll('video, audio');
      mediaEls.forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
          (el as HTMLMediaElement).removeAttribute('src');
          (el as HTMLMediaElement).load();
        } catch {}
      });
    } catch {}
    setPreviewFile(null);
    setSelectedPaths(new Set(paths));
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteModal = () => {
    try {
      const mediaEls = document.querySelectorAll('video, audio');
      mediaEls.forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
          (el as HTMLMediaElement).removeAttribute('src');
          (el as HTMLMediaElement).load();
        } catch {}
      });
    } catch {}
    setPreviewFile(null);
    setIsDeleteModalOpen(true);
  };

  // Clean Junk Items (including OS Recycle Bin)
  const handleCleanJunkItems = async (items: JunkItem[]) => {
    const hasRecycleBin = items.some(j => j.category === 'recycle_bin' || j.id === 'recycle_bin');
    if (hasRecycleBin && window.electronAPI?.emptyRecycleBin) {
      await window.electronAPI.emptyRecycleBin();
    }
    const folderPaths = items
      .filter(j => j.category !== 'recycle_bin' && j.id !== 'recycle_bin')
      .map(j => j.path);
    if (folderPaths.length > 0) {
      handleOpenDeleteModalForPaths(folderPaths);
    } else {
      loadJunk();
    }
  };

  // Auto-trigger duplicate scan when switching to duplicate tab
  useEffect(() => {
    if (activeTab === 'duplicates' && files.length > 0 && duplicates.length === 0 && !isDuplicatesScanning) {
      handleScanDuplicates();
    }
  }, [activeTab, files.length]);

  // Computed Filtered & Sorted Files
  const filteredFiles = useMemo(() => {
    const filtered = filterFiles(files, filter);
    return sortFiles(filtered, filter.sortBy, filter.sortOrder);
  }, [files, filter]);

  // Global Keyboard Controls (Arrows, Spacebar, Enter, Delete, Esc, Ctrl+A/D/F, 1-8 Tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Escape key: Priority closing of Modal -> Drawer -> Blur Input
      if (e.key === 'Escape') {
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
          e.preventDefault();
          return;
        }
        if (previewFile) {
          setPreviewFile(null);
          e.preventDefault();
          return;
        }
        if (isInputFocused) {
          target.blur();
          e.preventDefault();
          return;
        }
      }

      // If user is currently typing in a text field, avoid intercepting text keys
      if (isInputFocused) return;

      // Tab switcher shortcuts (Alt+1 to Alt+8)
      const tabMap: Record<string, AppTab> = {
        '1': 'explorer',
        '2': 'folders',
        '3': 'smart_clean',
        '4': 'duplicates',
        '5': 'large_files',
        '6': 'junk',
        '7': 'media',
        '8': 'uninstall'
      };

      if ((e.altKey || (!e.ctrlKey && !e.metaKey && !e.shiftKey)) && tabMap[e.key]) {
        if (e.altKey) {
          setActiveTab(tabMap[e.key]);
          e.preventDefault();
          return;
        }
      }

      // Ctrl+A / Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Ctrl+D / Cmd+D: Deselect all
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDeselectAll();
        return;
      }

      // Ctrl+F / Cmd+F or Slash: Focus search input
      if (((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) || e.key === '/') {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
          return;
        }
      }

      // Delete key: Trigger Delete confirmation if items selected
      if (e.key === 'Delete') {
        if (selectedPaths.size > 0 || previewFile) {
          e.preventDefault();
          if (selectedPaths.size === 0 && previewFile) {
            setSelectedPaths(new Set([previewFile.path]));
          }
          setIsDeleteModalOpen(true);
          return;
        }
      }

      // Arrow navigation across files for Explorer and Largest Files
      if (activeTab === 'explorer' || activeTab === 'large_files') {
        const activeList = activeTab === 'large_files'
          ? [...files].sort((a, b) => b.size - a.size).slice(0, 100)
          : filteredFiles;

        if (activeList.length > 0) {
          const currentIndex = previewFile ? activeList.findIndex(f => f.path === previewFile.path) : -1;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < activeList.length - 1 ? currentIndex + 1 : 0;
            setPreviewFile(activeList[nextIndex]);
            return;
          }

          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeList.length - 1;
            setPreviewFile(activeList[prevIndex]);
            return;
          }

          // Spacebar: Toggle selection of currently previewed/highlighted file
          if (e.key === ' ') {
            e.preventDefault();
            if (previewFile) {
              handleToggleSelect(previewFile.path);
            } else if (activeList.length > 0) {
              handleToggleSelect(activeList[0].path);
              setPreviewFile(activeList[0]);
            }
            return;
          }

          // Enter: Open file with default application (or inspect)
          if (e.key === 'Enter') {
            if (previewFile && window.electronAPI?.openFile) {
              e.preventDefault();
              window.electronAPI.openFile(previewFile.path);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteModalOpen, previewFile, selectedPaths, filteredFiles, files, activeTab]);

  // Delete Action confirmation
  const handleConfirmDelete = async (paths: string[], toRecycleBin: boolean): Promise<DeleteResult> => {
    if (window.electronAPI) {
      return await window.electronAPI.deleteItems(paths, toRecycleBin);
    }
    return {
      totalRequested: paths.length,
      successCount: paths.length,
      failedCount: 0,
      freedBytes: files.filter(f => paths.includes(f.path)).reduce((s, f) => s + f.size, 0),
      recycleBin: toRecycleBin,
      errors: []
    };
  };

  const handleDeleteFinished = (result: DeleteResult) => {
    if (result.successCount > 0) {
      const deletedPathsArray = (result.deletedPaths && result.deletedPaths.length > 0)
        ? result.deletedPaths
        : Array.from(selectedPaths);
      const deletedSet = new Set(deletedPathsArray.map(p => p.toLowerCase()));

      setFiles(prev => prev.filter(f => !deletedSet.has(f.path.toLowerCase())));
      setFolders(prev => prev.filter(f => !deletedSet.has(f.path.toLowerCase())));
      setDuplicates(prev =>
        prev
          .map(group => ({
            ...group,
            files: group.files.filter(f => !deletedSet.has(f.path.toLowerCase()))
          }))
          .filter(group => group.files.length > 1)
      );

      if (previewFile && deletedSet.has(previewFile.path.toLowerCase())) {
        setPreviewFile(null);
      }
      setSelectedPaths(new Set());
      loadJunk();
    }
  };

  return (
    <div className="app-container">
      {/* Title Bar with Frameless Windows Controls & Theme Selector */}
      <TitleBar
        currentPath={selectedPath}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Main Navbar */}
      <Navbar
        drives={drives}
        selectedPath={selectedPath}
        onSelectDrive={path => {
          setSelectedPath(path);
          handleStartScan(path);
        }}
        onBrowseFolder={handleBrowseFolder}
        onStartScan={() => handleStartScan(selectedPath)}
        onCancelScan={handleCancelScan}
        isScanning={isScanning}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        scannedFilesCount={files.length}
        junkCount={junkItems.filter(j => j.totalBytes > 0).length}
        duplicatesCount={duplicates.length}
      />

      {/* Main App Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="main-content" style={{ flex: 1, minWidth: 0 }}>
          {/* Metric Summary Cards (Hidden in Apps mode as apps are system-wide) */}
          {activeTab !== 'uninstall' && (
            <StatsOverview
              files={files}
              filteredFiles={filteredFiles}
              selectedFilePaths={selectedPaths}
              duplicates={duplicates}
              junkItems={junkItems}
              isScanning={isScanning}
              scanProgress={scanProgress}
            />
          )}

          {/* Live Scan Progress & Percentage Loading Bar */}
          {activeTab !== 'uninstall' && (
            <ScanProgressIndicator
              progress={scanProgress}
              isScanning={isScanning}
              onCancelScan={handleCancelScan}
            />
          )}

          {/* 🧠 Smart Adaptive Memory Guard & Chunk Milestone Banner */}
          {activeTab !== 'uninstall' && activeTab !== 'media' && activeTab !== 'junk' && chunkInfo && chunkInfo.isChunkPaused && (
            <div
              className="panel"
              style={{
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={18} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Part {chunkInfo.chunkNumber} Ready to Clean ({chunkInfo.formattedBytes} • {chunkInfo.scannedFiles.toLocaleString()} files)
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      Memory Guard Active • {chunkInfo.remainingQueueCount} subfolders queued
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Paused here so you can clean what was scanned first without lag. Clean now, or continue scanning.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeTab !== 'smart_clean' && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                    onClick={() => setActiveTab('smart_clean')}
                    title="Review and clean this scanned batch in Smart Optimizer"
                  >
                    <Layers size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Review in Smart Optimizer</span>
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 12px' }}
                  onClick={() => handleResumeScan(false)}
                  title="Resume and scan next chunk of directory"
                >
                  <Play size={12} />
                  <span>Scan Next Part</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px' }}
                  onClick={() => handleResumeScan(true)}
                  title="Scan all remaining subfolders without pausing"
                >
                  <Zap size={12} />
                  <span>Scan All Remaining</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 1: Storage Explorer & File Filter Table */}
          {activeTab === 'explorer' && (
            <>
              <FileFilterBar
                files={files}
                filter={filter}
                onFilterChange={setFilter}
                onResetFilter={() => setFilter(INITIAL_FILTER)}
              />

              <FileTable
                files={filteredFiles}
                selectedPaths={selectedPaths}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onSelectOlderThanDays={handleSelectOlderThanDays}
                onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
                filter={filter}
                onSortChange={handleSortChange}
                onPreviewFile={setPreviewFile}
                previewedFilePath={previewFile?.path}
              />
            </>
          )}

          {/* Tab 2: Folder Size Explorer & Tree Manager */}
          {activeTab === 'folders' && (
            <FolderExplorer
              currentRootPath={selectedPath}
              folders={folders}
              onNavigateToFolder={handleNavigateToFolder}
              onScanFolder={handleStartScan}
              onOpenDeleteModalForPaths={handleOpenDeleteModalForPaths}
            />
          )}

          {/* Tab 3: Media Gallery & Visual Photo/Video Manager */}
          {activeTab === 'media' && (
            <MediaGallery
              files={files}
              selectedPaths={selectedPaths}
              onToggleSelect={handleToggleSelect}
              onSetSelectedPaths={setSelectedPaths}
              onSelectPreview={setPreviewFile}
              onOpenDeleteModal={handleOpenDeleteModal}
            />
          )}

          {/* Tab 4: Smart Part-by-Part Folder Optimizer */}
          {activeTab === 'smart_clean' && (
            <SmartFolderCleanup
              files={files}
              folders={folders}
              duplicates={duplicates}
              currentPath={selectedPath}
              chunkInfo={chunkInfo}
              onResumeScan={handleResumeScan}
              onOpenDeleteModalForPaths={handleOpenDeleteModalForPaths}
              onNavigateToFolder={handleNavigateToFolder}
              onPreviewFile={setPreviewFile}
              previewedFilePath={previewFile?.path}
            />
          )}

          {/* Tab 5: Windows System Junk & Cache */}
          {activeTab === 'junk' && (
            <JunkCleaner
              junkItems={junkItems}
              isLoading={isJunkLoading}
              onRefresh={loadJunk}
              onCleanJunk={handleCleanJunkItems}
            />
          )}

          {/* Tab 6: Duplicate Finder */}
          {activeTab === 'duplicates' && (
            <DuplicateFinder
              duplicates={duplicates}
              isScanning={isDuplicatesScanning}
              onScanDuplicates={handleScanDuplicates}
              selectedPaths={selectedPaths}
              onToggleSelect={handleToggleSelect}
              onSetSelectedPaths={setSelectedPaths}
              onOpenDeleteModal={handleOpenDeleteModal}
            />
          )}

          {/* Tab 7: Top 100 Space Hogs */}
          {activeTab === 'large_files' && (
            <LargeFilesView
              files={files}
              selectedPaths={selectedPaths}
              onToggleSelect={handleToggleSelect}
              onOpenDeleteModal={handleOpenDeleteModal}
              onPreviewFile={setPreviewFile}
              previewedFilePath={previewFile?.path}
            />
          )}

          {/* Tab 8: Installed Applications & Software Uninstaller */}
          {activeTab === 'uninstall' && (
            <AppUninstaller />
          )}
        </div>

        {/* Right-Side File Preview & Inspector Drawer */}
        {previewFile && (
          <FilePreviewDrawer
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onDeleteFile={path => handleOpenDeleteModalForPaths([path])}
          />
        )}
      </div>

      {/* Safe Deletion Confirmation Modal */}
      <DeleteModal
        files={files}
        selectedPaths={selectedPaths}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDelete}
        onDeleteFinished={handleDeleteFinished}
      />
    </div>
  );
};
