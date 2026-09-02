import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { FileCategory, FileInfo, FolderInfo, DriveInfo, JunkItem, DuplicateGroup, ScanResult, ScanChunkInfo, InstalledApp } from '../src/types';

const execAsync = promisify(exec);

export const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
  // Videos
  mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', wmv: 'video',
  flv: 'video', webm: 'video', m4v: 'video', mpg: 'video', mpeg: 'video',
  '3gp': 'video', ts: 'video', vob: 'video',

  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  bmp: 'image', svg: 'image', tiff: 'image', tif: 'image', ico: 'image',
  raw: 'image', cr2: 'image', nef: 'image', psd: 'image', heic: 'image',

  // Audio
  mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio',
  m4a: 'audio', wma: 'audio', opus: 'audio', aiff: 'audio', mid: 'audio',

  // Documents
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document',
  xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
  csv: 'document', rtf: 'document', odt: 'document', ods: 'document',
  odp: 'document', epub: 'document', md: 'document',

  // Archives & Installers
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive', iso: 'archive',
  exe: 'archive', msi: 'archive', dmg: 'archive', apk: 'archive',
  pkg: 'archive', deb: 'archive',

  // Code & Dev
  js: 'code', jsx: 'code', tsx: 'code', py: 'code', java: 'code',
  c: 'code', cpp: 'code', h: 'code', hpp: 'code', cs: 'code',
  go: 'code', rs: 'code', php: 'code', html: 'code', css: 'code',
  scss: 'code', json: 'code', xml: 'code', yaml: 'code', yml: 'code',
  sql: 'code', sh: 'code', ps1: 'code',

  // System & Temp
  tmp: 'system', temp: 'system', log: 'system', bak: 'system',
  old: 'system', dmp: 'system', chk: 'system', swp: 'system',
  cache: 'system', crdownload: 'system', part: 'system'
};

