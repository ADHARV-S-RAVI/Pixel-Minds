import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Trophy,
  Rocket,
  Briefcase,
  BarChart2,
  Bookmark,
  FileText,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './GooeyNav.css';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const MAX_DROPS = 32;
const MAX_PILLS = 4;
const MARGIN = 40;

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

const parse = (value: string): number[] => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
  if (match) {
    const hex = match[1].length === 3 ? match[1].replace(/./g, digit => digit + digit) : match[1];
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).concat(1);
  }
  const rgba = /rgba?\(([^)]+)\)/i.exec(String(value));
  if (rgba) {
    const parts = rgba[1].split(',').map(part => parseFloat(part.trim()));
    return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
  }
  return [1, 1, 1, 1];
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const travelEase = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

const bezier = (a: number, b: number, c: number, d: number, t: number): number => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

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

const UNIFORMS = [
  'uSize',
  'uRatio',
  'uPills',
  'uDrops',
  'uTails',
  'uTints',
  'uCount',
  'uSmooth',
  'uPill',
  'uShadow'
] as const;

interface Pipeline {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  buffer: WebGLBuffer;
  position: number;
}

const build = (gl: WebGL2RenderingContext): Pipeline | null => {
  const program = gl.createProgram();
  if (!program) return null;
  const vert = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vert || !frag) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)]));
  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  return { program, uniforms, buffer, position: gl.getAttribLocation(program, 'aPosition') };
};

interface PillState {
  mass: number;
  scale: number;
  velocity: number;
  outgoing: number;
}

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
  state: 'waiting' | 'flying' | 'absorbing';
  tint: number[] | null;
  duration?: number;
  start?: number;
  path?: [number, number, number, number, number, number, number, number];
}

interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NavItemDef {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  isSemibold?: boolean;
  isExtraTop?: boolean;
}

const PRIMARY_ITEMS: NavItemDef[] = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/feed', label: 'Feed', icon: MessageSquare, exact: false },
  { to: '/opportunities', label: 'Opportunities', icon: Trophy, exact: false },
  { to: '/opportunities?cat=Hackathons', label: 'Hackathons', icon: Rocket, exact: false },
  { to: '/opportunities?cat=Internships', label: 'Internships', icon: Briefcase, exact: false },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart2, exact: false },
];

const SECONDARY_ITEMS: NavItemDef[] = [
  { to: '/opportunities?saved=true', label: 'Bookmarks', icon: Bookmark, exact: false, isSemibold: true },
  { to: '/profile?tab=applications', label: 'My Applications', icon: FileText, exact: false, isSemibold: true },
];

function getSidebarActiveIndex(items: NavItemDef[], pathname: string, search: string): number {
  const fullPath = pathname + search;

  // 1. Check exact match with search parameters (e.g. /opportunities?cat=Hackathons, /opportunities?saved=true)
  for (let i = 0; i < items.length; i++) {
    if (items[i].to.includes('?') && items[i].to === fullPath) {
      return i;
    }
  }

  // 2. Normal path matching
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.to.includes('?')) continue;

    if (item.exact) {
      if (pathname === item.to && !search) return i;
    } else {
      if (item.to === '/opportunities' && (search.includes('saved=true') || search.includes('cat='))) {
        continue;
      }
      if (pathname === item.to || pathname.startsWith(item.to + '/')) {
        return i;
      }
    }
  }

  if (pathname === '/opportunities') {
    const oppIdx = items.findIndex(item => item.to === '/opportunities');
    if (oppIdx !== -1) return oppIdx;
  }

  return -1;
}

