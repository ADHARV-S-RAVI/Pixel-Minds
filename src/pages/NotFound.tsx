import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const COLS = 17;
const ROWS = 7;

const DEFAULT_PIXELS: boolean[] = [
  // Row 0 (top padding)
  false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false,
  // Row 1
  false, true, false, false, true, false, false, true, true, true, false, false, true, false, false, true, false,
  // Row 2
  false, true, false, false, true, false, true, false, false, false, true, false, true, false, false, true, false,
  // Row 3
  false, true, true, true, true, false, true, false, false, false, true, false, true, true, true, true, false,
  // Row 4
  false, false, false, false, true, false, true, false, false, false, true, false, false, false, false, true, false,
  // Row 5
  false, false, false, false, true, false, false, true, true, true, false, false, false, false, false, true, false,
  // Row 6 (bottom padding)
  false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false,
];

// More frequent, staggered multi-color flicker nodes (coral, amber, emerald, cyan)
const FLICKER_NODES: Record<number, { duration: string; delay: string; variant: 'warm' | 'mint' }> = {
  [1 * COLS + 1]: { duration: '3.6s', delay: '0.2s', variant: 'warm' },
  [1 * COLS + 4]: { duration: '4.2s', delay: '1.4s', variant: 'mint' },
  [1 * COLS + 8]: { duration: '3.8s', delay: '0.8s', variant: 'warm' },
  [1 * COLS + 12]: { duration: '4.5s', delay: '2.0s', variant: 'mint' },
  [1 * COLS + 15]: { duration: '3.5s', delay: '1.1s', variant: 'warm' },
  [2 * COLS + 6]: { duration: '4.1s', delay: '1.7s', variant: 'mint' },
  [3 * COLS + 2]: { duration: '3.9s', delay: '0.5s', variant: 'warm' },
  [3 * COLS + 10]: { duration: '4.4s', delay: '1.9s', variant: 'mint' },
  [3 * COLS + 13]: { duration: '3.7s', delay: '1.2s', variant: 'warm' },
  [4 * COLS + 15]: { duration: '4.3s', delay: '0.7s', variant: 'mint' },
  [5 * COLS + 4]: { duration: '3.6s', delay: '1.5s', variant: 'warm' },
  [5 * COLS + 7]: { duration: '4.0s', delay: '0.3s', variant: 'mint' },
  [5 * COLS + 9]: { duration: '4.6s', delay: '2.2s', variant: 'warm' },
};

const EXPLOSION_COLORS = ['#22d3ee', '#fb7185', '#fbbf24', '#34d399', '#f472b6', '#ffffff'];

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  size: number;
}

interface Shockwave {
  id: number;
  x: number;
  y: number;
  color: string;
}