export function getFileCategory(ext: string): FileCategory {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  return EXTENSION_CATEGORIES[cleanExt] || 'other';
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Cross-Platform OS System File Protection Rule Engine (Windows, macOS, Linux)
export function isSystemProtectedPath(targetPath: string): boolean {
  const norm = path.normalize(targetPath);
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  // --- 1. WINDOWS OS PROTECTION ---
  if (isWindows) {
    const normLower = norm.toLowerCase();
    const winDir = (process.env.WINDIR || 'c:\\windows').toLowerCase();
    const sysDrive = (process.env.SystemDrive || 'c:').toLowerCase();

    const safeTempPaths = [
      path.join(winDir, 'temp').toLowerCase(),
      path.join(winDir, 'logs').toLowerCase(),
      path.join(winDir, 'softwaredistribution', 'download').toLowerCase(),
      path.join(winDir, 'prefetch').toLowerCase()
    ];

    for (const safeP of safeTempPaths) {
      if (normLower.startsWith(safeP) && normLower !== safeP) {
        return false;
      }
    }

    const protectedRoots = [
      path.join(winDir, 'system32').toLowerCase(),
      path.join(winDir, 'syswow64').toLowerCase(),
      path.join(winDir, 'winsxs').toLowerCase(),
      path.join(winDir, 'boot').toLowerCase(),
      path.join(winDir, 'diagnostics').toLowerCase(),
      path.join(winDir, 'servicing').toLowerCase(),
      path.join(sysDrive, 'recovery').toLowerCase(),
      path.join(sysDrive, 'system volume information').toLowerCase(),
      path.join(sysDrive, 'boot').toLowerCase(),
      path.join(sysDrive, '$recycle.bin').toLowerCase(),
      winDir
    ];

    for (const p of protectedRoots) {
      if (normLower === p || normLower.startsWith(p + path.sep)) {
        return true;
      }
    }

    const criticalFiles = [
      'bootmgr',
      'bootnxt',
      'hiberfil.sys',
      'pagefile.sys',
      'swapfile.sys',
      'ntldr',
      'ntdetect.com'
    ];

    const fileName = path.basename(normLower);
    if (criticalFiles.includes(fileName)) {
      return true;
    }

    if (normLower.endsWith('.sys') || normLower.endsWith('.dll') || normLower.endsWith('.drv') || normLower.endsWith('.efi')) {
      if (normLower.includes('\\windows\\') || normLower.includes('\\system32\\')) {
        return true;
      }
    }

    return false;
  }

  // --- 2. macOS (Darwin) PROTECTION ---
  if (isMac) {
    const macProtectedRoots = [
      '/System',
      '/usr',
      '/bin',
      '/sbin',
      '/etc',
      '/var',
      '/private/etc',
      '/private/var/db',
      '/private/var/root',
      '/Library/Apple',
      '/Library/CoreAnalytics',
      '/Library/Security',
      '/Applications/Safari.app',
      '/Applications/Finder.app',
      '/Applications/System Settings.app'
    ];

    for (const p of macProtectedRoots) {
      if (norm === p || norm.startsWith(p + '/')) {
        return true;
      }
    }
    return false;
  }

  // --- 3. LINUX OS PROTECTION ---
  if (isLinux) {
    const linuxProtectedRoots = [
      '/bin',
      '/sbin',
      '/usr/bin',
      '/usr/sbin',
      '/usr/lib',
      '/etc',
      '/boot',
      '/sys',
      '/proc',
      '/dev',
      '/lib',
      '/lib64'
    ];

    for (const p of linuxProtectedRoots) {
      if (norm === p || norm.startsWith(p + '/')) {
        return true;
      }
    }
    return false;
  }

  return false;
}

// Cross-Platform Drive & Storage Volume Detection
export async function getWindowsDrives(): Promise<DriveInfo[]> {
  return await getSystemDrives();
}

export async function getSystemDrives(): Promise<DriveInfo[]> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWindows) {
    const drives: DriveInfo[] = [];
    try {
      const psCmd = `Get-PSDrive -PSProvider FileSystem | Select-Object Root, Name, Description, Used, Free | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`);
      if (!stdout.trim()) return fallbackDrives();

      const data = JSON.parse(stdout);
      const list = Array.isArray(data) ? data : [data];

      for (const d of list) {
        if (d.Root || d.Name) {
          const driveLetter = (d.Root || (d.Name + ':\\')).toUpperCase();
          const free = d.Free || 0;
          const used = d.Used || 0;
          const total = free + used;
          if (total > 0) {
            drives.push({
              drive: driveLetter.replace(/\\$/, ''),
              label: d.Description || `Local Disk (${driveLetter})`,
              totalBytes: total,
              freeBytes: free,
              usedBytes: used,
              usedPercentage: Math.round((used / total) * 100)
            });
          }
        }
      }
    } catch (err) {
      return fallbackDrives();
    }

    return drives.length > 0 ? drives : fallbackDrives();
  }

  // macOS & Linux Unix Mount Detection via df
  const unixDrives: DriveInfo[] = [];
  try {
    const { stdout } = await execAsync('df -k -P');
    const lines = stdout.trim().split('\n').slice(1);

    for (const line of lines) {
      const parts = line.replace(/\s+/g, ' ').split(' ');
      if (parts.length >= 6) {
        const totalKb = parseInt(parts[1], 10);
        const usedKb = parseInt(parts[2], 10);
        const freeKb = parseInt(parts[3], 10);
        const mountPoint = parts.slice(5).join(' ');

        const isRoot = mountPoint === '/';
        const isMacVolume = isMac && mountPoint.startsWith('/Volumes/') && !mountPoint.includes('/Volumes/Recovery');
        const isLinuxMedia = !isMac && (mountPoint.startsWith('/media/') || mountPoint.startsWith('/mnt/'));

        if (isRoot || isMacVolume || isLinuxMedia) {
          const totalBytes = totalKb * 1024;
          const usedBytes = usedKb * 1024;
          const freeBytes = freeKb * 1024;

          if (totalBytes > 0) {
            let label = mountPoint;
            if (isRoot) label = isMac ? 'Macintosh HD (/)' : 'Root Drive (/)';
            else if (isMacVolume) label = path.basename(mountPoint);

            unixDrives.push({
              drive: mountPoint,
              label,
              totalBytes,
              freeBytes,
              usedBytes,
              usedPercentage: Math.min(100, Math.round((usedBytes / totalBytes) * 100))
            });
          }
        }
      }
    }
  } catch (err) {
    const homeDir = os.homedir();
    return [
      {
        drive: isMac ? '/' : homeDir,
        label: isMac ? 'Macintosh HD (/)' : 'Home Drive',
        totalBytes: 512 * 1024 * 1024 * 1024,
        freeBytes: 150 * 1024 * 1024 * 1024,
        usedBytes: 362 * 1024 * 1024 * 1024,
        usedPercentage: 70
      }
    ];
  }

  return unixDrives.length > 0 ? unixDrives : [
    {
      drive: isMac ? '/' : os.homedir(),
      label: isMac ? 'Macintosh HD (/)' : 'System Disk',
      totalBytes: 512 * 1024 * 1024 * 1024,
      freeBytes: 150 * 1024 * 1024 * 1024,
      usedBytes: 362 * 1024 * 1024 * 1024,
      usedPercentage: 70
    }
  ];
}

