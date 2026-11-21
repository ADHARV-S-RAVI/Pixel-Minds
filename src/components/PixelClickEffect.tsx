import React, { useEffect, useRef } from 'react';

const BRAND_COLORS = [
  '#00d2ff', // Electric cyan
  '#38bdf8', // Sky cyan
  '#2563eb', // Brand blue
  '#60a5fa', // Soft blue
  '#a855f7', // Electric purple
  '#8b5cf6', // Brand violet
  '#ffffff', // White sparkle
] as const;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
}

const POOL_SIZE = 120;

export const PixelClickEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener?.('change', onMotionChange);

    // Pre-allocated particle pool (zero garbage collection overhead)
    const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#38bdf8',
      alpha: 0,
      decay: 0.03,
      gravity: 0.14,
    }));
    let poolCursor = 0;

    // High-DPI canvas sizing
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let rafId = 0;
    let isRunning = false;
    let lastTime = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 2); // Normalize to 60fps
      lastTime = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let anyAlive = false;

      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt; // Crisp downward pixel gravity
        p.vx *= Math.pow(0.94, dt); // Smooth air drag
        p.alpha -= p.decay * dt;

        if (p.alpha <= 0.02) {
          p.active = false;
          continue;
        }

        anyAlive = true;

        // Shrink slightly near the end of life
        const scale = p.alpha < 0.35 ? 0.65 : 1;
        const drawSize = Math.max(2, Math.round(p.size * scale));

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        // Snap to integer pixels for razor-sharp edges
        ctx.fillRect(Math.round(p.x - drawSize * 0.5), Math.round(p.y - drawSize * 0.5), drawSize, drawSize);
      }

      ctx.globalAlpha = 1;

      if (anyAlive) {
        rafId = requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    };

    const wakeLoop = () => {
      if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const spawnBurst = (x: number, y: number, combo: number) => {
      const count = combo === 1 ? 4 : combo === 2 ? 6 : 8;
      const speedBoost = combo === 1 ? 1 : combo === 2 ? 1.25 : 1.5;

      for (let i = 0; i < count; i++) {
        const p = pool[poolCursor];
        poolCursor = (poolCursor + 1) % POOL_SIZE;

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const speed = (1.6 + Math.random() * 2.4) * speedBoost;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        // Slight upward pop before gravity pulls pixels down
        p.vy = Math.sin(angle) * speed - (1.1 + combo * 0.35);
        p.size = combo >= 3 && Math.random() > 0.65 ? 5 : Math.random() > 0.45 ? 4 : 3;
        p.color = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
        p.alpha = 1;
        p.decay = 0.026 + Math.random() * 0.014;
        p.gravity = 0.13 + Math.random() * 0.05;
      }

      wakeLoop();
    };

    // Lightweight gesture tracking (ignores drags & touch scrolls)
    let downX = 0;
    let downY = 0;
    let moved = false;
    let downIgnored = false;
    let lastClickTime = 0;
    let combo = 1;

    const isInteractiveOrText = (target: Element | null): boolean => {
      if (!target) return false;

      // 1. Buttons, links, form elements, and interactive roles
      if (
        target.closest(
          'button, a, input, textarea, select, label, summary, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], [role="option"], [data-clickable]'
        )
      ) {
        return true;
      }

      // 2. Cursor pointer check (covers styled clickable elements)
      try {
        const style = window.getComputedStyle(target);
        if (style.cursor === 'pointer') return true;
        const parentStyle = target.parentElement ? window.getComputedStyle(target.parentElement) : null;
        if (parentStyle && parentStyle.cursor === 'pointer') return true;
      } catch {}

      // 3. Text containers and typography elements
      if (
        target.closest(
          'h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, article, ' +
          'span, strong, em, b, i, u, s, small, code, pre, kbd, mark, sub, sup, time, ' +
          'li, dt, dd, th, td'
        )
      ) {
        return true;
      }

      // 4. Element directly containing non-empty text content
      for (let i = 0; i < target.childNodes.length; i++) {
        const node = target.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0) {
          return true;
        }
      }

      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
      moved = false;

      const target = document.elementFromPoint(e.clientX, e.clientY) || (e.target as Element | null);
      downIgnored = isInteractiveOrText(target);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (moved) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (dx * dx + dy * dy > 36) moved = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (prefersReducedMotion || moved || downIgnored) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.clientX === 0 && e.clientY === 0) return;

      const upTarget = document.elementFromPoint(e.clientX, e.clientY) || (e.target as Element | null);
      if (isInteractiveOrText(upTarget)) return;

      const now = performance.now();
      combo = now - lastClickTime < 380 ? Math.min(combo + 1, 3) : 1;
      lastClickTime = now;

      spawnBurst(e.clientX, e.clientY, combo);
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      mediaQuery.removeEventListener?.('change', onMotionChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('pointermove', onPointerMove, { capture: true } as EventListenerOptions);
      window.removeEventListener('pointerup', onPointerUp, { capture: true } as EventListenerOptions);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[99999] h-full w-full select-none"
    />
  );
};