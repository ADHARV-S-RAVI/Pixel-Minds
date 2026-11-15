import React from 'react';

/* ── Realistic Premium 3D Touchscreen Gesture Hand ── */
const PremiumHandSVG: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 135"
    width="64"
    height="86"
    style={{
      display: 'block',
      filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.42)) drop-shadow(0 2px 5px rgba(0,0,0,0.22))',
      ...style,
    }}
    aria-hidden="true"
  >
    <defs>
      {/* ── Volumetric Skin Gradients with Natural Subsurface Lighting ── */}

      {/* Palm volume — contoured dorsal lighting */}
      <linearGradient id="pm-palm-base" x1="15%" y1="20%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#FEE0C8" />
        <stop offset="35%" stopColor="#F9BE93" />
        <stop offset="70%" stopColor="#EE9B68" />
        <stop offset="100%" stopColor="#C96B36" />
      </linearGradient>

      {/* Thenar eminence (thumb base muscle pad) */}
      <radialGradient id="pm-thenar-pad" cx="38%" cy="42%" r="58%">
        <stop offset="0%" stopColor="#FFE8D6" />
        <stop offset="45%" stopColor="#F9BE93" />
        <stop offset="85%" stopColor="#E38952" />
        <stop offset="100%" stopColor="#BC6128" />
      </radialGradient>

      {/* Extended Index Finger — 3D Cylindrical lighting with natural skin tone */}
      <linearGradient id="pm-index-shaft" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F5B284" />
        <stop offset="22%" stopColor="#FFEAD8" />
        <stop offset="55%" stopColor="#F9BD92" />
        <stop offset="85%" stopColor="#E99763" />
        <stop offset="100%" stopColor="#BD602A" />
      </linearGradient>

      {/* Fingertip tactile cushion — spherical soft depth */}
      <radialGradient id="pm-fingertip-pad" cx="44%" cy="32%" r="56%">
        <stop offset="0%" stopColor="#FFF4EC" />
        <stop offset="40%" stopColor="#FDBE94" />
        <stop offset="80%" stopColor="#ED915A" />
        <stop offset="100%" stopColor="#C5632A" />
      </radialGradient>

      {/* Fingernail — realistic pearlescent keratine glint */}
      <linearGradient id="pm-nail-body" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#FDE3D5" />
        <stop offset="85%" stopColor="#F7C4AB" />
        <stop offset="100%" stopColor="#EAA484" />
      </linearGradient>

      {/* Folded fingers cascade (Middle, Ring, Pinky) */}
      <linearGradient id="pm-middle-finger" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#FED8BE" />
        <stop offset="45%" stopColor="#F4A775" />
        <stop offset="85%" stopColor="#D47740" />
        <stop offset="100%" stopColor="#A84C1C" />
      </linearGradient>

      <linearGradient id="pm-ring-finger" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#FDCFA9" />
        <stop offset="50%" stopColor="#EE9861" />
        <stop offset="88%" stopColor="#C5652D" />
        <stop offset="100%" stopColor="#9A4016" />
      </linearGradient>

      <linearGradient id="pm-pinky-finger" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#FBC396" />
        <stop offset="55%" stopColor="#E48850" />
        <stop offset="100%" stopColor="#8E3510" />
      </linearGradient>

      {/* Thumb contour */}
      <linearGradient id="pm-thumb-shaft" x1="20%" y1="10%" x2="80%" y2="90%">
        <stop offset="0%" stopColor="#FEDECA" />
        <stop offset="50%" stopColor="#F7B283" />
        <stop offset="85%" stopColor="#D97C43" />
        <stop offset="100%" stopColor="#A64B19" />
      </linearGradient>

      {/* Forearm / wrist soft fade */}
      <linearGradient id="pm-wrist-fade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#E38952" />
        <stop offset="65%" stopColor="#C96B36" />
        <stop offset="100%" stopColor="#C96B36" stopOpacity="0" />
      </linearGradient>
    </defs>

    <g>
      {/* ── 1. WRIST / FOREARM BASE (seamless downward fade) ── */}
      <path
        d="M 28 106 C 27 116, 29 126, 31 135 L 67 135 C 69 126, 71 116, 70 106 Z"
        fill="url(#pm-wrist-fade)"
      />

      {/* ── 2. PALM VOLUME & DORSAL CONTOURS ── */}
      <path
        d="M 23 68 C 17 76, 15 90, 20 102 C 25 112, 38 114, 52 113 C 66 112, 78 106, 78 94 C 78 82, 76 74, 72 67 C 66 60, 30 58, 23 68 Z"
        fill="url(#pm-palm-base)"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="0.75"
      />

      {/* ── 3. THENAR EMINENCE (Thumb base cushion) ── */}
      <path
        d="M 21 72 C 12 79, 10 93, 17 101 C 24 107, 33 104, 36 96 Z"
        fill="url(#pm-thenar-pad)"
        opacity="0.95"
      />

      {/* ── 4. THUMB (Natural resting opposition across lower palm) ── */}
      <g>
        <path
          d="M 16 78 C 10 82, 9 92, 13 97 C 18 101, 25 98, 26 90 C 27 82, 22 75, 16 78 Z"
          fill="url(#pm-thumb-shaft)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.6"
        />
        {/* Thumb nail reflection */}
        <ellipse
          cx="15"
          cy="91"
          rx="2.4"
          ry="3.6"
          fill="#FFF"
          opacity="0.4"
          transform="rotate(-18 15 91)"
        />
      </g>

      {/* ── 5. FOLDED FINGERS CASCADE (Natural anatomical curling) ── */}
      {/* Pinky (outermost & lowest) */}
      <g>
        <rect
          x="65"
          y="70"
          width="12"
          height="19"
          rx="6"
          fill="url(#pm-pinky-finger)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.5"
        />
        <path
          d="M 66 80 Q 71 83 76 80"
          stroke="#7A2D0B"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* Soft pinky nail glint */}
        <ellipse cx="71" cy="74" rx="2.2" ry="1.6" fill="#FFF" opacity="0.3" />
      </g>

      {/* Ring Finger (middle cascade) */}
      <g>
        {/* Inter-finger shadow */}
        <path d="M 64 68 L 64 85" stroke="#682406" strokeWidth="1.2" opacity="0.3" />
        <rect
          x="51"
          y="62"
          width="14"
          height="23"
          rx="7"
          fill="url(#pm-ring-finger)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.5"
        />
        <path
          d="M 52 75 Q 58 78 64 75"
          stroke="#7A2D0B"
          strokeWidth="0.85"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
        {/* Ring finger nail glint */}
        <ellipse cx="58" cy="66.5" rx="2.8" ry="1.9" fill="#FFF" opacity="0.35" />
      </g>

      {/* Middle Finger (longest folded knuckle) */}
      <g>
        {/* Inter-finger shadow */}
        <path d="M 50 60 L 50 82" stroke="#682406" strokeWidth="1.2" opacity="0.35" />
        <rect
          x="37"
          y="56"
          width="15.5"
          height="26"
          rx="7.5"
          fill="url(#pm-middle-finger)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.5"
        />
        <path
          d="M 38 71 Q 45 74 52 71"
          stroke="#7A2D0B"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
        {/* Middle finger nail glint */}
        <ellipse cx="45" cy="61" rx="3.2" ry="2.2" fill="#FFF" opacity="0.4" />
      </g>

      {/* ── 6. PALM INTERACTION & SHADOW CREASES ── */}
      <path
        d="M 27 75 Q 43 83 61 76"
        stroke="#80330D"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
      <path
        d="M 28 86 Q 47 92 63 85"
        stroke="#80330D"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.25"
      />

      {/* ── 7. EXTENDED INDEX FINGER (The elegant touch pointer) ── */}
      <g>
        {/* Natural tapered shaft with ergonomic contour */}
        <path
          d="M 23 18 C 23 10, 37 10, 37 18 L 38 68 C 38 74, 23 74, 23 68 Z"
          fill="url(#pm-index-shaft)"
          stroke="rgba(255,255,255,0.36)"
          strokeWidth="0.75"
        />

        {/* Fingertip tactile cushion bulb */}
        <ellipse cx="30" cy="15" rx="7.2" ry="7.6" fill="url(#pm-fingertip-pad)" />

        {/* Realistic Fingernail with glossy surface refraction */}
        <rect
          x="25.5"
          y="9"
          width="9"
          height="11.5"
          rx="4.5"
          fill="url(#pm-nail-body)"
        />

        {/* Cuticle boundary line */}
        <path
          d="M 25.8 19 Q 30 20.8 34.2 19"
          stroke="#BD612D"
          strokeWidth="0.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Top gloss reflection crescent on nail */}
        <path
          d="M 27 11 Q 30 9.6 33 11"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.92"
        />
        <ellipse cx="31.8" cy="12" rx="1.4" ry="0.8" fill="#FFFFFF" opacity="0.8" />

        {/* Natural joint flexion creases */}
        {/* Distal Interphalangeal joint */}
        <path
          d="M 24.5 33 Q 30.5 35 36.5 33"
          stroke="#7E310C"
          strokeWidth="0.95"
          strokeLinecap="round"
          opacity="0.48"
        />
        <path
          d="M 25.5 34.8 Q 30.5 36.8 35.5 34.8"
          stroke="#FFF2E8"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Proximal Interphalangeal joint */}
        <path
          d="M 24 49 Q 30.5 51.5 37 49"
          stroke="#7E310C"
          strokeWidth="0.95"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M 25 50.8 Q 30.5 53.2 36 50.8"
          stroke="#FFF2E8"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
    </g>
  </svg>
);

