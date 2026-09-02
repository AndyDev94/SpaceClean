// SpaceClean Auto-OS Detection, Release Router & Light/Dark Theme Controller
document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Controller
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');

  const savedTheme = localStorage.getItem('spaceclean_web_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.textContent = '🌙';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '☀️';
    }
    localStorage.setItem('spaceclean_web_theme', theme);
  }

  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  // 2. OS Auto-Detection & Routing
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  const isMac = platform.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os');
  const isLinux = platform.includes('linux') || userAgent.includes('linux') || userAgent.includes('x11');
  const isWindows = !isMac && !isLinux; // Default fallback to Windows

  const heroBtn = document.getElementById('hero-download-btn');
  const osIcon = document.getElementById('os-icon');
  const downloadLabel = document.getElementById('download-label');
  const downloadSubtext = document.getElementById('download-subtext');

  const cardWindows = document.getElementById('card-windows');
  const cardMac = document.getElementById('card-mac');
  const cardLinux = document.getElementById('card-linux');

  // Direct GitHub release URLs
  const REPO_RELEASES = 'https://github.com/AndyDev94/SpaceClean/releases/latest/download';

  if (isMac) {
    if (heroBtn) heroBtn.href = `${REPO_RELEASES}/SpaceClean-1.0.0.dmg`;
    if (osIcon) osIcon.textContent = '🍎';
    if (downloadLabel) downloadLabel.textContent = 'Download for macOS';
    if (downloadSubtext) downloadSubtext.textContent = 'v1.0.0 • Apple Silicon & Intel (.dmg)';
    if (cardMac) cardMac.classList.add('highlighted');
  } else if (isLinux) {
    if (heroBtn) heroBtn.href = `${REPO_RELEASES}/SpaceClean-1.0.0.AppImage`;
    if (osIcon) osIcon.textContent = '🐧';
    if (downloadLabel) downloadLabel.textContent = 'Download for Linux';
    if (downloadSubtext) downloadSubtext.textContent = 'v1.0.0 • Universal (.AppImage)';
    if (cardLinux) cardLinux.classList.add('highlighted');
  } else {
    // Windows
    if (heroBtn) heroBtn.href = `${REPO_RELEASES}/SpaceClean.Setup.1.0.0.exe`;
    if (osIcon) osIcon.textContent = '💻';
    if (downloadLabel) downloadLabel.textContent = 'Download for Windows';
    if (downloadSubtext) downloadSubtext.textContent = 'v1.0.0 • NSIS Setup (.exe)';
    if (cardWindows) cardWindows.classList.add('highlighted');
  }
});