export const SidebarGooeyNav: React.FC = () => {
  const location = useLocation();

  const allItems = useMemo<NavItemDef[]>(() => {
    // Admin console is strictly hidden from dashboard navigation
    return [...PRIMARY_ITEMS, ...SECONDARY_ITEMS];
  }, []);

  const activeIndex = useMemo(
    () => getSidebarActiveIndex(allItems, location.pathname, location.search),
    [allItems, location.pathname, location.search]
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<{ go: (index: number) => void; refresh: () => void } | null>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;

  const pillColor = isDark ? '#2563EB' : '#0B1628';
  const pillRgb = useMemo(() => parse(pillColor), [pillColor]);
  const tints = useMemo(
    () => (isDark ? ['#2563EB', '#38BDF8', '#1D4ED8'].map(parse) : ['#0B1628', '#11243D', '#162B45'].map(parse)),
    [isDark]
  );

  const settingsRef = useRef({
    animationTime: 580,
    particleCount: 14,
    timeVariance: 220,
    spread: 28,
    gooeyness: 0.48,
    wobble: 0.45,
    pillRgb,
    tints,
    shadow: 0.25
  });

  useEffect(() => {
    settingsRef.current.pillRgb = pillRgb;
    settingsRef.current.tints = tints;
    if (fallbackRef.current) {
      fallbackRef.current.style.background = pillColor;
    }
    engineRef.current?.refresh();
  }, [pillRgb, tints, pillColor]);

  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const list = listRef.current;
    const overlay = overlayRef.current;
    const fallback = fallbackRef.current;
    if (!stage || !canvas || !list || !overlay || !fallback) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    const pipeline = gl ? build(gl) : null;
    fallback.style.display = pipeline ? 'none' : 'block';
    canvas.style.display = pipeline ? 'block' : 'none';

    const view = { width: 0, height: 0 };
    let rects: RectBox[] = [];
    let target = -1;
    const pills = new Map<number, PillState>();
    const drops: DropState[] = [];
    const pillData = new Float32Array(MAX_PILLS * 4);
    const dropData = new Float32Array(MAX_DROPS * 4);
    const tailData = new Float32Array(MAX_DROPS * 2);
    const tintData = new Float32Array(MAX_DROPS * 3);
    let raf = 0;
    let last = 0;
    let disposed = false;

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      view.width = box.width;
      view.height = box.height;
      const outerWidth = box.width + MARGIN * 2;
      const outerHeight = box.height + MARGIN * 2;
      Object.assign(canvas.style, {
        left: `${-MARGIN}px`,
        top: `${-MARGIN}px`,
        width: `${outerWidth}px`,
        height: `${outerHeight}px`
      });
      const width = Math.max(1, Math.round(outerWidth * ratio));
      const height = Math.max(1, Math.round(outerHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const itemElements = Array.from(list.querySelectorAll<HTMLElement>('[data-gooey-index]'));
      rects = itemElements.map(item => {
        const rect = item.getBoundingClientRect();
        return { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
      });
    };

    const trace = (
      boxes: Array<{ cx: number; cy: number; hw: number; hh: number }>,
      blobs: Array<{ x: number; y: number; r: number; tx: number; ty: number; tint: number[] | null }>,
      smooth: number
    ): string => {
      let minY = view.height;
      let maxY = 0;
      for (const b of boxes) {
        minY = Math.min(minY, Math.floor(b.cy - b.hh - smooth));
        maxY = Math.max(maxY, Math.ceil(b.cy + b.hh + smooth));
      }
      for (const b of blobs) {
        minY = Math.min(minY, Math.floor(b.y - b.r - smooth));
        maxY = Math.max(maxY, Math.ceil(b.y + b.r + smooth));
      }
      minY = Math.max(0, minY);
      maxY = Math.min(view.height, maxY);
      if (minY >= maxY) return '';

      const field = (x: number, y: number): number => {
        let d = 1e5;
        const merge = (value: number) => {
          const h = clamp01(0.5 + (0.5 * (value - d)) / smooth);
          d = value + (d - value) * h - smooth * h * (1 - h);
        };
        for (const box of boxes) {
          const r = Math.min(Math.min(box.hw, box.hh), 16);
          const qx = Math.abs(x - box.cx) - box.hw + r;
          const qy = Math.abs(y - box.cy) - box.hh + r;
          merge(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
        }
        for (const blob of blobs) {
          const px = x - blob.x;
          const py = y - blob.y;
          const bx = -blob.tx;
          const by = -blob.ty;
          const span = bx * bx + by * by;
          const h = span > 0.0001 ? clamp01((px * bx + py * by) / span) : 0;
          const value = Math.hypot(px - bx * h, py - by * h) - blob.r;
          if (value > d + smooth) continue;
          merge(value);
        }
        return d;
      };

      const step = 3;
      const yStep = 2;
      const parts: string[] = [];
      for (let y = minY; y < maxY; y += yStep) {
        const cy = y + yStep / 2;
        let previous = field(0, cy);
        let start = previous < 0 ? 0 : null;
        for (let x = step; x <= view.width + step; x += step) {
          const value = field(Math.min(x, view.width), cy);
          if (previous < 0 !== value < 0) {
            const cross = x - step + (step * previous) / (previous - value);
            if (value < 0) start = cross;
            else if (start !== null) {
              parts.push(`M${start.toFixed(1)},${y}H${cross.toFixed(1)}V${y + yStep}H${start.toFixed(1)}Z`);
              start = null;
            }
          }
          previous = value;
        }
        if (start !== null) parts.push(`M${start.toFixed(1)},${y}H${view.width}V${y + yStep}H${start.toFixed(1)}Z`);
      }
      return parts.join('');
    };

    const pill = (index: number): PillState => {
      let p = pills.get(index);
      if (!p) {
        p = { mass: 0, scale: 0, velocity: 0, outgoing: 0 };
        pills.set(index, p);
      }
      return p;
    };

    const shape = (index: number, amount: number): RectBox | null => {
      const rect = rects[index];
      if (!rect || amount <= 0.002) return null;
      const h = rect.h * Math.min(1.08, 0.42 + 0.58 * Math.sqrt(Math.max(0, amount)));
      const w = Math.max(h, rect.w * Math.max(0, amount) ** 0.75);
      return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2, w, h };
    };

    const plan = (drop: DropState, index: number, now: number, fresh: boolean) => {
      const s = settingsRef.current;
      const rect = rects[index];
      if (!rect) return;
      const reach = Math.max(0, s.spread);
      const ex = rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.45;
      const ey = rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.2;
      const base = Math.max(0.15, s.animationTime / 1000);
      const variance = (Math.random() - 0.5) * (Math.max(0, s.timeVariance) / 1000);
      const duration = Math.max(0.15, base * (0.62 + Math.random() * 0.32) + variance * 0.6);
      const out = Math.random() * Math.PI * 2;
      const into = Math.random() * Math.PI * 2;
      const burst = reach * (0.7 + Math.random() * 0.6);
      const swing = reach * (0.55 + Math.random() * 0.55);
      const carry = Math.min(duration / 3, 0.12);
      drop.index = index;
      drop.start = now;
      drop.duration = duration;
      drop.path = [
        drop.x,
        drop.y,
        fresh ? drop.x + Math.cos(out) * burst * 1.6 : drop.x + drop.vx * carry,
        fresh ? drop.y + Math.sin(out) * burst * 1.6 : drop.y + drop.vy * carry,
        ex + Math.cos(into) * swing * 1.5,
        ey + Math.sin(into) * swing * 1.5,
        ex,
        ey
      ];
    };

    const emit = (from: number, to: number, now: number) => {
      const s = settingsRef.current;
      const source = pills.get(from);
      const rect = rects[from];
      if (!source || !rect || !rects[to]) return;
      const room = MAX_DROPS - drops.length;
      const count = Math.min(room, Math.max(1, Math.round(s.particleCount)));
      if (count <= 0) return;
      const windowTime = Math.max(0.12, s.animationTime / 1000) * 0.14;
      const mass = 1.0 / count;
      for (let i = 0; i < count; i++) {
        drops.push({
          x: rect.x + rect.w / 2 + (Math.random() - 0.5) * rect.w * 0.6,
          y: rect.y + rect.h / 2 + (Math.random() - 0.5) * rect.h * 0.3,
          vx: 0,
          vy: 0,
          mass,
          size: 0.8 + Math.random() * 0.4,
          given: 0,
          source: from,
          index: to,
          leave: now + Math.random() * windowTime * 1000,
          emerged: 0,
          absorbed: 0,
          state: 'waiting',
          tint: s.tints.length ? s.tints[Math.floor(Math.random() * s.tints.length)] : null
        });
      }
    };

    const render = () => {
      const s = settingsRef.current;
      const height = (target >= 0 && rects[target]) ? rects[target].h : (rects[0]?.h ?? 38);
      const smooth = height * (0.18 + 0.5 * clamp01(s.gooeyness));
      const boxes: Array<{ cx: number; cy: number; hw: number; hh: number }> = [];
      const blobs: Array<{ x: number; y: number; r: number; tx: number; ty: number; tint: number[] | null }> = [];

      for (const [index, state] of pills) {
        const box = shape(index, state.scale);
        if (box) boxes.push({ cx: box.x + box.w / 2, cy: box.y + box.h / 2, hw: box.w / 2, hh: box.h / 2 });
      }

      for (const drop of drops) {
        if (drop.state === 'waiting') continue;
        const radius = 0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);
        if (radius <= 0.05) continue;
        const speed = Math.hypot(drop.vx, drop.vy);
        const length = Math.min(radius * 1.1, speed * 0.018);
        blobs.push({
          x: drop.x,
          y: drop.y,
          r: radius,
          tx: speed > 0.01 ? (drop.vx / speed) * length : 0,
          ty: speed > 0.01 ? (drop.vy / speed) * length : 0,
          tint: drop.tint
        });
      }

      const settledPill = boxes.length === 1 && !blobs.length;
      if (settledPill) {
        const box = boxes[0];
        overlay.style.clipPath = `path('${pillPath(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2)}')`;
        overlay.style.visibility = 'visible';
      } else if (boxes.length === 0 && blobs.length === 0) {
        overlay.style.clipPath = "path('M0,0Z')";
        overlay.style.visibility = 'hidden';
      } else {
        const traced = trace(boxes, blobs, smooth);
        overlay.style.clipPath = `path('${traced || 'M0,0Z'}')`;
        overlay.style.visibility = 'visible';
      }

      if (!pipeline || !gl) {
        const box = target >= 0 ? shape(target, 1) : null;
        if (box) {
          fallback.style.transform = `translate(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px)`;
          fallback.style.width = `${box.w}px`;
          fallback.style.height = `${box.h}px`;
        }
        fallback.style.opacity = box ? '1' : '0';
        return;
      }

      let slot = 0;
      for (const box of boxes) {
        if (slot >= MAX_PILLS) break;
        pillData[slot * 4] = box.cx + MARGIN;
        pillData[slot * 4 + 1] = box.cy + MARGIN;
        pillData[slot * 4 + 2] = box.hw;
        pillData[slot * 4 + 3] = box.hh;
        slot += 1;
      }
      pillData.fill(0, slot * 4);

      let count = 0;
      for (const blob of blobs) {
        if (count >= MAX_DROPS) break;
        dropData[count * 4] = blob.x + MARGIN;
        dropData[count * 4 + 1] = blob.y + MARGIN;
        dropData[count * 4 + 2] = blob.r;
        dropData[count * 4 + 3] = 0;
        tailData[count * 2] = blob.tx;
        tailData[count * 2 + 1] = blob.ty;
        const tint = blob.tint || s.pillRgb;
        tintData[count * 3] = tint[0];
        tintData[count * 3 + 1] = tint[1];
        tintData[count * 3 + 2] = tint[2];
        count += 1;
      }

      const { program, uniforms, buffer, position } = pipeline;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (boxes.length === 0 && blobs.length === 0) {
        return;
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.uSize, view.width + MARGIN * 2, view.height + MARGIN * 2);
      gl.uniform1f(uniforms.uRatio, canvas.width / Math.max(1, view.width + MARGIN * 2));
      gl.uniform4fv(uniforms.uPills, pillData);
      gl.uniform4fv(uniforms.uDrops, dropData);
      gl.uniform2fv(uniforms.uTails, tailData);
      gl.uniform3fv(uniforms.uTints, tintData);
      gl.uniform1i(uniforms.uCount, count);
      gl.uniform1f(uniforms.uSmooth, smooth);
      gl.uniform3f(uniforms.uPill, s.pillRgb[0], s.pillRgb[1], s.pillRgb[2]);
      gl.uniform1f(uniforms.uShadow, s.shadow);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frame = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const emergeTime = 0.09;
      const absorbTime = 0.12;

      for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        if (drop.state === 'waiting') {
          if (now < drop.leave) continue;
          drop.state = 'flying';
          plan(drop, drop.index, now, true);
        }
        if (drop.state === 'flying' && drop.path && drop.duration && drop.start !== undefined) {
          drop.emerged = Math.min(1, drop.emerged + dt / emergeTime);
          const t = clamp01((now - drop.start) / 1000 / drop.duration);
          const eased = travelEase(t);
          const [x0, y0, x1, y1, x2, y2, x3, y3] = drop.path;
          const x = bezier(x0, x1, x2, x3, eased);
          const y = bezier(y0, y1, y2, y3, eased);
          if (dt > 0) {
            drop.vx = (x - drop.x) / dt;
            drop.vy = (y - drop.y) / dt;
          }
          drop.x = x;
          drop.y = y;
          if (t >= 1) drop.state = 'absorbing';
        }
        if (drop.state === 'absorbing') {
          const step = Math.min(1 - drop.absorbed, dt / absorbTime);
          drop.absorbed += step;
          drop.vx *= 0.8;
          drop.vy *= 0.8;
          const host = pill(drop.index);
          host.mass = Math.min(1, host.mass + drop.mass * step);
          if (drop.absorbed >= 1) drops.splice(i, 1);
        }
      }

      const omega = 24;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (const [index, state] of pills) {
        if (index === target) {
          const zeta = reduced ? 1 : 1 - 0.72 * clamp01(s.wobble);
          for (let n = 0; n < steps; n++) {
            state.velocity += (omega * omega * (state.mass - state.scale) - 2 * zeta * omega * state.velocity) * h;
            state.scale += state.velocity * h;
          }
        } else {
          // Dying old pill collapses to 0 with overdamped critical spring (never bounces back)
          const zeta = 1.2;
          for (let n = 0; n < steps; n++) {
            state.velocity += (omega * omega * (0 - state.scale) - 2 * zeta * omega * state.velocity) * h;
            state.scale += state.velocity * h;
          }
          if (state.scale <= 0.04) {
            pills.delete(index);
          }
        }
      }

      render();

      const host = pills.get(target);
      const resting =
        drops.length === 0 &&
        host &&
        Math.abs(1 - host.scale) < 0.005 &&
        Math.abs(host.velocity) < 0.004;

      if (!resting) {
        raf = requestAnimationFrame(frame);
      } else {
        // Animation finished: strictly clean up any remaining old pills
        for (const key of pills.keys()) {
          if (key !== target) pills.delete(key);
        }
        if (host) {
          host.mass = 1;
          host.scale = 1;
          host.velocity = 0;
        }
        render();
      }
    };

    const wake = () => {
      if (raf || disposed) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const settle = (index: number) => {
      pills.clear();
      drops.length = 0;
      target = index;
      if (index >= 0 && rects[index]) {
        const state = pill(index);
        state.mass = 1;
        state.scale = 1;
        state.velocity = 0;
      }
      render();
    };

    const go = (index: number, animate: boolean) => {
      if (index === target) return;
      if (index < 0) {
        target = -1;
        pills.clear();
        drops.length = 0;
        render();
        return;
      }
      if (!rects.length || !rects[index]) {
        measure();
      }
      if (!rects[index] || !animate || reduced || target < 0) {
        settle(index);
        return;
      }
      const now = performance.now();
      const oldKeys = [...pills.keys()];
      target = index;

      // Initialize target pill starting at 0
      const targetPill = pill(index);
      targetPill.mass = 0;
      targetPill.scale = 0;
      targetPill.velocity = 0;
      targetPill.outgoing = 0;

      // Re-route any existing in-flight drops to the new target
      for (const drop of drops) {
        drop.index = index;
        if (drop.state === 'flying') plan(drop, index, now, false);
        if (drop.state === 'absorbing') {
          drop.state = 'flying';
          drop.mass *= 1 - drop.absorbed;
          drop.absorbed = 0;
          plan(drop, index, now, false);
        }
      }

      // Emit from previous active pill(s) and set their mass to 0 so they immediately collapse into drops
      for (const from of oldKeys) {
        if (from !== index) {
          emit(from, index, now);
          const oldPill = pills.get(from);
          if (oldPill) {
            oldPill.mass = 0;
            oldPill.outgoing = 0;
          }
        }
      }
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (!drops.length) settle(target < 0 ? indexRef.current : target);
      else render();
    });
    resizeObserver.observe(stage);
    resizeObserver.observe(list);

    measure();
    settle(indexRef.current);
    document.fonts?.ready.then(() => {
      if (disposed) return;
      measure();
      if (!drops.length) settle(target);
    });

    engineRef.current = {
      go: idx => go(idx, true),
      refresh: () => {
        render();
        wake();
      }
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      if (gl && pipeline) {
        gl.deleteBuffer(pipeline.buffer);
        gl.deleteProgram(pipeline.program);
      }
      engineRef.current = null;
    };
  }, [allItems.length]);

  useEffect(() => {
    engineRef.current?.go(activeIndex);
  }, [activeIndex]);

  return (
    <nav className="sidebar-gooey-nav" aria-label="Sidebar Navigation">
      <div ref={stageRef} className="gooey-nav__stage">
        <canvas ref={canvasRef} className="gooey-nav__canvas" aria-hidden="true" />
        <span ref={fallbackRef} className="gooey-nav__fallback" aria-hidden="true" />

        {/* 1. Base Interactive Nav List */}
        <ul ref={listRef} className="gooey-nav__list">
          {PRIMARY_ITEMS.map((item, i) => (
            <li
              key={item.to}
              data-gooey-index={i}
              data-active={activeIndex === i ? '' : undefined}
              className="gooey-nav__item"
            >
              <Link
                to={item.to}
                aria-current={activeIndex === i ? 'page' : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition w-full select-none ${activeIndex === i ? 'text-white' : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10'}`}
              >
                <item.icon size={17} className="text-slate-700 dark:text-slate-300 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}

          <li key="divider" className="my-3 h-px bg-slate-300/60 dark:bg-slate-700/60 w-full" aria-hidden="true" />

          {SECONDARY_ITEMS.map((item, i) => {
            const globalIndex = PRIMARY_ITEMS.length + i;
            return (
              <li
                key={item.to}
                data-gooey-index={globalIndex}
                data-active={activeIndex === globalIndex ? '' : undefined}
                className="gooey-nav__item"
              >
                <Link
                  to={item.to}
                  aria-current={activeIndex === globalIndex ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition w-full select-none ${activeIndex === globalIndex ? 'text-white' : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10'}`}
                >
                  <item.icon size={17} className="text-slate-700 dark:text-slate-300 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}

          
        </ul>

        {/* 2. Overlay Clipped Active Indicator List */}
        <ul ref={overlayRef} className="gooey-nav__list gooey-nav__list--active" aria-hidden="true">
          {PRIMARY_ITEMS.map(item => (
            <li key={item.to} className="gooey-nav__item">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold w-full select-none text-white">
                <item.icon size={17} className="text-white shrink-0" />
                <span className="text-white">{item.label}</span>
              </div>
            </li>
          ))}

          <li key="divider" className="my-3 h-px invisible w-full" aria-hidden="true" />

          {SECONDARY_ITEMS.map(item => (
            <li key={item.to} className="gooey-nav__item">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold w-full select-none text-white">
                <item.icon size={17} className="text-white shrink-0" />
                <span className="text-white">{item.label}</span>
              </div>
            </li>
          ))}

          
        </ul>
      </div>
    </nav>
  );
};