function fallbackDrives(): DriveInfo[] {
  return [
    {
      drive: process.platform === 'win32' ? 'C:' : '/',
      label: process.platform === 'win32' ? 'Local Disk (C:)' : process.platform === 'darwin' ? 'Macintosh HD (/)' : 'System Drive (/)',
      totalBytes: 512 * 1024 * 1024 * 1024,
      freeBytes: 120 * 1024 * 1024 * 1024,
      usedBytes: 392 * 1024 * 1024 * 1024,
      usedPercentage: 77
    }
  ];
}

const SKIP_FOLDERS = new Set([
  '$recycle.bin',
  'system volume information',
  'msocache',
  'recovery',
  '$windows.~bt',
  '$windows.~ws',
  'hiberfil.sys',
  'pagefile.sys',
  'swapfile.sys'
]);

export interface ScanOptions {
  totalTargetBytes?: number;
  autoChunk?: boolean;
  unlimitedRemaining?: boolean;
  onProgress?: (scannedFiles: number, scannedBytes: number, currentPath: string, percent: number) => void;
  onBatch?: (filesBatch: FileInfo[], foldersBatch: FolderInfo[]) => void;
  onChunkPaused?: (chunkInfo: ScanChunkInfo) => void;
  shouldCancel?: () => boolean;
}

// Global active scan session for seamless resuming
interface ScannerSession {
  rootDir: string;
  totalTargetBytes: number;
  dirQueue: string[];
  seenFiles: Set<string>;
  folderMap: Map<string, { size: number; fileCount: number; subfolderCount: number; modifiedAt: number }>;
  allFiles: FileInfo[];
  chunkNumber: number;
  totalScannedFiles: number;
  totalScannedBytes: number;
  isPaused: boolean;
}

let activeScannerSession: ScannerSession | null = null;

export function getActiveScannerSession(): ScannerSession | null {
  return activeScannerSession;
}

export function clearActiveScannerSession(): void {
  activeScannerSession = null;
}

// 🧠 Smart Adaptive Chunk Limits (Prevents RAM spikes on 50GB-500GB+ folders)
const CHUNK_MAX_FILES = 20000; // 20k files per wave
const CHUNK_MAX_BYTES = 25 * 1024 * 1024 * 1024; // 25 GB per wave

export async function scanDirectoryWithFolders(
  rootDir: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  // Initialize fresh scanner session
  activeScannerSession = {
    rootDir,
    totalTargetBytes: options.totalTargetBytes || 0,
    dirQueue: [rootDir],
    seenFiles: new Set<string>(),
    folderMap: new Map(),
    allFiles: [],
    chunkNumber: 1,
    totalScannedFiles: 0,
    totalScannedBytes: 0,
    isPaused: false
  };

  return await executeScanSession(activeScannerSession, options);
}

export async function resumeScanSession(
  options: ScanOptions = {}
): Promise<ScanResult> {
  if (!activeScannerSession || activeScannerSession.dirQueue.length === 0) {
    return {
      files: activeScannerSession ? activeScannerSession.allFiles : [],
      folders: [],
      chunkInfo: null
    };
  }

  activeScannerSession.chunkNumber++;
  activeScannerSession.isPaused = false;
  return await executeScanSession(activeScannerSession, options);
}

