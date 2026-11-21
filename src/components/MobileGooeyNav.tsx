import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Plus, MessageSquare, User, Layers, Trophy } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AccountMenuContent } from './AccountMenu';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const MAX_DROPS = 20;
const MAX_PILLS = 2;
const MARGIN = 20;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${MAX_PILLS}];
uniform vec4 uDrops[${MAX_DROPS}];
uniform vec2 uTails[${MAX_DROPS}];
uniform vec3 uTints[${MAX_DROPS}];
uniform int uCount;
uniform float uSmooth;
uniform vec3 uPill;
uniform float uShadow;

out vec4 outColor;

float sdPill(vec2 p, vec4 box) {
  vec2 extent = max(box.zw, vec2(0.0));
  float r = min(min(extent.x, extent.y), 16.0);
  vec2 q = abs(p - box.xy) - extent + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec4 blend(vec4 a, vec4 b, float k) {
  float h = clamp(0.5 + 0.5 * (b.w - a.w) / k, 0.0, 1.0);
  return vec4(mix(b.rgb, a.rgb, h), mix(b.w, a.w, h) - k * h * (1.0 - h));
}

vec4 field(vec2 p) {
  vec4 shape = vec4(uPill, 1e5);
  for (int i = 0; i < ${MAX_PILLS}; i++) {
    vec4 pill = uPills[i];
    if (pill.z <= 0.0) continue;
    shape = blend(shape, vec4(uPill, sdPill(p, pill)), uSmooth);
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uCount) break;
    vec4 drop = uDrops[i];
    if (drop.z <= 0.0) continue;
    float d = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
    if (d > shape.w + uSmooth) continue;
    shape = blend(shape, vec4(uTints[i], d), uSmooth);
  }
  return shape;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
  vec4 shape = field(p);
  float d = shape.w;
  float aa = max(fwidth(d), 0.35);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);

  vec2 grad = vec2(dFdx(d), -dFdy(d));
  vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
  float rim = (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.3;
  vec3 fill = mix(shape.rgb, vec3(1.0), rim) * (1.0 - 0.06 * max(0.0, n.y) * (1.0 - smoothstep(0.0, 6.0, -d)));

  float lifted = field(p - vec2(0.0, 3.0)).w;
  float shadow = (1.0 - smoothstep(-3.0, 9.0, lifted)) * uShadow * (1.0 - body);

  vec4 color = vec4(0.0, 0.0, 0.0, shadow);
  color = vec4(fill * body, body) + color * (1.0 - body);
  outColor = color;
}
`;

// Helpers

const pillPath = (x: number, y: number, w: number, h: number): string => {
  if (w <= 0.5 || h <= 0.5) return '';
  const r = Math.min(Math.min(w, h) / 2, 16);
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

interface Pipeline {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const buildPipeline = (gl: WebGL2RenderingContext): Pipeline | null => {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of ['uSize', 'uRatio', 'uPills', 'uDrops', 'uTails', 'uTints', 'uCount', 'uSmooth', 'uPill', 'uShadow']) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
};

interface DropState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  size: number;
  given: number;
  source: number;
  index: number;
  leave: number;
  emerged: number;
  absorbed: number;
  state: 'waiting' | 'flying' | 'landing';
  tint: number[] | null;
  path?: number[];
  start?: number;
  duration?: number;
}

interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
}



export const MobileGooeyNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);

  // Responsive width & height measurement
  const [dimensions, setDimensions] = useState({ width: 390, height: 60 });

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const box = el.getBoundingClientRect();
      if (box.width > 0) {
        setDimensions({
          width: Math.round(box.width),
          height: 60
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Determine active slot index from current path
  const routeSlot = useMemo<number>(() => {
    const p = location.pathname.toLowerCase();
    if (p === '/' || p === '/home') return 0;
    if (p.startsWith('/opportunities') || p.startsWith('/explore') || p.startsWith('/bookmarks')) return 1;
    if (p.startsWith('/feed')) return 3;
    if (p.startsWith('/profile') || p.startsWith('/applications') || p.startsWith('/settings')) return 4;
    return -1; // e.g. /submit
  }, [location.pathname]);

  const isSubmitActive = location.pathname.startsWith('/submit');

  // SVG Cutout geometry: ultra-smooth round cradle curve hugging the circular '+' button
  const { width, height } = dimensions;
  const cx = width / 2;

  // Seamless G2/C2 continuous deep ultra-round circular bowl notch curve with generous clearance
  const notchPath = useMemo(() => {
    return `M 0,0 L ${cx - 58},0 C ${cx - 42},0 ${cx - 34},10 ${cx - 28},24 C ${cx - 18},40 ${cx + 18},40 ${cx + 28},24 C ${cx + 34},10 ${cx + 42},0 ${cx + 58},0 L ${width},0 L ${width},${height + 40} L 0,${height + 40} Z`;
  }, [cx, width, height]);

  // Imperative gooey trigger API to communicate between tab clicks and animation loop
  const gooeyControllerRef = useRef<{
    triggerTransition: (fromSlot: number, toSlot: number, onComplete: () => void) => void;
  } | null>(null);

  // Keep track of visual active slot
  const [displayedSlot, setDisplayedSlot] = useState<number>(routeSlot);
  const animatingRef = useRef(false);

  // Sync displayedSlot if route changed externally (e.g. browser back button)
  useEffect(() => {
    if (!animatingRef.current) {
      setDisplayedSlot(routeSlot);
    }
  }, [routeSlot]);

  // Liquid animation engine
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const list = listRef.current;
    const overlay = overlayRef.current;
    const fallback = fallbackRef.current;
    if (!stage || !canvas || !list || !overlay || !fallback) return;

    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      fallback.style.display = 'block';
    }
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    const pipeline = gl ? buildPipeline(gl) : null;

    fallback.style.display = pipeline ? 'none' : 'block';
    canvas.style.display = pipeline ? 'block' : 'none';

    let rects: Record<number, RectBox> = {};
    let currentSlot = routeSlot;
    let pillPos = { x: 0, y: 0, w: 0, h: 0 };
    let targetPos = { x: 0, y: 0, w: 0, h: 0 };
    const drops: DropState[] = [];
    let raf = 0;
    let last = 0;
    let disposed = false;

    // Transition tracking
    let transitionState: {
      from: number;
      to: number;
      startTime: number;
      duration: number;
      onComplete?: () => void;
      completed: boolean;
    } | null = null;

    const measureSlots = () => {
      const box = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const outerWidth = box.width + MARGIN * 2;
      const outerHeight = box.height + MARGIN * 2;

      Object.assign(canvas.style, {
        left: `${-MARGIN}px`,
        top: `${-MARGIN}px`,
        width: `${outerWidth}px`,
        height: `${outerHeight}px`
      });

      const w = Math.max(1, Math.round(outerWidth * ratio));
      const h = Math.max(1, Math.round(outerHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const elements = Array.from(list.querySelectorAll<HTMLElement>('[data-slot]'));
      rects = {};
      for (const el of elements) {
        const slot = Number(el.dataset.slot);
        const r = el.getBoundingClientRect();
        const pw = Math.min(r.width - 8, 52);
        const ph = 46;
        rects[slot] = {
          x: r.left - box.left + (r.width - pw) / 2,
          y: r.top - box.top + (r.height - ph) / 2,
          w: pw,
          h: ph
        };
      }

      if (currentSlot >= 0 && rects[currentSlot]) {
        targetPos = { ...rects[currentSlot] };
        if (pillPos.w === 0) pillPos = { ...targetPos };
      }
    };

    measureSlots();

    const emitDrops = (from: number, to: number, now: number) => {
      if (from < 0 || to < 0 || !rects[from] || !rects[to]) return;
      const rFrom = rects[from];
      const rTo = rects[to];
      const count = 12;
      const mass = 1.0 / count;
      for (let i = 0; i < count; i++) {
        drops.push({
          x: rFrom.x + rFrom.w / 2 + (Math.random() - 0.5) * 10,
          y: rFrom.y + rFrom.h / 2 + (Math.random() - 0.5) * 8,
          vx: (rTo.x - rFrom.x) * (2.8 + Math.random() * 0.8),
          vy: (Math.random() - 0.5) * 40,
          mass,
          size: 0.85 + Math.random() * 0.4,
          given: 0,
          source: from,
          index: to,
          leave: now + Math.random() * 50,
          emerged: 0,
          absorbed: 0,
          state: 'waiting',
          tint: [0.043, 0.082, 0.157]
        });
      }
    };

    let isRunning = false;
    const wake = () => {
      if (!isRunning && !disposed) {
        isRunning = true;
        last = performance.now();
        raf = requestAnimationFrame(update);
      }
    };

    gooeyControllerRef.current = {
      triggerTransition: (fromSlot: number, toSlot: number, onComplete: () => void) => {
        if (!rects[toSlot]) {
          measureSlots();
        }
        const now = performance.now();
        emitDrops(fromSlot, toSlot, now);
        transitionState = {
          from: fromSlot,
          to: toSlot,
          startTime: now,
          duration: 320, // 320ms liquid journey
          onComplete,
          completed: false
        };
        wake();
      }
    };

    const update = (now: number) => {
      if (disposed) return;
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      // Handle active transition
      if (transitionState) {
        const elapsed = now - transitionState.startTime;
        const progress = Math.min(elapsed / transitionState.duration, 1.0);

        // While liquid flies, source pill dissolves and target emerges as progress nears completion
        const fromRect = rects[transitionState.from];
        const toRect = rects[transitionState.to];

        if (fromRect && toRect) {
          // Liquid curve: origin stays until mid flight, then flows smoothly across to target
          const eased = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          pillPos.x = fromRect.x + (toRect.x - fromRect.x) * eased;
          pillPos.y = fromRect.y + (toRect.y - fromRect.y) * eased;
          pillPos.w = toRect.w;
          pillPos.h = toRect.h;
        }

        if (progress >= 1.0 && !transitionState.completed) {
          transitionState.completed = true;
          currentSlot = transitionState.to;
          if (rects[currentSlot]) {
            targetPos = { ...rects[currentSlot] };
            pillPos = { ...targetPos };
          }
          const cb = transitionState.onComplete;
          transitionState = null;
          if (cb) cb();
        }
      } else {
        // Idle tracking
        if (currentSlot >= 0 && rects[currentSlot]) {
          targetPos = { ...rects[currentSlot] };
          const lerp = Math.min(delta * 18, 1);
          pillPos.x += (targetPos.x - pillPos.x) * lerp;
          pillPos.y += (targetPos.y - pillPos.y) * lerp;
          pillPos.w += (targetPos.w - pillPos.w) * lerp;
          pillPos.h += (targetPos.h - pillPos.h) * lerp;
        }
      }

      // Update drops with liquid flight & absorption
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        if (d.state === 'waiting') {
          if (now >= d.leave) d.state = 'flying';
          continue;
        }
        d.emerged = Math.min(d.emerged + delta * 12, 1);
        d.x += d.vx * delta * 1.6;
        d.y += d.vy * delta * 1.6;
        
        const destRect = rects[d.index] || targetPos;
        const targetCenterX = destRect.x + destRect.w / 2;
        const targetCenterY = destRect.y + destRect.h / 2;
        
        d.vy += (targetCenterY - d.y) * delta * 18;

        const dist = Math.hypot(d.x - targetCenterX, d.y - targetCenterY);
        if (dist < 26) {
          d.state = 'landing';
          d.absorbed = Math.min(d.absorbed + delta * 14, 1);
          if (d.absorbed >= 0.95) {
            drops.splice(i, 1);
          }
        }
      }

      // Render WebGL
      if (pipeline && gl) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if (pillPos.w > 2) {
          gl.useProgram(pipeline.program);
          gl.uniform2f(pipeline.uniforms.uSize, canvas.width / ratio, canvas.height / ratio);
          gl.uniform1f(pipeline.uniforms.uRatio, ratio);
          gl.uniform1f(pipeline.uniforms.uSmooth, 12);
          gl.uniform1f(pipeline.uniforms.uShadow, 0.28);
          // Deep dark liquid pill
          gl.uniform3f(pipeline.uniforms.uPill, 0.043, 0.082, 0.157);

          const pillsArr = new Float32Array(MAX_PILLS * 4);
          pillsArr[0] = pillPos.x + pillPos.w / 2 + MARGIN;
          pillsArr[1] = pillPos.y + pillPos.h / 2 + MARGIN;
          pillsArr[2] = pillPos.w / 2;
          pillsArr[3] = pillPos.h / 2;
          gl.uniform4fv(pipeline.uniforms.uPills, pillsArr);

          const dropsArr = new Float32Array(MAX_DROPS * 4);
          const tailsArr = new Float32Array(MAX_DROPS * 2);
          const tintsArr = new Float32Array(MAX_DROPS * 3);
          let count = 0;
          for (let i = 0; i < drops.length && i < MAX_DROPS; i++) {
            const drop = drops[i];
            if (drop.state === 'waiting') continue;
            dropsArr[count * 4] = drop.x + MARGIN;
            dropsArr[count * 4 + 1] = drop.y + MARGIN;
            dropsArr[count * 4 + 2] = 5.5 * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
            dropsArr[count * 4 + 3] = 1;
            tailsArr[count * 2] = drop.vx * 0.012;
            tailsArr[count * 2 + 1] = drop.vy * 0.012;
            tintsArr[count * 3] = 0.043;
            tintsArr[count * 3 + 1] = 0.082;
            tintsArr[count * 3 + 2] = 0.157;
            count++;
          }
          gl.uniform1i(pipeline.uniforms.uCount, count);
          gl.uniform4fv(pipeline.uniforms.uDrops, dropsArr);
          gl.uniform2fv(pipeline.uniforms.uTails, tailsArr);
          gl.uniform3fv(pipeline.uniforms.uTints, tintsArr);

          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }

      // Update overlay clip-path strictly matching liquid pill
      if (pillPos.w > 2) {
        const p = pillPath(pillPos.x, pillPos.y, pillPos.w, pillPos.h);
        overlay.style.clipPath = `path('${p}')`;
        (overlay.style as any).webkitClipPath = `path('${p}')`;
        overlay.style.visibility = 'visible';
      } else {
        overlay.style.visibility = 'hidden';
      }

      // Fallback styling for non-WebGL
      if (!pipeline && fallback) {
        if (pillPos.w > 2) {
          fallback.style.display = 'block';
          fallback.style.transform = `translate(${Math.round(pillPos.x)}px, ${Math.round(pillPos.y)}px)`;
          fallback.style.width = `${Math.round(pillPos.w)}px`;
          fallback.style.height = `${Math.round(pillPos.h)}px`;
        } else {
          fallback.style.display = 'none';
        }
      }

      // Check if animation has completely settled: if so, sleep RAF loop to save mobile GPU/CPU
      const isSettled =
        !transitionState &&
        drops.length === 0 &&
        (currentSlot < 0 || !rects[currentSlot] || (
          Math.abs(pillPos.x - targetPos.x) < 0.2 &&
          Math.abs(pillPos.y - targetPos.y) < 0.2 &&
          Math.abs(pillPos.w - targetPos.w) < 0.2
        ));

      if (isSettled) {
        if (currentSlot >= 0 && rects[currentSlot]) {
          pillPos = { ...rects[currentSlot] };
        }
        isRunning = false;
        return;
      }

      raf = requestAnimationFrame(update);
    };

    wake();

    return () => {
      disposed = true;
      gooeyControllerRef.current = null;
      cancelAnimationFrame(raf);
    };
  }, [width, height, isDark]);

  // Tab switch handler: Plays gooey animation FIRST, then navigates to target tab upon arrival
  const triggerNavigation = (targetSlot: number, targetPath: string) => {
    if (animatingRef.current) return;
    if (targetSlot === displayedSlot && location.pathname === targetPath) return;

    if (!gooeyControllerRef.current || displayedSlot < 0 || targetSlot === displayedSlot) {
      setDisplayedSlot(targetSlot);
      navigate(targetPath);
      return;
    }

    animatingRef.current = true;
    gooeyControllerRef.current.triggerTransition(displayedSlot, targetSlot, () => {
      animatingRef.current = false;
      setDisplayedSlot(targetSlot);
      navigate(targetPath);
    });
  };

  const handleTabClick = (e: React.MouseEvent, targetSlot: number, targetPath: string) => {
    e.preventDefault();
    triggerNavigation(targetSlot, targetPath);
  };

  // Contextual action menus
  const [exploreMenuOpen, setExploreMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setExploreMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Explore gesture references
  const singleTapTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const explorePointerDownRef = useRef(false);
  const exploreLongPressTriggeredRef = useRef(false);
  const explorePointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastExploreTapTimeRef = useRef(0);

  // Profile gesture references
  const profileLongPressTimerRef = useRef<number | null>(null);
  const profilePointerDownRef = useRef(false);
  const profileLongPressTriggeredRef = useRef(false);
  const profilePointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Cleanup gesture timers on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
      if (profileLongPressTimerRef.current !== null) {
        clearTimeout(profileLongPressTimerRef.current);
      }
    };
  }, []);

  const handleExplorePointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary && e.button !== 0) return;
    explorePointerDownRef.current = true;
    exploreLongPressTriggeredRef.current = false;
    explorePointerStartRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      if (!explorePointerDownRef.current) return;
      exploreLongPressTriggeredRef.current = true;
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastExploreTapTimeRef.current = 0;
      try {
        navigator.vibrate?.(40);
      } catch {}
      setExploreMenuOpen(true);
    }, 500);
  };

  const handleExplorePointerMove = (e: React.PointerEvent) => {
    if (!explorePointerDownRef.current || !explorePointerStartRef.current) return;
    const dist = Math.hypot(
      e.clientX - explorePointerStartRef.current.x,
      e.clientY - explorePointerStartRef.current.y
    );
    if (dist > 10) {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      explorePointerDownRef.current = false;
    }
  };

  const handleExplorePointerUp = () => {
    if (!explorePointerDownRef.current) return;
    explorePointerDownRef.current = false;

    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (exploreLongPressTriggeredRef.current) {
      return;
    }

    const now = performance.now();
    const timeSinceLastTap = now - lastExploreTapTimeRef.current;

    // Double tap threshold: 280ms
    if (timeSinceLastTap < 280 && singleTapTimerRef.current !== null) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
      lastExploreTapTimeRef.current = 0;
      // Double tap: navigate directly to Opportunities without flashing Story Stack
      triggerNavigation(1, '/opportunities');
    } else {
      lastExploreTapTimeRef.current = now;
      singleTapTimerRef.current = window.setTimeout(() => {
        singleTapTimerRef.current = null;
        lastExploreTapTimeRef.current = 0;
        // Single tap: navigate to Story Stack
        triggerNavigation(1, '/explore');
      }, 280);
    }
  };

  const handleExplorePointerCancel = () => {
    explorePointerDownRef.current = false;
    exploreLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (singleTapTimerRef.current !== null) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    lastExploreTapTimeRef.current = 0;
  };

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.detail === 0) {
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      triggerNavigation(1, '/explore');
    }
  };

  const handleExploreKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      triggerNavigation(1, '/explore');
    }
  };

  // Profile gesture handlers
  const handleProfilePointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary && e.button !== 0) return;
    profilePointerDownRef.current = true;
    profileLongPressTriggeredRef.current = false;
    profilePointerStartRef.current = { x: e.clientX, y: e.clientY };

    if (profileLongPressTimerRef.current !== null) {
      clearTimeout(profileLongPressTimerRef.current);
    }
    profileLongPressTimerRef.current = window.setTimeout(() => {
      if (!profilePointerDownRef.current) return;
      profileLongPressTriggeredRef.current = true;
      try {
        navigator.vibrate?.(40);
      } catch {}
      setProfileMenuOpen(true);
    }, 500);
  };

  const handleProfilePointerMove = (e: React.PointerEvent) => {
    if (!profilePointerDownRef.current || !profilePointerStartRef.current) return;
    const dist = Math.hypot(
      e.clientX - profilePointerStartRef.current.x,
      e.clientY - profilePointerStartRef.current.y
    );
    if (dist > 10) {
      if (profileLongPressTimerRef.current !== null) {
        clearTimeout(profileLongPressTimerRef.current);
        profileLongPressTimerRef.current = null;
      }
      profilePointerDownRef.current = false;
    }
  };

  const handleProfilePointerUp = () => {
    if (!profilePointerDownRef.current) return;
    profilePointerDownRef.current = false;

    if (profileLongPressTimerRef.current !== null) {
      clearTimeout(profileLongPressTimerRef.current);
      profileLongPressTimerRef.current = null;
    }

    if (profileLongPressTriggeredRef.current) {
      return;
    }

    // Single tap on Profile: Navigate directly to /profile
    triggerNavigation(4, '/profile');
  };

  const handleProfilePointerCancel = () => {
    profilePointerDownRef.current = false;
    profileLongPressTriggeredRef.current = false;
    if (profileLongPressTimerRef.current !== null) {
      clearTimeout(profileLongPressTimerRef.current);
      profileLongPressTimerRef.current = null;
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.detail === 0) {
      triggerNavigation(4, '/profile');
    }
  };

  const handleProfileKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerNavigation(4, '/profile');
    }
  };

  return (
    <nav
      ref={containerRef}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden pointer-events-auto select-none"
    >
      {/* 1. Transparent Concave Cradle Glass Surface */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          filter: isDark
            ? 'drop-shadow(0 -6px 20px rgba(0, 0, 0, 0.75)) drop-shadow(0 -1px 3px rgba(0, 0, 0, 0.5))'
            : 'drop-shadow(0 -8px 24px rgba(15, 28, 56, 0.16)) drop-shadow(0 -1px 2px rgba(15, 28, 56, 0.08))'
        }}
      >
        {/* Real Concave Notch Backdrop Blur Surface */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `path('${notchPath}')`,
            WebkitClipPath: `path('${notchPath}')`,
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            background: isDark
              ? 'linear-gradient(180deg, rgba(22, 28, 42, 0.90) 0%, rgba(10, 13, 20, 0.96) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 248, 255, 0.95) 100%)'
          }}
        />
      </div>

      {/* 2. Elevated Floating Create '+' with a Small Sleek Circle */}
      <Link
        to="/submit"
        aria-label="Create Opportunity"
        className="group focus:outline-none flex items-center justify-center cursor-pointer select-none"
        style={{
          position: 'absolute',
          left: `${cx}px`,
          transform: 'translateX(-50%)',
          top: '-13px',
          zIndex: 50
        }}
      >
        <div
          className={`grid h-[42px] w-[42px] place-items-center rounded-full transition-all duration-200 group-hover:scale-110 group-active:scale-95 shadow-lg ${
            isSubmitActive
              ? 'bg-blue-600 text-white shadow-blue-500/40 border border-white/40 ring-2 ring-white/60 dark:ring-slate-800'
              : 'bg-[#0B1528] text-white shadow-black/30 hover:bg-[#14233e] border border-white/25 ring-2 ring-white/80 dark:ring-slate-800/80'
          }`}
        >
          <Plus size={22} strokeWidth={2.5} className="text-white" />
        </div>
      </Link>

      {/* 3. Stage Container with WebGL Gooey Canvas & Item Slots */}
      <div ref={stageRef} className="relative w-full h-[60px]">
        {/* WebGL Droplets and Metaball Canvas */}
        <canvas ref={canvasRef} className="absolute pointer-events-none z-10" />

        {/* Fallback CSS pill for reduced-motion or non-WebGL */}
        <span
          ref={fallbackRef}
          className="absolute hidden pointer-events-none z-10 bg-[#0B1528] rounded-[18px] shadow-md shadow-black/20"
        />

        {/* Inactive Base Destination Layer */}
        <ul ref={listRef} className="relative z-20 grid grid-cols-5 w-full h-full m-0 p-0 list-none">
          {/* Slot 0: Home */}
          <li data-slot={0} className="flex">
            <a
              href="/"
              onClick={(e) => handleTabClick(e, 0, '/')}
              className="flex flex-col items-center justify-center w-full h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <Home size={19} className="shrink-0" />
              <span className="text-[10px] font-semibold mt-1 tracking-tight leading-none">Home</span>
            </a>
          </li>

          {/* Slot 1: Explore with Multi-Gesture System (Single tap: Stories, Double tap: Opportunities, Long press: Choice Menu) */}
          <li data-slot={1} className="flex">
            <button
              type="button"
              onPointerDown={handleExplorePointerDown}
              onPointerMove={handleExplorePointerMove}
              onPointerUp={handleExplorePointerUp}
              onPointerCancel={handleExplorePointerCancel}
              onClick={handleExploreClick}
              onKeyDown={handleExploreKeyDown}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Explore"
              aria-haspopup="menu"
              aria-expanded={exploreMenuOpen}
              style={{
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
              className="flex flex-col items-center justify-center w-full h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer focus:outline-none"
            >
              <Compass size={19} className="shrink-0" />
              <span className="text-[10px] font-semibold mt-1 tracking-tight leading-none">Explore</span>
            </button>
          </li>

          {/* Slot 2: Center Spacer for Elevated Create Button (word 'Create' removed) */}
          <li className="flex items-center justify-center pointer-events-none" />

          {/* Slot 3: Feed */}
          <li data-slot={3} className="flex">
            <a
              href="/feed"
              onClick={(e) => handleTabClick(e, 3, '/feed')}
              className="flex flex-col items-center justify-center w-full h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <MessageSquare size={19} className="shrink-0" />
              <span className="text-[10px] font-semibold mt-1 tracking-tight leading-none">Feed</span>
            </a>
          </li>

          {/* Slot 4: Profile with Long-Press Drop-Up Menu */}
          <li data-slot={4} className="flex">
            <button
              type="button"
              onPointerDown={handleProfilePointerDown}
              onPointerMove={handleProfilePointerMove}
              onPointerUp={handleProfilePointerUp}
              onPointerCancel={handleProfilePointerCancel}
              onClick={handleProfileClick}
              onKeyDown={handleProfileKeyDown}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Profile"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              style={{
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
              className="flex flex-col items-center justify-center w-full h-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer focus:outline-none"
            >
              <User size={19} className="shrink-0" />
              <span className="text-[10px] font-semibold mt-1 tracking-tight leading-none">Profile</span>
            </button>
          </li>
        </ul>

        {/* Active Overlay Layer: Clipped by Liquid Indicator with High-Contrast White Text */}
        <ul
          ref={overlayRef}
          aria-hidden="true"
          className="absolute inset-0 z-30 grid grid-cols-5 w-full h-full m-0 p-0 list-none pointer-events-none text-white"
          style={{ visibility: 'hidden' }}
        >
          {/* Slot 0: Home */}
          <li className="flex flex-col items-center justify-center w-full h-full text-white">
            <Home size={19} className="text-white shrink-0" />
            <span className="text-[10px] font-bold text-white mt-1 tracking-tight leading-none">Home</span>
          </li>

          {/* Slot 1: Explore */}
          <li className="flex flex-col items-center justify-center w-full h-full text-white">
            <Compass size={19} className="text-white shrink-0" />
            <span className="text-[10px] font-bold text-white mt-1 tracking-tight leading-none">Explore</span>
          </li>

          {/* Slot 2: Center Spacer */}
          <li className="flex items-center justify-center" />

          {/* Slot 3: Feed */}
          <li className="flex flex-col items-center justify-center w-full h-full text-white">
            <MessageSquare size={19} className="text-white shrink-0" />
            <span className="text-[10px] font-bold text-white mt-1 tracking-tight leading-none">Feed</span>
          </li>

          {/* Slot 4: Profile */}
          <li className="flex flex-col items-center justify-center w-full h-full text-white">
            <User size={19} className="text-white shrink-0" />
            <span className="text-[10px] font-bold text-white mt-1 tracking-tight leading-none">Profile</span>
          </li>
        </ul>
      </div>

      {/* Explore Long-Press Contextual Action Menu */}
      {exploreMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden pointer-events-auto">
            <div
              className="absolute inset-0 bg-black/20 transition-opacity cursor-pointer"
              onClick={() => setExploreMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              aria-label="Explore actions"
              style={{
                left: `${Math.round(width * 0.3)}px`,
                transform: 'translateX(-50%)',
              }}
              className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-50 w-52 max-w-[calc(100vw-32px)] rounded-2xl border border-white/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#0f1d33]/95 backdrop-blur-2xl p-2 shadow-2xl text-[#0e1b33] dark:text-white animate-in fade-in slide-in-from-bottom-2 duration-200 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setExploreMenuOpen(false);
                  triggerNavigation(1, '/explore');
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer min-h-[38px] active:scale-[0.98]"
              >
                <Layers size={16} className="text-sky-500 shrink-0" />
                <span className="font-bold">Explore Stories</span>
              </button>

              <div className="my-1 border-t border-slate-200/60 dark:border-slate-800/60" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setExploreMenuOpen(false);
                  triggerNavigation(1, '/opportunities');
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer min-h-[38px] active:scale-[0.98]"
              >
                <Trophy size={16} className="text-amber-500 shrink-0" />
                <span className="font-bold">Opportunities</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Profile Long-Press Drop-Up Menu */}
      {profileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden pointer-events-auto">
            <div
              className="absolute inset-0 bg-black/20 transition-opacity cursor-pointer"
              onClick={() => setProfileMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              aria-label="Profile menu"
              className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] right-2 sm:right-3 z-50 w-72 max-w-[calc(100vw-20px)] rounded-3xl border border-white/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#0f1d33]/95 backdrop-blur-2xl p-3 shadow-2xl text-[#0e1b33] dark:text-white animate-in fade-in slide-in-from-bottom-3 duration-200 max-h-[calc(100vh-80px-env(safe-area-inset-bottom,0px))] overflow-y-auto select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <AccountMenuContent
                onClose={() => setProfileMenuOpen(false)}
                showCloseButton={false}
              />
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};
