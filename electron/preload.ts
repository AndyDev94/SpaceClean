import { contextBridge, ipcRenderer } from 'electron';
import { DriveInfo, FileInfo, FolderInfo, JunkItem, DuplicateGroup, DeleteResult, ScanResult, ScanProgress } from '../src/types';

export interface IElectronAPI {
  getDrives: () => Promise<DriveInfo[]>;
  selectFolder: () => Promise<string | null>;
  startScan: (targetPath: string, totalTargetBytes?: number, autoChunk?: boolean) => Promise<ScanResult>;
  resumeScan: (unlimitedRemaining?: boolean) => Promise<ScanResult>;
  getFolderContents: (dirPath: string) => Promise<{ folders: FolderInfo[]; files: FileInfo[] }>;
  cancelScan: () => Promise<void>;
  scanJunk: () => Promise<JunkItem[]>;
  openRecycleBin: () => Promise<boolean>;
  emptyRecycleBin: () => Promise<{ success: boolean; error?: string }>;
  scanDuplicates: (files: FileInfo[]) => Promise<DuplicateGroup[]>;
  getInstalledApps: () => Promise<import('../src/types').InstalledApp[]>;
  uninstallApp: (uninstallString: string, installLocation?: string) => Promise<{ success: boolean; error?: string }>;
  deleteItems: (paths: string[], toRecycleBin: boolean) => Promise<DeleteResult>;
  showItemInFolder: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  readTextPreview: (path: string) => Promise<string>;
  getFileDataUrl: (path: string) => Promise<string | null>;
  onScanProgress: (callback: (data: ScanProgress) => void) => () => void;
  onScanBatch: (callback: (data: { files: FileInfo[]; folders: FolderInfo[] }) => void) => () => void;
  onScanChunkPaused: (callback: (data: ScanProgress) => void) => () => void;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
}

const api: IElectronAPI = {
  getDrives: () => ipcRenderer.invoke('get-drives'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  startScan: (targetPath: string, totalTargetBytes?: number, autoChunk?: boolean) => ipcRenderer.invoke('start-scan', targetPath, totalTargetBytes, autoChunk),
  resumeScan: (unlimitedRemaining?: boolean) => ipcRenderer.invoke('resume-scan', unlimitedRemaining),
  getFolderContents: (dirPath: string) => ipcRenderer.invoke('get-folder-contents', dirPath),
  cancelScan: () => ipcRenderer.invoke('cancel-scan'),
  scanJunk: () => ipcRenderer.invoke('scan-junk'),
  openRecycleBin: () => ipcRenderer.invoke('open-recycle-bin'),
  emptyRecycleBin: () => ipcRenderer.invoke('empty-recycle-bin'),
  scanDuplicates: (files: FileInfo[]) => ipcRenderer.invoke('scan-duplicates', files),
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  uninstallApp: (uninstallString: string, installLocation?: string) => ipcRenderer.invoke('uninstall-app', uninstallString, installLocation),
  deleteItems: (paths: string[], toRecycleBin: boolean) => ipcRenderer.invoke('delete-items', paths, toRecycleBin),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
  openFile: (path: string) => ipcRenderer.invoke('open-file', path),
  readTextPreview: (path: string) => ipcRenderer.invoke('read-text-preview', path),
  getFileDataUrl: (path: string) => ipcRenderer.invoke('get-file-data-url', path),
  onScanProgress: (callback) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scan:progress', subscription);
    return () => {
      ipcRenderer.removeListener('scan:progress', subscription);
    };
  },
  onScanBatch: (callback) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scan:batch', subscription);
    return () => {
      ipcRenderer.removeListener('scan:batch', subscription);
    };
  },
  onScanChunkPaused: (callback) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scan:chunk-paused', subscription);
    return () => {
      ipcRenderer.removeListener('scan:chunk-paused', subscription);
    };
  },
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action),
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