async function executeScanSession(
  session: ScannerSession,
  options: ScanOptions
): Promise<ScanResult> {
  let chunkFiles = 0;
  let chunkBytes = 0;
  let lastProgressReport = Date.now();
  let lastBatchFlush = Date.now();
  let pendingFileBatch: FileInfo[] = [];

  const autoChunk = options.autoChunk !== false && !options.unlimitedRemaining;

  while (session.dirQueue.length > 0) {
    if (options.shouldCancel && options.shouldCancel()) {
      session.isPaused = false;
      break;
    }

    // 🧠 Smart Adaptive Chunk Halt Check:
    // If we've indexed a massive chunk and there are remaining directories in the queue, pause here!
    if (autoChunk && (chunkFiles >= CHUNK_MAX_FILES || chunkBytes >= CHUNK_MAX_BYTES)) {
      session.isPaused = true;
      break;
    }

    const currentDir = session.dirQueue.shift()!;
    let currentDirSize = 0;
    let currentDirFileCount = 0;
    let currentDirSubfolders = 0;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (options.shouldCancel && options.shouldCancel()) break;

      // 🛡️ Skip Windows NTFS Junctions / Symlinks to prevent duplicate file scans
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(currentDir, entry.name);
      const lowerName = entry.name.toLowerCase();
      const normKey = fullPath.toLowerCase();

      if (entry.isDirectory()) {
        if (SKIP_FOLDERS.has(lowerName) || lowerName.startsWith('$')) continue;
        currentDirSubfolders++;
        session.dirQueue.push(fullPath);
      } else if (entry.isFile()) {
        if (session.seenFiles.has(normKey)) continue;
        session.seenFiles.add(normKey);

        try {
          const stats = await fs.promises.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          const isProtected = isSystemProtectedPath(fullPath);

          const fileInfo: FileInfo = {
            path: fullPath,
            name: entry.name,
            extension: ext || 'none',
            size: stats.size,
            formattedSize: formatBytes(stats.size),
            createdAt: stats.birthtimeMs || stats.ctimeMs,
            modifiedAt: stats.mtimeMs,
            accessedAt: stats.atimeMs,
            category: getFileCategory(ext),
            isProtected
          };

          session.allFiles.push(fileInfo);
          pendingFileBatch.push(fileInfo);

          currentDirSize += stats.size;
          currentDirFileCount++;
          session.totalScannedFiles++;
          session.totalScannedBytes += stats.size;
          chunkFiles++;
          chunkBytes += stats.size;

          const now = Date.now();
          if (now - lastProgressReport > 100) {
            lastProgressReport = now;
            let percent = 0;
            if (session.totalTargetBytes > 0) {
              percent = Math.min(99, Math.round((session.totalScannedBytes / session.totalTargetBytes) * 100));
            }
            options.onProgress?.(session.totalScannedFiles, session.totalScannedBytes, currentDir, percent);
          }

          if (pendingFileBatch.length >= 2000 || (now - lastBatchFlush > 800 && pendingFileBatch.length > 0)) {
            lastBatchFlush = now;
            options.onBatch?.(pendingFileBatch, []);
            pendingFileBatch = [];
          }
        } catch {
          // File lock or access error
        }
      }
    }

    let dirMod = Date.now();
    try {
      const dStat = await fs.promises.stat(currentDir);
      dirMod = dStat.mtimeMs;
    } catch {}

    session.folderMap.set(currentDir, {
      size: currentDirSize,
      fileCount: currentDirFileCount,
      subfolderCount: currentDirSubfolders,
      modifiedAt: dirMod
    });
  }

  // Flush remaining batch
  if (pendingFileBatch.length > 0) {
    options.onBatch?.(pendingFileBatch, []);
  }

  // Build folder hierarchy list
  const folders: FolderInfo[] = [];
  const rootStat = session.folderMap.get(session.rootDir);
  const rootTotalSize = rootStat ? rootStat.size : session.totalScannedBytes;

  for (const [folderPath, meta] of session.folderMap.entries()) {
    const isProtected = isSystemProtectedPath(folderPath);
    const percentage = rootTotalSize > 0 ? (meta.size / rootTotalSize) * 100 : 0;

    folders.push({
      path: folderPath,
      name: path.basename(folderPath) || folderPath,
      size: meta.size,
      formattedSize: formatBytes(meta.size),
      fileCount: meta.fileCount,
      subfolderCount: meta.subfolderCount,
      modifiedAt: meta.modifiedAt,
      isProtected,
      percentageOfParent: Math.min(100, Math.round(percentage * 10) / 10)
    });
  }

  // Sort folders largest first
  folders.sort((a, b) => b.size - a.size);

  let chunkInfo: ScanChunkInfo | null = null;
  if (session.isPaused && session.dirQueue.length > 0) {
    chunkInfo = {
      chunkNumber: session.chunkNumber,
      scannedFiles: session.totalScannedFiles,
      scannedBytes: session.totalScannedBytes,
      formattedBytes: formatBytes(session.totalScannedBytes),
      currentFolder: session.rootDir,
      remainingQueueCount: session.dirQueue.length,
      isChunkPaused: true,
      canResume: true
    };
    options.onChunkPaused?.(chunkInfo);
  } else {
    options.onProgress?.(session.totalScannedFiles, session.totalScannedBytes, session.rootDir, 100);
  }

  // Ensure allFiles only contains files that actually exist on disk (removes any previously cleaned files)
  session.allFiles = session.allFiles.filter(f => {
    try {
      return fs.existsSync(f.path);
    } catch {
      return false;
    }
  });

  return {
    files: session.allFiles,
    folders,
    chunkInfo
  };
}

