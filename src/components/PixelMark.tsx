import type { FC } from 'react';

export const PixelMark: FC<{ s?: number; className?: string }> = ({ s = 8, className = '' }) => (
  <span className={`inline-grid grid-cols-2 gap-[2.5px] shrink-0 ${className}`} style={{ width: s * 2 + 2, height: s * 2 + 2 }}>
    <i style={{ width: s, height: s }} className="rounded-[1.5px] bg-[#DFB76C] shadow-[0_0_6px_rgba(223,183,108,0.5)]" />
    <i style={{ width: s, height: s }} className="rounded-[1.5px] bg-[#C5A059]" />
    <i style={{ width: s, height: s }} className="rounded-[1.5px] bg-[#997D46]" />
    <i style={{ width: s, height: s }} className="rounded-[1.5px] bg-[#DFB76C] shadow-[0_0_6px_rgba(223,183,108,0.5)]" />
  </span>
);
