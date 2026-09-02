import React from 'react';
import {
  Files,
  Copy,
  Trash2,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { FileInfo, FileCategory, JunkItem, DuplicateGroup } from '../types';
import { formatBytes } from '../utils/filterUtils';

interface StatsOverviewProps {
  files: FileInfo[];
  filteredFiles: FileInfo[];
  selectedFilePaths: Set<string>;
  duplicates: DuplicateGroup[];
  junkItems: JunkItem[];
  isScanning: boolean;
  scanProgress: { currentFolder: string; scannedFiles: number; scannedBytes: number };
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  files,
  filteredFiles,
  selectedFilePaths,
  duplicates,
  junkItems,
  isScanning,
  scanProgress,
}) => {
  const totalScannedBytes = files.reduce((acc, f) => acc + f.size, 0);

  const selectedBytes = files
    .filter(f => selectedFilePaths.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  const duplicateWastedBytes = duplicates.reduce((acc, d) => acc + d.wastedBytes, 0);
  const totalJunkBytes = junkItems.reduce((acc, j) => acc + j.totalBytes, 0);

  return (
    <div className="stats-grid">
      {/* Total Scanned Card */}
      <div className="stat-card">
        <div className="stat-card-title">Indexed Files</div>
        <div>
          <div className="stat-card-value">
            {formatBytes(isScanning ? scanProgress.scannedBytes : totalScannedBytes)}
          </div>
          <div className="stat-card-subtitle">
            {isScanning
              ? `Scanning ${scanProgress.scannedFiles.toLocaleString()} files...`
              : `${files.length.toLocaleString()} files found`}
          </div>
        </div>
      </div>

      {/* Selected Items Card */}
      <div className="stat-card">
        <div className="stat-card-title">Selected for Cleanup</div>
        <div>
          <div className="stat-card-value" style={{ color: selectedFilePaths.size > 0 ? 'var(--accent-danger)' : undefined }}>
            {formatBytes(selectedBytes)}
          </div>
          <div className="stat-card-subtitle">
            {selectedFilePaths.size > 0
              ? `${selectedFilePaths.size.toLocaleString()} files selected`
              : '0 files selected'}
          </div>
        </div>
      </div>

      {/* Duplicates Found */}
      <div className="stat-card">
        <div className="stat-card-title">Duplicate Redundancy</div>
        <div>
          <div className="stat-card-value">{formatBytes(duplicateWastedBytes)}</div>
          <div className="stat-card-subtitle">
            {duplicates.length} duplicate sets
          </div>
        </div>
      </div>

      {/* Junk Detected */}
      <div className="stat-card">
        <div className="stat-card-title">System Temp & Cache</div>
        <div>
          <div className="stat-card-value">{formatBytes(totalJunkBytes)}</div>
          <div className="stat-card-subtitle">
            {junkItems.length} cleanup targets
          </div>
        </div>
      </div>

      {/* Summary Filter Ratio */}
      <div className="stat-card">
        <div className="stat-card-title">Filter Match</div>
        <div>
          <div className="stat-card-value">
            {files.length > 0 ? Math.round((filteredFiles.length / files.length) * 100) : 0}%
          </div>
          <div className="stat-card-subtitle">
            {filteredFiles.length.toLocaleString()} of {files.length.toLocaleString()} files
          </div>
        </div>
      </div>
    </div>
  );
};