// Purge deleted files from active scanner session memory
export function purgeDeletedFromScanSession(deletedPaths: string[]) {
  if (!activeScannerSession) return;
  const deletedSet = new Set(deletedPaths.map(p => p.toLowerCase()));

  activeScannerSession.allFiles = activeScannerSession.allFiles.filter(
    f => !deletedSet.has(f.path.toLowerCase())
  );

  for (const p of deletedPaths) {
    activeScannerSession.seenFiles.delete(p.toLowerCase());
  }

  // Recalculate scanned files and bytes for the active session
  activeScannerSession.totalScannedFiles = activeScannerSession.allFiles.length;
  activeScannerSession.totalScannedBytes = activeScannerSession.allFiles.reduce((acc, f) => acc + f.size, 0);
}

// Instant folder inspector
export async function getImmediateFolderContents(dirPath: string): Promise<{ folders: FolderInfo[]; files: FileInfo[] }> {
  const folders: FolderInfo[] = [];
  const files: FileInfo[] = [];

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = await fs.promises.stat(fullPath);
        const isProtected = isSystemProtectedPath(fullPath);

        if (entry.isDirectory()) {
          folders.push({
            path: fullPath,
            name: entry.name,
            size: 0,
            formattedSize: 'Calculating...',
            fileCount: 0,
            subfolderCount: 0,
            modifiedAt: stats.mtimeMs,
            isProtected
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          files.push({
            path: fullPath,
            name: entry.name,
            extension: ext || 'none',
            size: stats.size,
            formattedSize: formatBytes(stats.size),
            createdAt: stats.birthtimeMs || stats.ctimeMs,
            modifiedAt: stats.mtimeMs,
            accessedAt: stats.atimeMs,
            category: getFileCategory(ext),
            isProtected
          });
        }
      } catch {}
    }
  } catch {}

  return { folders, files };
}

