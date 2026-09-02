import { FileInfo, ThreatItem, ThreatRiskLevel } from '../types';

// Critical OS names that should only exist in System directories
const CRITICAL_SYSTEM_BINARIES = new Set([
  'svchost.exe',
  'csrss.exe',
  'lsass.exe',
  'services.exe',
  'smss.exe',
  'winlogon.exe',
  'spoolsv.exe',
  'wininit.exe',
  'taskhostw.exe',
  'runtimebroker.exe'
]);

// Known ransomware extensions
const RANSOMWARE_EXTENSIONS = new Set([
  'locked',
  'crypto',
  'crypted',
  'wnry',
  'wannacry',
  'enc',
  'crypt',
  'locky',
  'zepto',
  'cerber',
  'payme',
  'encrypt',
  'aes',
  'crinf',
  'r5a'
]);

// Innocent extensions that attackers masquerade before the real executable extension
const INNOCENT_EXTENSIONS_REGEX = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|mp4|mkv|mp3|zip|rar|7z|txt|csv|iso)\.(exe|vbs|bat|cmd|scr|pif|hta|js|wsf)$/i;

// Dangerous script and executable extensions
const EXECUTABLE_EXTENSIONS = new Set(['exe', 'scr', 'pif', 'hta', 'cpl', 'com', 'gadget']);
const SCRIPT_EXTENSIONS = new Set(['vbs', 'ps1', 'bat', 'cmd', 'wsf', 'hta', 'js', 'vbe', 'jse']);

/**
 * Heuristically inspects a single FileInfo object for security threats
 */
export function analyzeFileForThreats(file: FileInfo): ThreatItem | null {
  const lowerName = file.name.toLowerCase();
  const lowerPath = file.path.toLowerCase().replace(/\\/g, '/');
  const ext = file.extension.toLowerCase();

  // Rule 1: Double Extension Masquerading (e.g. document.pdf.exe, image.jpg.vbs)
  if (INNOCENT_EXTENSIONS_REGEX.test(lowerName)) {
    return {
      id: `threat-double-ext-${file.path}`,
      file,
      riskLevel: 'high',
      ruleName: 'Double Extension Camouflage',
      category: 'Camouflaged Executable',
      description: `This file pretends to be a normal document or media file, but its true executable extension is .${ext}. This is a classic malware concealment tactic.`,
      recommendation: 'Quarantine or delete immediately. Do NOT double-click or open.'
    };
  }

  // Rule 2: Ransomware Extension Patterns
  if (RANSOMWARE_EXTENSIONS.has(ext)) {
    return {
      id: `threat-ransomware-${file.path}`,
      file,
      riskLevel: 'high',
      ruleName: 'Ransomware / Encrypted Signature',
      category: 'Ransomware Pattern',
      description: `The extension .${ext} matches known ransomware locking signatures used to hijack personal documents and folders.`,
      recommendation: 'Inspect file contents and verify if this file was locked by an unauthorized encryption program.'
    };
  }

  // Rule 3: System Binary Impersonation outside System Directory
  if (CRITICAL_SYSTEM_BINARIES.has(lowerName)) {
    // Check if path is NOT in System32 or Windows root
    const isWindowsSystemDir = lowerPath.includes('/windows/system32/') || lowerPath.includes('/windows/syswow64/') || lowerPath.includes('/windows/winsxs/');
    if (!isWindowsSystemDir) {
      return {
        id: `threat-sys-impersonate-${file.path}`,
        file,
        riskLevel: 'high',
        ruleName: 'System File Impersonation',
        category: 'Malware Impersonation',
        description: `This file is named "${file.name}" (a critical core system process), but is located outside Windows System directories in "${file.path}". Malicious trojans commonly clone system names to avoid detection.`,
        recommendation: 'Quarantine or delete immediately. Legitimate OS processes reside strictly in System32.'
      };
    }
  }

  // Rule 4: Rogue Standalone Executable in Temp / AppData Temp folders
  const isInTempFolder = lowerPath.includes('/temp/') || lowerPath.includes('/tmp/') || lowerPath.includes('/appdata/local/temp/');
  if (isInTempFolder && EXECUTABLE_EXTENSIONS.has(ext)) {
    return {
      id: `threat-temp-exe-${file.path}`,
      file,
      riskLevel: 'high',
      ruleName: 'Rogue Executable in Temp Directory',
      category: 'Unverified Temp Binary',
      description: `An executable file was found in a temporary storage folder (${file.path}). Dropper trojans and adware frequently stage executables in Temp before execution.`,
      recommendation: 'Safe to delete if this is not part of an active software installation.'
    };
  }

  // Rule 5: Suspicious Standalone Scripts in Downloads or Desktop
  const isInUserRoots = lowerPath.includes('/downloads/') || lowerPath.includes('/desktop/');
  if (isInUserRoots && SCRIPT_EXTENSIONS.has(ext)) {
    return {
      id: `threat-suspicious-script-${file.path}`,
      file,
      riskLevel: 'suspicious',
      ruleName: 'Unverified Script File',
      category: 'Script Payload',
      description: `A standalone .${ext} script was found in your ${lowerPath.includes('/downloads/') ? 'Downloads' : 'Desktop'} folder. Script files can execute silent background command lines or registry changes.`,
      recommendation: 'Review file source before running. If you did not write or expect this script, delete it.'
    };
  }

  // Rule 6: Obfuscated or Hidden Scripts in AppData
  const isInAppData = lowerPath.includes('/appdata/roaming/') || lowerPath.includes('/appdata/local/');
  if (isInAppData && (ext === 'vbs' || ext === 'hta' || ext === 'wsf' || ext === 'pif')) {
    return {
      id: `threat-appdata-script-${file.path}`,
      file,
      riskLevel: 'suspicious',
      ruleName: 'Suspicious AppData Script',
      category: 'Background Script',
      description: `An unconventional .${ext} script was detected inside your local AppData tree. Some unwanted programs and adware maintain persistence using AppData scripts.`,
      recommendation: 'Verify the application folder name. Delete if unrecognized.'
    };
  }

  // Rule 7: Zero-byte / Corrupted Fake Executables
  if (EXECUTABLE_EXTENSIONS.has(ext) && file.size === 0) {
    return {
      id: `threat-zero-exe-${file.path}`,
      file,
      riskLevel: 'warning',
      ruleName: 'Empty / Orphaned Binary Stub',
      category: 'Orphaned Stub',
      description: `This executable has a size of 0 bytes and may be a corrupted leftover from an interrupted installation or payload injection attempt.`,
      recommendation: 'Safe to clean and delete.'
    };
  }

  return null;
}

/**
 * Scans an array of FileInfo items and returns all detected ThreatItems
 */
export function scanFilesForThreats(files: FileInfo[]): ThreatItem[] {
  const threats: ThreatItem[] = [];
  for (const file of files) {
    const threat = analyzeFileForThreats(file);
    if (threat) {
      threats.push(threat);
    }
  }
  return threats;
}
