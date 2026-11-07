import type { FC } from 'react';

export const PixelMark: FC<{ s?: number; className?: string }> = ({ s = 8, className = '' }) => (
  <img
    src="/logo.png"
    alt="Pixel Minds"
    className={`object-contain shrink-0 ${className}`}
    style={{ height: Math.max(32, s * 4), width: 'auto' }}
  />
);
