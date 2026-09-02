import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { StorageLogo } from './StorageLogo';
import { ThemeSelector } from './ThemeSelector';
import { ThemePreset } from '../types';

interface TitleBarProps {
  currentPath: string;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentPath,
  currentTheme,
  onSelectTheme,
}) => {
  const handleControl = (action: 'minimize' | 'maximize' | 'close') => {
    if (window.electronAPI?.windowControl) {
      window.electronAPI.windowControl(action);
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <div className="titlebar-logo">
          <StorageLogo size={15} />
        </div>
        <span className="titlebar-title">SpaceClean</span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>
          by Aneesh
        </span>
        {currentPath && (
          <span className="titlebar-path-badge" title={currentPath}>
            {currentPath}
          </span>
        )}
      </div>

      <div className="titlebar-controls" style={{ gap: '6px' }}>
        <ThemeSelector
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
        />

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="window-btn"
            onClick={() => handleControl('minimize')}
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            className="window-btn"
            onClick={() => handleControl('maximize')}
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            className="window-btn close"
            onClick={() => handleControl('close')}
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