// Fast, memory-safe duplicate detector using 2-tier sample hashing
export async function findDuplicateFiles(
  files: FileInfo[],
  options: ScanOptions = {}
): Promise<DuplicateGroup[]> {
  const sizeBuckets = new Map<number, FileInfo[]>();
  for (const f of files) {
    if (f.size > 0 && !f.isProtected) {
      const list = sizeBuckets.get(f.size) || [];
      list.push(f);
      sizeBuckets.set(f.size, list);
    }
  }

  const candidateBuckets = Array.from(sizeBuckets.entries())
    .filter(([_, list]) => list.length > 1)
    .sort((a, b) => (b[0] * b[1].length) - (a[0] * a[1].length));

  const hashBuckets = new Map<string, FileInfo[]>();
  let processed = 0;

  for (const [_, group] of candidateBuckets) {
    if (options.shouldCancel && options.shouldCancel()) break;

    const sampleBuckets = new Map<string, FileInfo[]>();
    for (const file of group) {
      try {
        const sampleHash = await calculateSampleHash(file.path);
        const list = sampleBuckets.get(sampleHash) || [];
        list.push(file);
        sampleBuckets.set(sampleHash, list);
      } catch {}
    }

    for (const [_, sampleMatches] of sampleBuckets.entries()) {
      if (sampleMatches.length > 1) {
        for (const file of sampleMatches) {
          try {
            const fullHash = await calculateFileHash(file.path);
            const list = hashBuckets.get(fullHash) || [];
            list.push({ ...file, isDuplicate: true });
            hashBuckets.set(fullHash, list);
          } catch {}
        }
      }
    }

    processed += group.length;
    if (processed % 10 === 0) {
      options.onProgress?.(processed, 0, group[0].path, 0);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  let groupId = 1;

  for (const [hash, group] of hashBuckets.entries()) {
    if (group.length > 1) {
      const size = group[0].size;
      const gId = `dup_${groupId++}`;
      group.forEach(f => {
        f.duplicateGroupId = gId;
      });

      duplicates.push({
        id: gId,
        hash,
        size,
        formattedSize: formatBytes(size),
        files: group,
        wastedBytes: (group.length - 1) * size
      });
    }
  }

  duplicates.sort((a, b) => b.wastedBytes - a.wastedBytes);
  return duplicates;
}

// 4KB quick sample hash
async function calculateSampleHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath, { start: 0, end: 4096 });
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath, { start: 0, end: 1024 * 1024 * 20 });
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

// 📦 Cross-Platform Installed Application Scanner (Windows Registry, macOS /Applications, Linux .desktop)
export async function getInstalledApplications(): Promise<InstalledApp[]> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const apps: InstalledApp[] = [];

  if (isWindows) {
    try {
      const psCommand = `
        $paths = @(
          'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
          'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
          'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
        )
        Get-ItemProperty $paths -ErrorAction SilentlyContinue |
          Where-Object { $_.DisplayName -and !$_.SystemComponent -and !$_.ParentKeyName } |
          Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, EstimatedSize, InstallLocation, UninstallString, QuietUninstallString, DisplayIcon |
          ConvertTo-Json -Compress
      `;

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCommand.replace(/\r?\n/g, ' ')}"`, { maxBuffer: 1024 * 1024 * 15 });
      if (stdout.trim()) {
        const raw = JSON.parse(stdout);
        const list = Array.isArray(raw) ? raw : [raw];
        const seenNames = new Set<string>();

        let idx = 1;
        for (const item of list) {
          const name = (item.DisplayName || '').trim();
          if (!name || seenNames.has(name.toLowerCase())) continue;
          seenNames.add(name.toLowerCase());

          const sizeKb = typeof item.EstimatedSize === 'number' ? item.EstimatedSize : parseInt(item.EstimatedSize, 10) || 0;
          const sizeBytes = sizeKb > 0 ? sizeKb * 1024 : 0;

          apps.push({
            id: `app_${idx++}`,
            name,
            publisher: (item.Publisher || '').trim() || undefined,
            version: (item.DisplayVersion || '').trim() || undefined,
            installDate: (item.InstallDate || '').trim() || undefined,
            sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
            formattedSize: sizeBytes > 0 ? formatBytes(sizeBytes) : undefined,
            installLocation: (item.InstallLocation || '').trim() || undefined,
            uninstallString: (item.QuietUninstallString || item.UninstallString || '').trim() || undefined,
            quietUninstallString: (item.QuietUninstallString || '').trim() || undefined,
            icon: (item.DisplayIcon || '').trim() || undefined
          });
        }
      }
    } catch (e) {
      console.error('Error fetching Windows apps:', e);
    }
  } else if (isMac) {
    const appDirs = ['/Applications', path.join(os.homedir(), 'Applications')];
    let idx = 1;
    for (const dir of appDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.endsWith('.app')) {
            const appPath = path.join(dir, entry.name);
            const appName = entry.name.replace(/\.app$/, '');
            let version = undefined;
            let publisher = undefined;

            try {
              const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
              if (fs.existsSync(infoPlistPath)) {
                const plistContent = await fs.promises.readFile(infoPlistPath, 'utf-8');
                const vMatch = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/i);
                if (vMatch) version = vMatch[1];
                const pMatch = plistContent.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/i);
                if (pMatch) publisher = pMatch[1];
              }
            } catch {}

            apps.push({
              id: `mac_app_${idx++}`,
              name: appName,
              publisher,
              version,
              installLocation: appPath,
              uninstallString: appPath,
              isSystemProtected: appPath.startsWith('/System') || appName === 'Safari' || appName === 'Finder'
            });
          }
        }
      } catch {}
    }
  } else if (isLinux) {
    const desktopDirs = ['/usr/share/applications', path.join(os.homedir(), '.local/share/applications')];
    let idx = 1;
    for (const dir of desktopDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = await fs.promises.readdir(dir);
        for (const f of files) {
          if (f.endsWith('.desktop')) {
            const fullPath = path.join(dir, f);
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              const nameMatch = content.match(/^Name=(.+)$/m);
              const execMatch = content.match(/^Exec=(.+)$/m);
              const iconMatch = content.match(/^Icon=(.+)$/m);
              if (nameMatch) {
                apps.push({
                  id: `linux_app_${idx++}`,
                  name: nameMatch[1].trim(),
                  installLocation: fullPath,
                  uninstallString: execMatch ? execMatch[1].trim() : undefined,
                  icon: iconMatch ? iconMatch[1].trim() : undefined
                });
              }
            } catch {}
          }
        }
      } catch {}
    }
  }

  return apps.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0) || a.name.localeCompare(b.name));
}

