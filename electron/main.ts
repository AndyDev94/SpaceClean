import { app, BrowserWindow, ipcMain, dialog, shell, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { autoUpdater } from 'electron-updater';
import {
  getWindowsDrives,
  scanDirectoryWithFolders,
  resumeScanSession,
  purgeDeletedFromScanSession,
  getImmediateFolderContents,
  scanSystemJunk,
  findDuplicateFiles,
  getInstalledApplications,
  executeAppUninstall,
  isSystemProtectedPath,
  openRecycleBin,
  emptyRecycleBin
} from './scanner';
import { FileInfo, DeleteResult, ScanResult, ScanChunkInfo } from '../src/types';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let isScanCancelled = false;

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    win?.webContents.send('app:update-status', {
      status: 'checking',
      message: 'Checking for updates on GitHub Releases...'
    });
  });

  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('app:update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
      message: `SpaceClean v${info.version} is available! Downloading update in background...`
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    win?.webContents.send('app:update-status', {
      status: 'not-available',
      version: info?.version || app.getVersion(),
      message: `You are on the latest version (v${app.getVersion()}).`
    });
  });

  autoUpdater.on('error', (err) => {
    win?.webContents.send('app:update-status', {
      status: 'error',
      message: err?.message || 'Could not connect to GitHub Releases.'
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win?.webContents.send('app:update-progress', {
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    win?.webContents.send('app:update-status', {
      status: 'downloaded',
      version: info.version,
      message: `SpaceClean v${info.version} is ready to install!`
    });
  });
}

function createWindow() {
  // Query primary display workAreaSize to adapt to High-DPI resolution scaling (e.g. 3000x2000 @ 250% = 1200x800 logical, Surface Laptop)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workWidth, height: workHeight } = primaryDisplay.workAreaSize;

  const targetWidth = Math.min(1280, Math.max(800, Math.floor(workWidth * 0.92)));
  const targetHeight = Math.min(840, Math.max(540, Math.floor(workHeight * 0.90)));

  win = new BrowserWindow({
    width: targetWidth,
    height: targetHeight,
    minWidth: 760,
    minHeight: 520,
    frame: false,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    },
    title: 'SpaceClean - Storage Analyzer & Cleaner',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  // Automatic silent check on launch in packaged mode
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 4000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls
ipcMain.on('window-control', (_event, action: 'minimize' | 'maximize' | 'close') => {
  if (!win) return;
  if (action === 'minimize') win.minimize();
  else if (action === 'maximize') {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  } else if (action === 'close') win.close();
});

// Drive detector
ipcMain.handle('get-drives', async () => {
  return await getWindowsDrives();
});

// Custom folder picker
ipcMain.handle('select-folder', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Folder or Drive to Scan'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

function safeSend(channel: string, data: any) {
  try {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  } catch {}
}

// Storage scan (with progressive batch streaming & chunk pausing)
ipcMain.handle('start-scan', async (event, targetPath: string, totalTargetBytes?: number, autoChunk?: boolean, chunkMaxFiles?: number, chunkMaxBytes?: number): Promise<ScanResult> => {
  isScanCancelled = false;

  const result = await scanDirectoryWithFolders(targetPath, {
    totalTargetBytes,
    autoChunk: autoChunk !== false,
    chunkMaxFiles,
    chunkMaxBytes,
    shouldCancel: () => isScanCancelled,
    onProgress: (scannedFiles, scannedBytes, currentFolder, percent) => {
      safeSend('scan:progress', {
        scannedFiles,
        scannedBytes,
        currentFolder,
        percent,
        isScanning: true
      });
    },
    onBatch: (filesBatch, foldersBatch) => {
      safeSend('scan:batch', {
        files: filesBatch,
        folders: foldersBatch
      });
    },
    onChunkPaused: (chunkInfo: ScanChunkInfo) => {
      safeSend('scan:chunk-paused', {
        scannedFiles: chunkInfo.scannedFiles,
        scannedBytes: chunkInfo.scannedBytes,
        currentFolder: chunkInfo.currentFolder,
        percent: 100,
        isScanning: false,
        isChunkPaused: true,
        chunkInfo
      });
    }
  });

  return result;
});

// Resume storage scan for next part
ipcMain.handle('resume-scan', async (event, unlimitedRemaining?: boolean, chunkMaxFiles?: number, chunkMaxBytes?: number): Promise<ScanResult> => {
  isScanCancelled = false;

  const result = await resumeScanSession({
    unlimitedRemaining: !!unlimitedRemaining,
    chunkMaxFiles,
    chunkMaxBytes,
    shouldCancel: () => isScanCancelled,
    onProgress: (scannedFiles, scannedBytes, currentFolder, percent) => {
      safeSend('scan:progress', {
        scannedFiles,
        scannedBytes,
        currentFolder,
        percent,
        isScanning: true
      });
    },
    onBatch: (filesBatch, foldersBatch) => {
      safeSend('scan:batch', {
        files: filesBatch,
        folders: foldersBatch
      });
    },
    onChunkPaused: (chunkInfo: ScanChunkInfo) => {
      safeSend('scan:chunk-paused', {
        scannedFiles: chunkInfo.scannedFiles,
        scannedBytes: chunkInfo.scannedBytes,
        currentFolder: chunkInfo.currentFolder,
        percent: 100,
        isScanning: false,
        isChunkPaused: true,
        chunkInfo
      });
    }
  });

  return result;
});

// Instant folder explorer inspection
ipcMain.handle('get-folder-contents', async (_event, dirPath: string) => {
  return await getImmediateFolderContents(dirPath);
});

// Cancel scan
ipcMain.handle('cancel-scan', async () => {
  isScanCancelled = true;
  return true;
});

// Scan system junk
ipcMain.handle('scan-junk', async () => {
  return await scanSystemJunk();
});

// Open OS Recycle Bin / Trash in native explorer
ipcMain.handle('open-recycle-bin', async () => {
  return await openRecycleBin();
});

// Empty OS Recycle Bin / Trash
ipcMain.handle('empty-recycle-bin', async () => {
  return await emptyRecycleBin();
});

// Scan duplicates (on-demand only)
ipcMain.handle('scan-duplicates', async (event, files: FileInfo[]) => {
  isScanCancelled = false;
  return await findDuplicateFiles(files, {
    shouldCancel: () => isScanCancelled,
    onProgress: (processed, _bytes, currentPath) => {
      safeSend('scan:progress', {
        scannedFiles: processed,
        scannedBytes: 0,
        currentFolder: currentPath,
      });
    },
  });
});

function resolveAppIconPath(appItem: { icon?: string; installLocation?: string; uninstallString?: string }): string | null {
  // 1. Explicit DisplayIcon from registry / desktop entry
  if (appItem.icon) {
    let clean = appItem.icon.replace(/^"|"$/g, '').trim();
    clean = clean.replace(/,\s*-?\d+$/, ''); // Strip icon index like ,0
    if (fs.existsSync(clean)) {
      try {
        const stat = fs.statSync(clean);
        if (stat.isFile()) return clean;
      } catch {}
    }
    const exeIdx = clean.toLowerCase().indexOf('.exe');
    if (exeIdx !== -1) {
      const sub = clean.slice(0, exeIdx + 4);
      if (fs.existsSync(sub)) return sub;
    }
  }

  // 2. From installLocation folder / app bundle
  if (appItem.installLocation) {
    const cleanLoc = appItem.installLocation.replace(/^"|"$/g, '').trim();
    if (fs.existsSync(cleanLoc)) {
      try {
        const stat = fs.statSync(cleanLoc);
        if (stat.isDirectory()) {
          const entries = fs.readdirSync(cleanLoc);
          const exe = entries.find(f => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('unins'));
          if (exe) return path.join(cleanLoc, exe);
          return cleanLoc;
        }
        if (stat.isFile()) return cleanLoc;
      } catch {}
    }
  }

  // 3. Fallback from uninstallString
  if (appItem.uninstallString) {
    let cleanUnins = appItem.uninstallString.replace(/^"|"$/g, '').trim();
    const exeIdx = cleanUnins.toLowerCase().indexOf('.exe');
    if (exeIdx !== -1) {
      const sub = cleanUnins.slice(0, exeIdx + 4);
      if (fs.existsSync(sub)) return sub;
    }
  }

  return null;
}

// Scan installed applications (Windows Registry, macOS /Applications, Linux .desktop) with real icon extraction
ipcMain.handle('get-installed-apps', async () => {
  const apps = await getInstalledApplications();

  // Asynchronously extract high-resolution native icons via Electron getFileIcon
  const enriched = await Promise.all(
    apps.map(async (item) => {
      try {
        const targetPath = resolveAppIconPath(item);
        if (targetPath) {
          const iconNative = await app.getFileIcon(targetPath, { size: 'normal' });
          if (iconNative && !iconNative.isEmpty()) {
            return {
              ...item,
              icon: iconNative.toDataURL()
            };
          }
        }
      } catch {}
      return item;
    })
  );

  return enriched;
});

// Trigger application uninstaller
ipcMain.handle('uninstall-app', async (_event, uninstallString: string, installLocation?: string) => {
  return await executeAppUninstall(uninstallString, installLocation);
});

// Delete files & folders with OS System Safety Guard, file-lock release retry & Recycle Bin support
ipcMain.handle('delete-items', async (_event, paths: string[], toRecycleBin: boolean): Promise<DeleteResult> => {
  let successCount = 0;
  let failedCount = 0;
  let freedBytes = 0;
  const deletedPaths: string[] = [];
  const errors: { path: string; error: string }[] = [];

  for (const itemPath of paths) {
    // 🛡️ CRITICAL OS SAFETY GUARD: Block deletion of any Windows OS protected file or system folder!
    if (isSystemProtectedPath(itemPath)) {
      failedCount++;
      errors.push({
        path: itemPath,
        error: 'Blocked by OS Protection Engine: Crucial operating system file/folder cannot be deleted.'
      });
      continue;
    }

    let fileSize = 0;
    try {
      const stats = await fs.promises.stat(itemPath);
      fileSize = stats.size;
    } catch {}

    let deleted = false;
    let lastErrorMsg = '';

    // Retry loop (up to 3 attempts with exponential backoff to handle media stream release)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (toRecycleBin) {
          // Safe: Send to OS Recycle Bin
          await shell.trashItem(itemPath);
        } else {
          // Permanent delete
          await fs.promises.rm(itemPath, { recursive: true, force: true });
        }
        deleted = true;
        break;
      } catch (err: any) {
        lastErrorMsg = err?.message || 'File is currently in use or locked by another process';
        // Give 80ms for OS file handles / media previews to release
        await new Promise(r => setTimeout(r, 80 * (attempt + 1)));
      }
    }

    if (deleted) {
      successCount++;
      freedBytes += fileSize;
      deletedPaths.push(itemPath);
    } else {
      failedCount++;
      errors.push({
        path: itemPath,
        error: lastErrorMsg || 'Failed to delete item'
      });
    }
  }

  // Purge from active memory scan session so they never reappear in subsequent chunks/waves
  if (deletedPaths.length > 0) {
    purgeDeletedFromScanSession(deletedPaths);
  }

  return {
    totalRequested: paths.length,
    successCount,
    failedCount,
    freedBytes,
    recycleBin: toRecycleBin,
    deletedPaths,
    errors
  };
});

// Show in Windows Explorer
ipcMain.handle('show-item-in-folder', async (_event, targetPath: string) => {
  shell.showItemInFolder(targetPath);
});

// Open file with default application
ipcMain.handle('open-file', async (_event, targetPath: string) => {
  await shell.openPath(targetPath);
});

// Read text file preview snippet
ipcMain.handle('read-text-preview', async (_event, filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 1024 * 1024) { // Read first 48KB if large
      const fd = await fs.promises.open(filePath, 'r');
      const buffer = Buffer.alloc(48 * 1024);
      const { bytesRead } = await fd.read(buffer, 0, 48 * 1024, 0);
      await fd.close();
      return buffer.toString('utf8', 0, bytesRead) + '\n\n... [Preview truncated - file is large]';
    }
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (err: any) {
    return 'Could not generate text preview: ' + (err?.message || 'Inaccessible');
  }
});

// Convert local media file to safe Data URL for embedded preview
ipcMain.handle('get-file-data-url', async (_event, filePath: string) => {
  try {
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      mp4: 'video/mp4', webm: 'video/webm', ogg: 'audio/ogg',
      mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', m4a: 'audio/mp4'
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 25 * 1024 * 1024) { // Limit inline data URL to 25MB for memory safety
      return null;
    }
    const buffer = await fs.promises.readFile(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    return null;
  }
});

// Auto-Updater: Manual Trigger Check
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return {
      status: 'dev-mode',
      version: app.getVersion(),
      message: 'Running in development environment. Auto-update applies in packaged release builds.'
    };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      status: 'checked',
      version: result?.updateInfo?.version || app.getVersion()
    };
  } catch (err: any) {
    return {
      status: 'error',
      message: err?.message || 'Could not check GitHub Releases'
    };
  }
});

