import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  getWindowsDrives,
  scanDirectoryWithFolders,
  resumeScanSession,
  purgeDeletedFromScanSession,
  getImmediateFolderContents,
  scanSystemJunk,
  findDuplicateFiles,
  isSystemProtectedPath
} from './scanner';
import { FileInfo, DeleteResult, ScanResult, ScanChunkInfo } from '../src/types';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let isScanCancelled = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
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
ipcMain.handle('start-scan', async (event, targetPath: string, totalTargetBytes?: number, autoChunk?: boolean): Promise<ScanResult> => {
  isScanCancelled = false;

  const result = await scanDirectoryWithFolders(targetPath, {
    totalTargetBytes,
    autoChunk: autoChunk !== false,
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
ipcMain.handle('resume-scan', async (event, unlimitedRemaining?: boolean): Promise<ScanResult> => {
  isScanCancelled = false;

  const result = await resumeScanSession({
    unlimitedRemaining: !!unlimitedRemaining,
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

// Delete files & folders with OS System Safety Guard & Recycle Bin support
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
        error: 'Blocked by Windows OS Protection Engine: Crucial operating system file/folder cannot be deleted.'
      });
      continue;
    }

    try {
      let fileSize = 0;
      try {
        const stats = await fs.promises.stat(itemPath);
        fileSize = stats.size;
      } catch {}

      if (toRecycleBin) {
        // Safe: Send to OS Recycle Bin
        await shell.trashItem(itemPath);
      } else {
        // Permanent delete
        await fs.promises.rm(itemPath, { recursive: true, force: true });
      }

      successCount++;
      freedBytes += fileSize;
      deletedPaths.push(itemPath);
    } catch (err: any) {
      failedCount++;
      errors.push({
        path: itemPath,
        error: err?.message || 'Failed to delete file/folder'
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
