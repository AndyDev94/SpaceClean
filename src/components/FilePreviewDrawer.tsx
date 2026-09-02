import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Archive,
  Code2,
  File,
  Shield,
  Clock,
  HardDrive,
  Info,
  Maximize2
} from 'lucide-react';
import { FileInfo } from '../types';
import { formatBytes } from '../utils/filterUtils';
import { format } from 'date-fns';

interface FilePreviewDrawerProps {
  file: FileInfo | null;
  onClose: () => void;
  onDeleteFile: (path: string) => void;
}

export const FilePreviewDrawer: React.FC<FilePreviewDrawerProps> = ({
  file,
  onClose,
  onDeleteFile,
}) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      if (!file) {
        setMediaUrl(null);
        setTextContent(null);
        setPreviewError(false);
        return;
      }

      setIsLoadingPreview(true);
      setPreviewError(false);
      setTextContent(null);

      const ext = (file.extension || '').toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'jfif'].includes(ext);
      const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'm4v', 'flv', 'ts'].includes(ext);
      const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'aiff'].includes(ext);
      const isText = [
        'txt', 'log', 'json', 'csv', 'md', 'js', 'ts', 'jsx', 'tsx', 'py',
        'html', 'css', 'xml', 'yaml', 'yml', 'ini', 'sh', 'bat', 'cmd',
        'ps1', 'sql', 'c', 'cpp', 'h', 'java', 'rs', 'go', 'env', 'gitignore',
        'conf', 'cfg', 'reg', 'nfo', 'inf', 'properties', 'vbs'
      ].includes(ext);

      // 1. Direct local file URL (works natively in Electron with webSecurity: false)
      const directFileUrl = 'file:///' + encodeURI(file.path.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');

      if (isImage || isVideo || isAudio) {
        setMediaUrl(directFileUrl);

        // Also fetch base64 data url as fallback if needed
        if (window.electronAPI?.getFileDataUrl && isImage && file.size < 20 * 1024 * 1024) {
          try {
            const dataUrl = await window.electronAPI.getFileDataUrl(file.path);
            if (isMounted && dataUrl) {
              setMediaUrl(dataUrl);
            }
          } catch {}
        }
      } else if (isText && window.electronAPI?.readTextPreview) {
        try {
          const text = await window.electronAPI.readTextPreview(file.path);
          if (isMounted) setTextContent(text);
        } catch (e) {
          console.error('Text preview error', e);
        }
      } else {
        setMediaUrl(null);
      }

      if (isMounted) setIsLoadingPreview(false);
    }

    loadPreview();

    return () => {
      isMounted = false;
      // 🛡️ Release OS file handle locks on video/audio immediately
      try {
        const mediaEls = document.querySelectorAll('video, audio');
        mediaEls.forEach((el) => {
          try {
            (el as HTMLMediaElement).pause();
            (el as HTMLMediaElement).removeAttribute('src');
            (el as HTMLMediaElement).load();
          } catch {}
        });
      } catch {}
      setMediaUrl(null);
      setTextContent(null);
    };
  }, [file]);

  if (!file) return null;

  const ext = (file.extension || '').toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'jfif'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'm4v', 'flv', 'ts'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'aiff'].includes(ext);
  const isText = [
    'txt', 'log', 'json', 'csv', 'md', 'js', 'ts', 'jsx', 'tsx', 'py',
    'html', 'css', 'xml', 'yaml', 'yml', 'ini', 'sh', 'bat', 'cmd',
    'ps1', 'sql', 'c', 'cpp', 'h', 'java', 'rs', 'go', 'env', 'gitignore',
    'conf', 'cfg', 'reg', 'nfo', 'inf', 'properties', 'vbs'
  ].includes(ext);
  const isPdf = ext === 'pdf';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleShowInExplorer = async () => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(file.path);
    }
  };

  const handleOpenFile = async () => {
    if (window.electronAPI?.openFile) {
      await window.electronAPI.openFile(file.path);
    }
  };

  return (
    <div
      className="file-preview-drawer"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
      style={{
        width: '380px',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        zIndex: 100,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: 'var(--bg-app)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Info size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            File Inspector & Live Preview
          </span>
        </div>

        <button
          className="window-btn"
          onClick={onClose}
          style={{ width: '24px', height: '24px' }}
          title="Close Inspector (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Media / Content Preview Box */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            minHeight: '180px',
            maxHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          {isLoadingPreview ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Loading preview...</div>
          ) : isImage && mediaUrl && !previewError ? (
            <img
              src={mediaUrl}
              alt={file.name}
              onError={() => setPreviewError(true)}
              style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', display: 'block', borderRadius: '4px' }}
            />
          ) : isVideo && mediaUrl && !previewError ? (
            <video
              src={mediaUrl}
              controls
              onError={() => setPreviewError(true)}
              style={{ maxWidth: '100%', maxHeight: '250px', outline: 'none', background: '#000000', borderRadius: '4px' }}
            />
          ) : isAudio && mediaUrl && !previewError ? (
            <div style={{ width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Music size={24} />
              </div>
              <audio src={mediaUrl} controls onError={() => setPreviewError(true)} style={{ width: '100%', outline: 'none' }} />
            </div>
          ) : isText && textContent !== null ? (
            <div
              style={{
                width: '100%',
                height: '250px',
                padding: '12px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.45',
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                background: 'var(--bg-app)'
              }}
            >
              {textContent}
            </div>
          ) : isPdf ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <FileText size={42} style={{ color: '#ef4444', margin: '0 auto 8px', opacity: 0.9 }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>PDF Document</div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Open with your default PDF viewer</p>
              <button className="btn btn-secondary" style={{ marginTop: '10px', fontSize: '11px' }} onClick={handleOpenFile}>
                <ExternalLink size={12} /> Open PDF
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
              <File size={40} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>.{file.extension.toUpperCase()} File</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Binary / document asset</div>
              <button className="btn btn-secondary" style={{ marginTop: '10px', fontSize: '11px' }} onClick={handleOpenFile}>
                <ExternalLink size={12} /> Open File
              </button>
            </div>
          )}
        </div>

        {/* File Metadata Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-word' }}>
              {file.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span className="badge-category">.{file.extension}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                {file.formattedSize}
              </span>
              {file.isProtected && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '10px', fontWeight: 600 }}>
                  <Shield size={10} /> Protected
                </span>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            {/* Exact Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Exact Size:</span>
              <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {file.size.toLocaleString()} bytes
              </span>
            </div>

            {/* Modified Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Modified:</span>
              <span style={{ color: 'var(--text-main)' }}>
                {format(new Date(file.modifiedAt), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            </div>

            {/* Created Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Created:</span>
              <span style={{ color: 'var(--text-main)' }}>
                {format(new Date(file.createdAt), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            </div>

            {/* Category */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Category:</span>
              <span style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                {file.category}
              </span>
            </div>

            {/* Path */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Full Path:</span>
                <button
                  style={{ background: 'transparent', border: 'none', color: copiedPath ? '#10b981' : 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                  onClick={handleCopyPath}
                  title="Copy path to clipboard"
                >
                  {copiedPath ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  background: 'var(--bg-panel)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {file.path}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-app)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '11px' }}
            onClick={handleShowInExplorer}
            title="Reveal in Windows File Explorer"
          >
            <FolderOpen size={13} />
            <span>Explorer</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '11px' }}
            onClick={handleOpenFile}
            title="Open with default Windows application"
          >
            <ExternalLink size={13} />
            <span>Open</span>
          </button>
        </div>

        {!file.isProtected && (
          <button
            className="btn btn-danger"
            style={{ padding: '5px 12px', fontSize: '11px' }}
            onClick={() => onDeleteFile(file.path)}
            title="Delete this file"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
};