/* ────────────────────────────────────────────────────────── */

interface GestureHandOverlayProps {
  step: 0 | 1 | 2 | null;
  isExiting?: boolean;
}

export const GestureHandOverlay: React.FC<GestureHandOverlayProps> = ({
  step,
  isExiting = false,
}) => {
  if (step === null) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-50 overflow-hidden ${
        isExiting ? 'pm-overlay-exit' : ''
      }`}
      style={{ borderRadius: 28 }}
      aria-hidden="true"
    >
      {/* ── ON-CARD INSTRUCTIONAL TEXT BADGE ── */}
      {/* Centered with inset-x-0 & flex justify-center, padded to avoid touching edges */}
      <div
        key={`badge-${step}`}
        className="pm-card-badge-anim absolute inset-x-0 top-[18%] sm:top-[20%] z-50 pointer-events-none select-none flex justify-center px-4"
      >
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/25 shadow-2xl text-white font-extrabold tracking-wider text-[11px] sm:text-xs uppercase max-w-[92%] text-center">
          {step === 0 && (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              <span>TAP TO EXPLORE</span>
            </>
          )}

          {step === 1 && (
            <>
              <span className="text-sky-400 font-black text-sm animate-pulse shrink-0">
                ←
              </span>
              <span>SWIPE LEFT TO EXPLORE MORE</span>
            </>
          )}

          {step === 2 && (
            <>
              <span>SWIPE RIGHT TO VIEW FULL DETAILS</span>
              <span className="text-sky-400 font-black text-sm animate-pulse shrink-0">
                →
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── STEP 0: TAP ANIMATION ── */}
      {step === 0 && (
        <div key="step-tap">
          {/* Subtle Dynamic Contact Shadow beneath fingertip contact point */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 'calc(32% + 12px)',
              width: 24,
              height: 12,
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          {/* Touch Ripple 1 */}
          <div
            className="pm-ripple-1"
            style={{
              position: 'absolute',
              left: '50%',
              top: 'calc(32% + 12px)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '2.5px solid rgba(56, 189, 248, 0.95)',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.75)',
              transform: 'translate(-50%, -50%) scale(0.15)',
            }}
          />

          {/* Touch Ripple 2 */}
          <div
            className="pm-ripple-2"
            style={{
              position: 'absolute',
              left: '50%',
              top: 'calc(32% + 12px)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid rgba(186, 230, 253, 0.85)',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.5)',
              transform: 'translate(-50%, -50%) scale(0.15)',
            }}
          />

          {/* Premium Hand (Fingertip aligns with 50% horizontal center) */}
          <div
            className="pm-hand-tap"
            style={{
              position: 'absolute',
              left: 'calc(50% - 20px)',
              top: '32%',
            }}
          >
            <PremiumHandSVG />
          </div>
        </div>
      )}

      {/* ── STEP 1: SWIPE LEFT ANIMATION ── */}
      {step === 1 && (
        <div key="step-swipe-left">
          {/* Directional Motion Trail (Right → Left) */}
          <div
            className="pm-trail-left"
            style={{
              position: 'absolute',
              right: '25%',
              top: 'calc(30% + 16px)',
              height: 4,
              width: 0,
              borderRadius: 3,
            }}
          />

          {/* Premium Hand */}
          <div
            className="pm-hand-swipe-left"
            style={{
              position: 'absolute',
              left: '55%',
              top: '30%',
            }}
          >
            <PremiumHandSVG />
          </div>
        </div>
      )}

      {/* ── STEP 2: SWIPE RIGHT ANIMATION ── */}
      {step === 2 && (
        <div key="step-swipe-right">
          {/* Directional Motion Trail (Left → Right) */}
          <div
            className="pm-trail-right"
            style={{
              position: 'absolute',
              left: '14%',
              top: 'calc(30% + 16px)',
              height: 4,
              width: 0,
              borderRadius: 3,
            }}
          />

          {/* Premium Hand */}
          <div
            className="pm-hand-swipe-right"
            style={{
              position: 'absolute',
              left: '12%',
              top: '30%',
            }}
          >
            <PremiumHandSVG />
          </div>
        </div>
      )}
    </div>
  );
};