// Auto-Updater: Restart and Install Downloaded Update
ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

// App Info: Get current running version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Security & Threat Analysis: Compute SHA-256 and MD5 hashes for VirusTotal lookup
ipcMain.handle('get-file-hash', async (_event, filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath);
    // For files up to 250MB, calculate exact SHA-256 and MD5
    if (stats.size > 250 * 1024 * 1024) {
      return {
        sha256: '',
        md5: '',
        size: stats.size,
        error: 'File exceeds 250MB size limit for instant hashing'
      };
    }

    return new Promise((resolve) => {
      const sha256Hash = crypto.createHash('sha256');
      const md5Hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        sha256Hash.update(chunk);
        md5Hash.update(chunk);
      });

      stream.on('end', () => {
        resolve({
          sha256: sha256Hash.digest('hex'),
          md5: md5Hash.digest('hex'),
          size: stats.size
        });
      });

      stream.on('error', (err) => {
        resolve({
          sha256: '',
          md5: '',
          size: stats.size,
          error: err.message
        });
      });
    });
  } catch (err: any) {
    return {
      sha256: '',
      md5: '',
      size: 0,
      error: err?.message || 'File inaccessible'
    };
  }
});

// Open external URL in default browser (VirusTotal, GitHub, etc.)
ipcMain.handle('open-external-url', async (_event, targetUrl: string) => {
  if (targetUrl && (targetUrl.startsWith('https://') || targetUrl.startsWith('http://'))) {
    await shell.openExternal(targetUrl);
    return true;
  }
  return false;
});
