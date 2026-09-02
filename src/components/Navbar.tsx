import React from 'react';
import {
  HardDrive,
  FolderOpen,
  Play,
  RotateCw,
  Square,
  Sparkles,
  Files,
  Trash2,
  Copy,
  BarChart3,
  FolderTree,
  Film,
  AppWindow
} from 'lucide-react';
import { DriveInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';

export type AppTab = 'explorer' | 'folders' | 'media' | 'smart_clean' | 'junk' | 'duplicates' | 'large_files' | 'uninstall';

interface NavbarProps {
  drives: DriveInfo[];
  selectedPath: string;
  onSelectDrive: (driveRoot: string) => void;
  onBrowseFolder: () => void;
  onStartScan: () => void;
  onCancelScan: () => void;
  isScanning: boolean;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  scannedFilesCount: number;
  junkCount: number;
  duplicatesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  drives,
  selectedPath,
  onSelectDrive,
  onBrowseFolder,
  onStartScan,
  onCancelScan,
  isScanning,
  activeTab,
  onTabChange,
  scannedFilesCount,
  junkCount,
  duplicatesCount,
}) => {
  return (
    <div className="header-bar">
      {/* Left side: Target Drive / Folder selection and Scan button */}
      <div className="drive-selector-group">
        <select
          className="drive-select"
          value={selectedPath}
          onChange={e => onSelectDrive(e.target.value)}
          disabled={isScanning}
        >
          {drives.map(d => (
            <option key={d.drive} value={d.drive + '\\'}>
              {d.label} ({d.drive}) - {d.usedPercentage}% Full ({formatBytes(d.freeBytes)} Free)
            </option>
          ))}
          {selectedPath && !drives.some(d => selectedPath.toUpperCase().startsWith(d.drive.toUpperCase())) && (
            <option value={selectedPath}>Custom: {selectedPath}</option>
          )}
        </select>

        <button
          className="btn btn-secondary"
          onClick={onBrowseFolder}
          disabled={isScanning}
          title="Choose a specific folder to scan"
        >
          <FolderOpen size={14} />
          <span>Browse Folder</span>
        </button>

        {isScanning ? (
          <button className="btn btn-danger" onClick={onCancelScan}>
            <Square size={13} fill="currentColor" />
            <span>Stop Scan</span>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onStartScan}>
            <Play size={13} fill="currentColor" />
            <span>{scannedFilesCount > 0 ? 'Rescan' : 'Start Scan'}</span>
          </button>
        )}
      </div>

      {/* Right side: Top Horizontal Segmented Mode Selector Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => onTabChange('explorer')}
        >
          <Files size={14} />
          <span>Files</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'folders' ? 'active' : ''}`}
          onClick={() => onTabChange('folders')}
        >
          <FolderTree size={14} />
          <span>Folders</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => onTabChange('media')}
          title="Photos & Videos visual management gallery with adjustable grid"
        >
          <Film size={14} />
          <span>Media</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'smart_clean' ? 'active' : ''}`}
          onClick={() => onTabChange('smart_clean')}
          title="Part-by-part chronological cleanup wizard for any size folder (GB / TB)"
        >
          <Sparkles size={14} style={{ color: activeTab === 'smart_clean' ? 'var(--accent-primary)' : undefined }} />
          <span>Smart Optimizer</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'junk' ? 'active' : ''}`}
          onClick={() => onTabChange('junk')}
        >
          <Trash2 size={14} />
          <span>Junk</span>
          {junkCount > 0 && (
            <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '1px 5px', borderRadius: '10px', fontWeight: 600 }}>
              {junkCount}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'duplicates' ? 'active' : ''}`}
          onClick={() => onTabChange('duplicates')}
        >
          <Copy size={14} />
          <span>Duplicates</span>
          {duplicatesCount > 0 && (
            <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '1px 5px', borderRadius: '10px', fontWeight: 600 }}>
              {duplicatesCount}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'large_files' ? 'active' : ''}`}
          onClick={() => onTabChange('large_files')}
        >
          <BarChart3 size={14} />
          <span>Largest Files</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'uninstall' ? 'active' : ''}`}
          onClick={() => onTabChange('uninstall')}
          title="View and uninstall installed software and applications"
        >
          <AppWindow size={14} />
          <span>Apps</span>
        </button>
      </div>
    </div>
  );
};

