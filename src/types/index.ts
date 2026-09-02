export type FileCategory =
  | 'video'
  | 'image'
  | 'audio'
  | 'document'
  | 'archive'
  | 'code'
  | 'system'
  | 'other';

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  formattedSize: string;
  createdAt: number; // timestamp ms
  modifiedAt: number;
  accessedAt: number;
  category: FileCategory;
  duplicateGroupId?: string;
  isDuplicate?: boolean;
  isProtected?: boolean; // Windows OS Protected file safeguard
  scanPart?: number; // RAM Optimizer Chunk/Wave Part Number (Part 1, Part 2, etc.)
}

export interface FolderInfo {
  path: string;
  name: string;
  size: number;
  formattedSize: string;
  fileCount: number;
  subfolderCount: number;
  modifiedAt: number;
  isProtected: boolean;
  percentageOfParent?: number;
}

export interface DriveInfo {
  drive: string; // e.g. "C:"
  label: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercentage: number;
}

export type DateMode = 'modified' | 'created' | 'accessed';
export type DatePreset =
  | 'all'
  | 'today'
  | '7days'
  | '30days'
  | '90days'
  | '6months'
  | '1year'
  | 'older_1year'
  | 'custom';

export interface FilterState {
  categories: FileCategory[];
  extensions: string[];
  dateMode: DateMode;
  datePreset: DatePreset;
  customStartDate?: string;
  customEndDate?: string;
  minSizeBytes: number;
  searchQuery: string;
  sortBy: 'size' | 'modifiedAt' | 'createdAt' | 'name' | 'extension';
  sortOrder: 'asc' | 'desc';
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  size: number;
  formattedSize: string;
  files: FileInfo[];
  wastedBytes: number; // (files.length - 1) * size
}

export interface JunkItem {
  id: string;
  name: string;
  description: string;
  path: string;
  totalBytes: number;
  formattedBytes: string;
  fileCount: number;
  isSafe: boolean;
  selected: boolean;
  category: 'system_temp' | 'user_temp' | 'prefetch' | 'crash_dumps' | 'cache' | 'logs' | 'recycle_bin';
}

export interface ScanChunkInfo {
  chunkNumber: number;
  scannedFiles: number;
  scannedBytes: number;
  formattedBytes: string;
  currentFolder: string;
  remainingQueueCount: number;
  isChunkPaused: boolean;
  canResume: boolean;
}

export interface ScanProgress {
  currentFolder: string;
  scannedFiles: number;
  scannedBytes: number;
  percent?: number;
  isScanning: boolean;
  isChunkPaused?: boolean;
  chunkInfo?: ScanChunkInfo | null;
}

export interface ScanResult {
  files: FileInfo[];
  folders: FolderInfo[];
  chunkInfo?: ScanChunkInfo | null;
}

export interface DeleteResult {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  freedBytes: number;
  recycleBin: boolean;
  deletedPaths?: string[];
  errors: { path: string; error: string }[];
}

// Custom Theme & Mode System
export type ThemeMode = 'dark' | 'light';

export type ThemePreset =
  | 'obsidian'   // Slate Minimal Dark
  | 'midnight'   // OLED Deep Black
  | 'nordic'     // Forest Green Dark
  | 'tokyo'      // Tokyo Night Warm Charcoal
  | 'ocean'      // Deep Nautical Navy
  | 'clean-white'// Minimalist Crisp Light
  | 'warm-sand'  // Soft Warm Paper Light
  | 'arctic'     // Cool Ice Slate Light
  | 'sage-light';// Botanical Sage Light

export interface ThemeDefinition {
  id: ThemePreset;
  name: string;
  mode: ThemeMode;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
}

export interface InstalledApp {
  id: string;
  name: string;
  publisher?: string;
  version?: string;
  installDate?: string;
  sizeBytes?: number;
  formattedSize?: string;
  installLocation?: string;
  uninstallString?: string;
  quietUninstallString?: string;
  icon?: string;
  isSystemProtected?: boolean;
}

export type ThreatRiskLevel = 'high' | 'suspicious' | 'warning';

export interface ThreatItem {
  id: string;
  file: FileInfo;
  riskLevel: ThreatRiskLevel;
  ruleName: string;
  category: string;
  description: string;
  recommendation: string;
  isIgnored?: boolean;
}

