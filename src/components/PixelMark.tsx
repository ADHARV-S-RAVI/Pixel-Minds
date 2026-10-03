import type { FC } from 'react';

export const PixelMark: FC<{ s?: number; className?: string }> = ({ s = 8, className = '' }) => (
  <span className={`inline-grid grid-cols-2 gap-[2px] shrink-0 ${className}`} style={{ width: s * 2 + 2, height: s * 2 + 2 }}>
    <i style={{ width: s, height: s }} className="rounded-[1px] bg-sky-500" />
    <i style={{ width: s, height: s }} className="rounded-[1px] bg-sky-300" />
    <i style={{ width: s, height: s }} className="rounded-[1px] bg-sky-300" />
    <i style={{ width: s, height: s }} className="rounded-[1px] bg-sky-500" />
  </span>
);
