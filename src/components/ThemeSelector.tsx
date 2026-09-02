import React, { useState, useRef, useEffect } from 'react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { ThemePreset, ThemeMode, ThemeDefinition } from '../types';

export const THEME_PRESETS: ThemeDefinition[] = [
  // Dark Modes
  {
    id: 'obsidian',
    name: 'Obsidian Slate',
    mode: 'dark',
    previewBg: '#0d0f14',
    previewCard: '#13161f',
    previewAccent: '#3b82f6',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    mode: 'dark',
    previewBg: '#000000',
    previewCard: '#0a0a0c',
    previewAccent: '#38bdf8',
  },
  {
    id: 'nordic',
    name: 'Nordic Forest',
    mode: 'dark',
    previewBg: '#090e0c',
    previewCard: '#0e1714',
    previewAccent: '#10b981',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    mode: 'dark',
    previewBg: '#0e0d16',
    previewCard: '#141320',
    previewAccent: '#a855f7',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    mode: 'dark',
    previewBg: '#070d18',
    previewCard: '#0d1627',
    previewAccent: '#0284c7',
  },
  // Light Modes
  {
    id: 'clean-white',
    name: 'Clean Minimal',
    mode: 'light',
    previewBg: '#f4f5f8',
    previewCard: '#ffffff',
    previewAccent: '#2563eb',
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    mode: 'light',
    previewBg: '#f7f5f0',
    previewCard: '#ffffff',
    previewAccent: '#d97706',
  },
  {
    id: 'arctic',
    name: 'Arctic Frost',
    mode: 'light',
    previewBg: '#edf3f8',
    previewCard: '#ffffff',
    previewAccent: '#0284c7',
  },
  {
    id: 'sage-light',
    name: 'Botanical Sage',
    mode: 'light',
    previewBg: '#eff5f1',
    previewCard: '#ffffff',
    previewAccent: '#059669',
  },
];

interface ThemeSelectorProps {
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThemeDef = THEME_PRESETS.find(t => t.id === currentTheme) || THEME_PRESETS[0];
  const isDark = activeThemeDef.mode === 'dark';

  // Toggle quick dark/light mode
  const handleQuickToggleMode = () => {
    if (isDark) {
      onSelectTheme('clean-white');
    } else {
      onSelectTheme('obsidian');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const darkThemes = THEME_PRESETS.filter(t => t.mode === 'dark');
  const lightThemes = THEME_PRESETS.filter(t => t.mode === 'light');

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Quick Mode Toggle (Sun/Moon) */}
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
          onClick={handleQuickToggleMode}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        {/* Theme Palette Dropdown Button */}
        <button
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}
          onClick={() => setIsOpen(!isOpen)}
          title="Customize Theme & Palette"
        >
          <Palette size={12} />
          <span style={{ maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeThemeDef.name}
          </span>
        </button>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: 0,
            width: '240px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            padding: '8px',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Header */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', padding: '2px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dark Themes
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {darkThemes.map(theme => (
              <button
                key={theme.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: currentTheme === theme.id ? 'var(--bg-subtle)' : 'transparent',
                  border: 'none',
                  color: currentTheme === theme.id ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: currentTheme === theme.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (currentTheme !== theme.id) e.currentTarget.style.background = 'var(--bg-panel-hover)';
                }}
                onMouseLeave={e => {
                  if (currentTheme !== theme.id) e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  onSelectTheme(theme.id);
                  setIsOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Swatch circle */}
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: theme.previewBg,
                      border: `2px solid ${theme.previewAccent}`,
                      flexShrink: 0
                    }}
                  />
                  <span>{theme.name}</span>
                </div>

                {currentTheme === theme.id && <Check size={13} style={{ color: 'var(--accent-primary)' }} />}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />

          {/* Light Themes Header */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', padding: '2px 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Light Themes
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {lightThemes.map(theme => (
              <button
                key={theme.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: currentTheme === theme.id ? 'var(--bg-subtle)' : 'transparent',
                  border: 'none',
                  color: currentTheme === theme.id ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: currentTheme === theme.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (currentTheme !== theme.id) e.currentTarget.style.background = 'var(--bg-panel-hover)';
                }}
                onMouseLeave={e => {
                  if (currentTheme !== theme.id) e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  onSelectTheme(theme.id);
                  setIsOpen(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Swatch circle */}
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: theme.previewBg,
                      border: `2px solid ${theme.previewAccent}`,
                      flexShrink: 0
                    }}
                  />
                  <span>{theme.name}</span>
                </div>

                {currentTheme === theme.id && <Check size={13} style={{ color: 'var(--accent-primary)' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