export async function executeAppUninstall(
  uninstallString: string,
  installLocation?: string
): Promise<{ success: boolean; error?: string }> {
  if (!uninstallString && !installLocation) {
    return { success: false, error: 'No uninstall target specified.' };
  }

  const isMac = process.platform === 'darwin';

  if (isMac && installLocation && installLocation.endsWith('.app')) {
    try {
      const { shell } = await import('electron');
      await shell.trashItem(installLocation);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  return new Promise((resolve) => {
    try {
      const cmd = uninstallString.trim();
      spawn(cmd, { shell: true, detached: true, stdio: 'ignore' }).unref();
      resolve({ success: true });
    } catch (err: any) {
      resolve({ success: false, error: err?.message || 'Failed to trigger uninstaller' });
    }
  });
}

// Cross-Platform System Junk & Cache Scanner (Windows, macOS, Linux)
export async function scanSystemJunk(): Promise<JunkItem[]> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';
  const homeDir = os.homedir();

  const targets: Array<{
    id: string;
    name: string;
    description: string;
    path: string;
    category: JunkItem['category'];
    isSafe: boolean;
  }> = [];

  // 1. WINDOWS JUNK TARGETS
  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    const tempDir = os.tmpdir();
    const winDir = process.env.WINDIR || 'C:\\Windows';

    targets.push(
      {
        id: 'user_temp',
        name: 'User Temp Files (%TEMP%)',
        description: 'Temporary files created by applications and current user sessions',
        path: tempDir,
        category: 'user_temp',
        isSafe: true
      },
      {
        id: 'windows_temp',
        name: 'Windows Temp (C:\\Windows\\Temp)',
        description: 'Safe temporary logs and installer cache generated by OS background tasks',
        path: path.join(winDir, 'Temp'),
        category: 'system_temp',
        isSafe: true
      },
      {
        id: 'crash_dumps',
        name: 'Application Crash Dumps',
        description: 'Memory dumps created when desktop apps crash (%LOCALAPPDATA%\\CrashDumps)',
        path: path.join(localAppData, 'CrashDumps'),
        category: 'crash_dumps',
        isSafe: true
      },
      {
        id: 'thumbnail_cache',
        name: 'Windows Thumbnail Cache',
        description: 'Cached image/video thumbnails (Windows safely regenerates on demand)',
        path: path.join(localAppData, 'Microsoft', 'Windows', 'Explorer'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'discord_cache',
        name: 'Discord App Cache',
        description: 'Cached images and audio clips from Discord desktop app',
        path: path.join(process.env.APPDATA || '', 'discord', 'Cache', 'Cache_Data'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'chrome_cache',
        name: 'Google Chrome Web Cache',
        description: 'Web page offline caches and script assets stored by Google Chrome',
        path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'edge_cache',
        name: 'Microsoft Edge Web Cache',
        description: 'Web assets and offline site caches from Microsoft Edge browser',
        path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'windows_logs',
        name: 'Windows Setup Logs',
        description: 'Old maintenance and software setup logs',
        path: path.join(winDir, 'Logs'),
        category: 'logs',
        isSafe: true
      }
    );
  }

  // 2. macOS JUNK TARGETS
  if (isMac) {
    targets.push(
      {
        id: 'mac_user_cache',
        name: 'User Application Caches (~/Library/Caches)',
        description: 'App caches, browser offline assets, and temporary framework storage',
        path: path.join(homeDir, 'Library', 'Caches'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'mac_user_logs',
        name: 'App Error & Diagnostic Logs (~/Library/Logs)',
        description: 'Application error logs and diagnostic reports',
        path: path.join(homeDir, 'Library', 'Logs'),
        category: 'logs',
        isSafe: true
      },
      {
        id: 'mac_system_temp',
        name: 'macOS Temporary Items (/tmp)',
        description: 'Temporary files left behind by running apps and system processes',
        path: '/tmp',
        category: 'system_temp',
        isSafe: true
      },
      {
        id: 'mac_xcode_data',
        name: 'Xcode DerivedData & Simulator Cache',
        description: 'Old build files and developer cache from Apple Developer tools',
        path: path.join(homeDir, 'Library', 'Developer', 'Xcode', 'DerivedData'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'mac_chrome_cache',
        name: 'Google Chrome Cache (macOS)',
        description: 'Web assets and offline page files stored by Google Chrome',
        path: path.join(homeDir, 'Library', 'Caches', 'Google', 'Chrome'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'mac_discord_cache',
        name: 'Discord Cache (macOS)',
        description: 'Audio, avatars, and media files cached by Discord',
        path: path.join(homeDir, 'Library', 'Caches', 'com.hnc.Discord'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'mac_homebrew_cache',
        name: 'Homebrew Package Cache',
        description: 'Downloaded tarballs and bottles from Homebrew package manager',
        path: path.join(homeDir, 'Library', 'Caches', 'Homebrew'),
        category: 'cache',
        isSafe: true
      }
    );
  }

  // 3. LINUX JUNK TARGETS
  if (isLinux) {
    targets.push(
      {
        id: 'linux_user_cache',
        name: 'User Cache Directory (~/.cache)',
        description: 'Application caches, thumbnails, and temporary user data',
        path: path.join(homeDir, '.cache'),
        category: 'cache',
        isSafe: true
      },
      {
        id: 'linux_temp',
        name: 'System Temp Directory (/tmp)',
        description: 'Temporary files created by system services and running processes',
        path: '/tmp',
        category: 'system_temp',
        isSafe: true
      },
      {
        id: 'linux_var_tmp',
        name: 'Preserved Temporary Files (/var/tmp)',
        description: 'Temporary files meant to survive reboots',
        path: '/var/tmp',
        category: 'system_temp',
        isSafe: true
      },
      {
        id: 'linux_thumbnails',
        name: 'Freedesktop Thumbnail Cache',
        description: 'Cached image/video preview thumbnails (~/.cache/thumbnails)',
        path: path.join(homeDir, '.cache', 'thumbnails'),
        category: 'cache',
        isSafe: true
      }
    );
  }

  const results: JunkItem[] = [];

  for (const target of targets) {
    if (!fs.existsSync(target.path)) continue;

    try {
      let totalBytes = 0;
      let count = 0;

      const entries = await fs.promises.readdir(target.path, { withFileTypes: true });
      for (const entry of entries) {
        const itemPath = path.join(target.path, entry.name);
        try {
          const stat = await fs.promises.stat(itemPath);
          if (stat.isFile()) {
            totalBytes += stat.size;
            count++;
          }
        } catch {}
      }

      if (totalBytes > 0 || count > 0) {
        results.push({
          id: target.id,
          name: target.name,
          description: target.description,
          path: target.path,
          totalBytes,
          formattedBytes: formatBytes(totalBytes),
          fileCount: count,
          isSafe: target.isSafe,
          selected: target.isSafe && totalBytes > 0,
          category: target.category
        });
      }
    } catch {}
  }

  return results;
}
