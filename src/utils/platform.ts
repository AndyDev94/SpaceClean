// Dynamic Cross-Platform Helpers (Windows, macOS, Linux)

export const isMac = typeof navigator !== 'undefined' && (
  /Mac|iPod|iPhone|iPad/.test(navigator.platform) ||
  /Macintosh|Mac OS X/.test(navigator.userAgent)
);

export const isLinux = typeof navigator !== 'undefined' && (
  /Linux/.test(navigator.platform) ||
  /Linux/.test(navigator.userAgent)
);

export const isWindows = !isMac && !isLinux;

export const osName: 'macOS' | 'Linux' | 'Windows' = isMac ? 'macOS' : isLinux ? 'Linux' : 'Windows';

export const cmdOrCtrl: string = isMac ? 'Cmd' : 'Ctrl';
export const cmdOrCtrlSymbol: string = isMac ? '⌘' : 'Ctrl';

export const fileManagerName: string = isMac ? 'Finder' : isLinux ? 'File Manager' : 'File Explorer';

export const trashName: string = isMac || isLinux ? 'Trash' : 'Recycle Bin';

export const osProtectedFileLabel: string = `${osName} Protected File (Safety Lock)`;