export function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pixels, setPixels] = useState<boolean[]>(DEFAULT_PIXELS);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const effectIdRef = useRef(0);

  const attemptedPath =
    (location.state as { attemptedPath?: string } | null)?.attemptedPath || location.pathname;

  const isModified = useMemo(
    () => pixels.some((val, idx) => val !== DEFAULT_PIXELS[idx]),
    [pixels]
  );

  const spawnExplosion = (btn: HTMLButtonElement) => {
    const container = gridContainerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const originX = bRect.left - cRect.left + bRect.width / 2;
    const originY = bRect.top - cRect.top + bRect.height / 2;

    // 1. Expanding pixel shockwave ring
    effectIdRef.current += 1;
    const waveId = effectIdRef.current;
    const waveColor = EXPLOSION_COLORS[Math.floor(Math.random() * 4)];
    setShockwaves((prev) => [...prev, { id: waveId, x: originX, y: originY, color: waveColor }]);

    // 2. 18 multi-speed square debris particles
    const count = 18;
    const batch: BurstParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 36 + Math.random() * 54;
      effectIdRef.current += 1;
      batch.push({
        id: effectIdRef.current,
        x: originX,
        y: originY,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 260,
        color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
        size: 3 + Math.floor(Math.random() * 5),
      });
    }

    const batchIds = new Set(batch.map((p) => p.id));
    setParticles((prev) => [...prev, ...batch]);

    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !batchIds.has(p.id)));
      setShockwaves((prev) => prev.filter((w) => w.id !== waveId));
    }, 750);
  };

  const handlePixelClick = (idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    spawnExplosion(e.currentTarget);
    setPixels((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full pm-bg-canvas flex flex-col justify-between p-6 sm:p-10 select-none overflow-x-hidden">
      {/* Keyframes for Frequent Multi-Color Flicker & Explosion Shards */}
      <style>{`
        @keyframes pm-flicker-warm {
          0%, 42%, 100% {
            background-color: #06b6d4;
            box-shadow: 0 0 6px rgba(6, 182, 212, 0.35);
          }
          48% {
            background-color: #fbbf24;
            box-shadow: 0 0 14px rgba(251, 191, 36, 0.9);
          }
          54% {
            background-color: #06b6d4;
            box-shadow: none;
          }
          62% {
            background-color: #fb7185;
            box-shadow: 0 0 14px rgba(251, 113, 133, 0.9);
          }
          70% {
            background-color: #06b6d4;
            box-shadow: 0 0 6px rgba(6, 182, 212, 0.35);
          }
        }
        @keyframes pm-flicker-mint {
          0%, 45%, 100% {
            background-color: #06b6d4;
            box-shadow: 0 0 6px rgba(6, 182, 212, 0.35);
          }
          52% {
            background-color: #34d399;
            box-shadow: 0 0 14px rgba(52, 211, 153, 0.9);
          }
          58% {
            background-color: #ffffff;
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.95);
          }
          66% {
            background-color: #f472b6;
            box-shadow: 0 0 14px rgba(244, 114, 182, 0.85);
          }
          74% {
            background-color: #06b6d4;
            box-shadow: 0 0 6px rgba(6, 182, 212, 0.35);
          }
        }
        @keyframes pm-explosion-shard {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15) rotate(0deg);
          }
          65% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.2) rotate(var(--rot));
          }
        }
        @keyframes pm-shockwave {
          0% {
            opacity: 0.85;
            transform: translate(-50%, -50%) scale(0.3);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3.4);
          }
        }
      `}</style>

      {/* Top-Left Brand Header */}
      <header className="w-full flex items-center justify-start">
        <Link
          to="/"
          className="inline-flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-85"
        >
          <img
            src="/logo.png"
            alt="Pixel Minds"
            className="h-11 sm:h-12 w-auto object-contain shrink-0"
          />
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0e1b33] dark:text-[#f8fafc] font-['Outfit',sans-serif]">
            Pixel Minds
          </span>
        </Link>
      </header>

      {/* Borderless Centered Content */}
      <main className="my-auto py-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-7">
        {/* 17x7 Interactive Pixel Matrix */}
        <div className="flex flex-col items-center">
          <div ref={gridContainerRef} className="relative inline-block">
            <div
              className="inline-grid gap-1.5 sm:gap-2"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, auto))`,
                gridTemplateRows: `repeat(${ROWS}, minmax(0, auto))`,
              }}
            >
              {pixels.map((active, idx) => {
                const flicker = FLICKER_NODES[idx];

                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Toggle pixel ${idx + 1}`}
                    onClick={(e) => handlePixelClick(idx, e)}
                    style={
                      active && flicker
                        ? {
                          animation: `${flicker.variant === 'warm' ? 'pm-flicker-warm' : 'pm-flicker-mint'
                            } ${flicker.duration} ease-in-out ${flicker.delay} infinite`,
                        }
                        : undefined
                    }
                    className={`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 rounded-[3px] transition-transform duration-150 active:scale-75 cursor-pointer ${active
                        ? 'bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.45)] hover:bg-amber-400'
                        : 'bg-white/70 border border-slate-300/80 shadow-2xs hover:bg-cyan-100/90 hover:border-cyan-400 dark:bg-white/[0.07] dark:border-white/[0.08] dark:shadow-none dark:hover:bg-cyan-400/25'
                      }`}
                  />
                );
              })}
            </div>

            {/* Explosion Shockwave & Particle Layer */}
            <div className="pointer-events-none absolute inset-0 overflow-visible z-20">
              {shockwaves.map((w) => (
                <span
                  key={w.id}
                  style={{
                    left: `${w.x}px`,
                    top: `${w.y}px`,
                    borderColor: w.color,
                    animation: 'pm-shockwave 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                  className="absolute w-6 h-6 rounded-md border-2"
                />
              ))}

              {particles.map((p) => (
                <span
                  key={p.id}
                  style={
                    {
                      left: `${p.x}px`,
                      top: `${p.y}px`,
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}`,
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      '--rot': `${p.rot}deg`,
                      animation: 'pm-explosion-shard 720ms cubic-bezier(0.12, 0.9, 0.25, 1) forwards',
                    } as React.CSSProperties
                  }
                  className="absolute rounded-[1px]"
                />
              ))}
            </div>
          </div>

          {isModified && (
            <button
              type="button"
              onClick={() => setPixels(DEFAULT_PIXELS)}
              className="mt-3 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Reset grid
            </button>
          )}
        </div>

        {/* Clean Typography */}
        <div className="space-y-2.5">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0e1b33] dark:text-[#f8fafc] font-['Outfit',sans-serif] tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Nothing exists at{' '}
            <code className="font-mono text-xs text-cyan-700 dark:text-cyan-300 underline decoration-cyan-400/50 underline-offset-4">
              {attemptedPath}
            </code>
            . It may have been moved or removed.
          </p>
        </div>

        {/* Two Clean Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleGoBack}
            className="pm-glass-control inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#0e1b33] dark:text-slate-200 min-h-11 transition-transform cursor-pointer active:scale-[0.98]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0e1b33] hover:bg-[#162B45] dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs sm:text-sm font-bold shadow-sm min-h-11 transition-transform cursor-pointer active:scale-[0.98]"
          >
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      {/* Bottom Spacer */}
      <div className="h-8" aria-hidden="true" />
    </div>
  );
}

export default NotFound;