import React from 'react';

interface StorageLogoProps {
  size?: number;
  className?: string;
}

export const StorageLogo: React.FC<StorageLogoProps> = ({ size = 16, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Outer Drive Body */}
      <rect
        x="3"
        y="2"
        width="18"
        height="20"
        rx="3"
        stroke="var(--accent-primary)"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Magnetic Disk Platter */}
      <circle
        cx="12"
        cy="9"
        r="4.5"
        stroke="var(--accent-primary)"
        strokeWidth="1.75"
      />
      <circle
        cx="12"
        cy="9"
        r="1.5"
        fill="var(--accent-primary)"
      />
      {/* Actuator arm line */}
      <path
        d="M12 9L15 13"
        stroke="var(--accent-primary)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Activity Status LED & Connector notches */}
      <circle
        cx="6.5"
        cy="17.5"
        r="1"
        fill="var(--accent-primary)"
      />
      <line
        x1="10"
        y1="17.5"
        x2="17.5"
        y2="17.5"
        stroke="var(--accent-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
