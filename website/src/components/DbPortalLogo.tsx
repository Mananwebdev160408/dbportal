import React from 'react';

interface DbPortalLogoProps {
  className?: string;
  size?: number;
}

export default function DbPortalLogo({ className = "w-7 h-7", size }: DbPortalLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src="/logo.png"
      alt="dbportal logo"
      className={`rounded-lg object-contain ${className}`}
      style={style}
    />
  );
}

