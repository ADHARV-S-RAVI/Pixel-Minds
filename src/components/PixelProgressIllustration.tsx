import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Trophy, Zap, Rocket, Globe, Gem, Crown } from 'lucide-react';

export interface PixelTile {
  x: number;
  y: number;
  char: string;
  type: 'structure' | 'core' | 'accent';
  label: string;
  index: number;
}

// 6 completely unique pixel-art illustrations on a 21x21 grid
const LEVEL_ART_DATA: Record<
  number,
  {
    name: string;
    objectType: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    grid: string[];
  }
> = {
  // Level 1: Pixel Starter -> Cyber Velocity Rocket 🚀
  1: {
    name: 'Cyber Velocity Rocket',
    objectType: 'Futuristic Rocket',
    icon: Rocket,
    grid: [
      "          #          ", // 00: apex telemetry tip
      "         ###         ", // 01: nose tip
      "        #####        ", // 02: nose cone
      "        #####        ", // 03: nose cone
      "       #######       ", // 04: upper hull
      "       ##...##       ", // 05: cockpit frame
      "       #.....#       ", // 06: cockpit portal
      "       ##...##       ", // 07: cockpit frame
      "       #######       ", // 08: mid hull
      "      #########      ", // 09: fuselage expansion
      "  #  ###########  #  ", // 10: delta wings begin
      " ### ########### ### ", // 11: delta wings
      " ##### ####### ##### ", // 12: wings + body
      " ##### ####### ##### ", // 13: wings + body
      "  ###  ### ###  ###  ", // 14: engine bells
      "   #   ### ###   #   ", // 15: nozzles
      "        #   #        ", // 16: ignition flare
      "       ### ###       ", // 17: flame plume
      "       #######       ", // 18: main exhaust
      "        #####        ", // 19: exhaust core
      "          #          "  // 20: trailing plasma spark
    ]
  },

  // Level 2: Pixel Scout -> Cosmic Ringed Planet 🪐
  2: {
    name: 'Cosmic Ringed Planet',
    objectType: 'Orbital Planet',
    icon: Globe,
    grid: [
      "        #####        ", // 00: north pole
      "      #########      ", // 01: upper hemisphere
      "     ###########     ", // 02
      "  # ############# #  ", // 03: ring back tips
      " ### ########### ### ", // 04: ring back arc
      "#####################", // 05: ring crossing
      " ##  ###########  ## ", // 06: ring gap
      "  #  ###########  #  ", // 07: planet body
      "     ###.....###     ", // 08: equator band
      "    ###.......###    ", // 09: central storm
      "   ###.........###   ", // 10: planetary core
      "    ###.......###    ", // 11: central storm
      "     ###.....###     ", // 12: equator band
      "  #  ###########  #  ", // 13: planet body
      " ##  ###########  ## ", // 14: ring gap
      "#####################", // 15: ring front plane
      " ### ########### ### ", // 16: ring front arc
      "  # ############# #  ", // 17: ring front tips
      "     ###########     ", // 18
      "      #########      ", // 19: lower hemisphere
      "        #####        "  // 20: south pole
    ]
  },

  // Level 3: Pixel Contributor -> Radiant Cyber Diamond 💎
  3: {
    name: 'Radiant Cyber Diamond',
    objectType: 'Brilliant Gemstone',
    icon: Gem,
    grid: [
      "                     ", // 00
      "      #########      ", // 01: gem table top
      "    #############    ", // 02: crown facets
      "  #################  ", // 03: crown facets
      " ################### ", // 04: upper girdle
      "#####################", // 05: widest girdle
      " ################### ", // 06: pavilion bevel
      "  #.# #.# #.# #.# #  ", // 07: facet reflection cuts
      "   #...#...#...#.#   ", // 08: inner reflections
      "    #...........#    ", // 09: diamond heart
      "     #.........#     ", // 10: diamond heart
      "      #.......#      ", // 11: pavilion taper
      "       #.....#       ", // 12
      "        #...#        ", // 13
      "         #.#         ", // 14
      "          #          ", // 15: culet point
      "          #          ", // 16: reflection beam
      "         ###         ", // 17: sparkle glint
      "          #          ", // 18: sparkle glint
      "                     ", // 19
      "                     "  // 20
    ]
  },

  // Level 4: Pixel Builder -> Champions Digital Trophy 🏆
  4: {
    name: 'Champions Digital Trophy',
    objectType: 'Victory Trophy',
    icon: Trophy,
    grid: [
      "         ###         ", // 00: victory star apex
      "        #####        ", // 01: victory star
      "   #     ###     #   ", // 02: rim & handle tips
      "  ### ######### ###  ", // 03: chalice rim & handles
      " ##### ####### ##### ", // 04: handles & cup
      " #####  #####  ##### ", // 05: handles & cup
      " #####  #...#  ##### ", // 06: cup core
      "  ###   #...#   ###  ", // 07: handles join
      "   #    #...#    #   ", // 08: handle base
      "        #####        ", // 09: cup bowl base
      "         ###         ", // 10: stem top
      "         ###         ", // 11: trophy stem
      "         ###         ", // 12: trophy stem
      "        #####        ", // 13: stem ring
      "       #######       ", // 14: base collar
      "      #########      ", // 15: upper pedestal
      "     ###########     ", // 16: tiered base
      "    #############    ", // 17: lower base
      "   ###############   ", // 18: main plinth
      "  #################  ", // 19: plinth foot
      "                     "  // 20
    ]
  },

  // Level 5: Pixel Master -> Imperial Royal Crown 👑
  5: {
    name: 'Imperial Royal Crown',
    objectType: 'Royal Crown',
    icon: Crown,
    grid: [
      "          #          ", // 00: center spire apex jewel
      "  #      ###      #  ", // 01: outer & center spire gems
      " ###     ###     ### ", // 02: spire jewels
      "  #   #  ###  #   #  ", // 03: mid spires emerge
      " ### ### ### ### ### ", // 4: 5 crown spires
      " ################### ", // 05: crown peak bridge
      " ################### ", // 06: upper velvet arches
      "  ##...##...##...##  ", // 07: royal velvet windows
      "  #.....#...#.....#  ", // 08: velvet interior
      "  ##...##...##...##  ", // 09: velvet lower arches
      " ################### ", // 10: filigree deck
      " ################### ", // 11: upper band
      " ##.#.##.#.##.#.##.# ", // 12: gem settings
      " ##...##...##...##.. ", // 13: embedded sapphires
      " ##.#.##.#.##.#.##.# ", // 14: gem settings
      " ################### ", // 15: lower crown band
      " ################### ", // 16: base rim
      "  #################  ", // 17: rim bevel
      "   ###############   ", // 18: cushion base
      "                     ", // 19
      "                     "  // 20
    ]
  },

  // Level 6: Pixel Legend -> Astral Supernova Artifact ✦
  6: {
    name: 'Astral Supernova Artifact',
    objectType: 'Cosmic Star Artifact',
    icon: Sparkles,
    grid: [
      "          #          ", // 00: north ray tip
      "          #          ", // 01: north ray shaft
      "  #      ###      #  ", // 02: NW & NE ray tips
      "   #     ###     #   ", // 03: diagonal rays
      "    #   #####   #    ", // 04: ray convergence
      "     #  #####  #     ", // 05
      "      #########      ", // 06: outer star core
      "     ###########     ", // 07
      "    ##...###...##    ", // 08: interior cosmic portal
      "   ##.....#.....##   ", // 09
      "######...#.#...######", // 10: west & east grand rays
      "   ##.....#.....##   ", // 11
      "    ##...###...##    ", // 12: interior cosmic portal
      "     ###########     ", // 13
      "      #########      ", // 14: outer star core
      "     #  #####  #     ", // 15
      "    #   #####   #    ", // 16: ray convergence
      "   #     ###     #   ", // 17: SW & SE ray tips
      "  #      ###      #  ", // 18: diagonal rays
      "          #          ", // 19: south ray shaft
      "          #          "  // 20: south ray tip
    ]
  }
};

/**
 * Parses grid into ordered pixel tiles (sorted bottom-to-top)
 */
function parseLevelTiles(grid: string[], objectName: string): PixelTile[] {
  const tiles: Omit<PixelTile, 'index'>[] = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char !== ' ') {
        let type: PixelTile['type'] = 'structure';
        let label = `${objectName} Block`;

        if (char === '.') {
          type = 'core';
          label = `${objectName} Core Node`;
        } else if (y <= 3 || x <= 3 || x >= 17) {
          type = 'accent';
          label = `${objectName} Apex Trim`;
        }

        tiles.push({ x, y, char, type, label });
      }
    }
  }

  // Progressive fill order: bottom to top (y descending), then center-out
  tiles.sort((a, b) => {
    if (b.y !== a.y) return b.y - a.y;
    const distA = Math.abs(a.x - 10);
    const distB = Math.abs(b.x - 10);
    if (distA !== distB) return distA - distB;
    return a.x - b.x;
  });

  return tiles.map((t, idx) => ({ ...t, index: idx + 1 }));
}

/**
 * Pre-generate tile maps for all 6 levels
 */
const ALL_LEVEL_TILES: Record<number, PixelTile[]> = {
  1: parseLevelTiles(LEVEL_ART_DATA[1].grid, 'Rocket'),
  2: parseLevelTiles(LEVEL_ART_DATA[2].grid, 'Planet'),
  3: parseLevelTiles(LEVEL_ART_DATA[3].grid, 'Diamond'),
  4: parseLevelTiles(LEVEL_ART_DATA[4].grid, 'Trophy'),
  5: parseLevelTiles(LEVEL_ART_DATA[5].grid, 'Crown'),
  6: parseLevelTiles(LEVEL_ART_DATA[6].grid, 'Supernova')
};

/**
 * Smooth progress animation hook
 */
function useSmoothProgress(target: number, duration = 900): number {
  const [val, setVal] = useState(target);
  const prevVal = useRef(target);

  useEffect(() => {
    // If target is 0, snap immediately to 0 so there is zero flash of fill
    if (target <= 0) {
      prevVal.current = 0;
      setVal(0);
      return;
    }

    const start = prevVal.current;
    const startTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      setVal(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevVal.current = target;
        setVal(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return val;
}

interface PixelProgressIllustrationProps {
  pct: number;
  levelName: string;
  levelNumber: number;
  isMaxLevel?: boolean;
  nextLevelName?: string | null;
  pixelsToGo?: number;
}

export const PixelProgressIllustration: React.FC<PixelProgressIllustrationProps> = ({
  pct,
  levelName,
  levelNumber,
  isMaxLevel = false,
  nextLevelName,
  pixelsToGo = 0
}) => {
  // Clamp level between 1 and 6
  const safeLevel = Math.max(1, Math.min(6, levelNumber || 1));
  const currentArt = LEVEL_ART_DATA[safeLevel];
  const tiles = ALL_LEVEL_TILES[safeLevel];
  const totalTiles = tiles.length;

  // Clamp pct safely between 0 and 100
  const safePct = typeof pct === 'number' && !isNaN(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const animatedPct = useSmoothProgress(safePct);
  const [hoveredTile, setHoveredTile] = useState<PixelTile | null>(null);

  // Exact number of illuminated tiles: strictly 0 if safePct <= 0
  const litCount = useMemo(() => {
    if (safePct <= 0 || animatedPct <= 0) return 0;
    if (safePct >= 100 && animatedPct >= 99) return totalTiles;
    return Math.min(totalTiles, Math.max(0, Math.floor((animatedPct / 100) * totalTiles)));
  }, [safePct, animatedPct, totalTiles]);

  const isLevelCompleted = safePct >= 100;
  const ArtIcon = currentArt.icon;

  // Glow styling for filled blocks (blue, cyan, and purple)
  const getFilledTileStyle = (type: PixelTile['type']) => {
    switch (type) {
      case 'core':
        // Luminous cyan-white core
        return 'bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.95)] border border-white/90';
      case 'accent':
        // Electric blue with purple glowing edges
        return 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 shadow-[0_0_9px_rgba(139,92,246,0.7)] border border-indigo-300/60';
      case 'structure':
      default:
        // Deep cyan & vibrant blue
        return 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(56,189,248,0.75)] border border-cyan-300/60';
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Header Badge: Object & Status */}
      <div className="mb-2.5 flex items-center justify-between w-full max-w-[270px] sm:max-w-[310px] px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <ArtIcon size={14} className="text-blue-500" />
          <span>{currentArt.name}</span>
        </div>

        <span className="text-[11px] font-extrabold text-blue-600 dark:text-sky-400">
          {litCount} / {totalTiles} Blocks
        </span>
      </div>

      {/* Main Illustration Viewport */}
      <div
        className={`relative w-full max-w-[270px] sm:max-w-[310px] p-4 sm:p-5 rounded-2xl transition-all duration-500 ${
          isLevelCompleted && isMaxLevel
            ? 'shadow-[0_0_45px_rgba(251,191,36,0.4)] ring-4 ring-amber-400/60 bg-gradient-to-b from-white/95 via-amber-50/30 to-white/95 dark:from-slate-900/95 dark:via-slate-900/70 dark:to-slate-900/95 animate-pulse'
            : isLevelCompleted
            ? 'shadow-[0_0_40px_rgba(56,189,248,0.55),0_0_20px_rgba(168,85,247,0.35)] ring-4 ring-cyan-400/70 bg-gradient-to-b from-white/95 via-sky-50/40 to-white/95 dark:from-slate-900/95 dark:via-blue-950/40 dark:to-slate-900/95 animate-pulse'
            : 'bg-white/70 dark:bg-slate-900/60'
        } border border-white/80 dark:border-white/10 backdrop-blur-md`}
      >
        {/* Soft Radial Ambient Glow: only appears when blocks are illuminated */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl blur-3xl transition-opacity duration-700 ${
            isLevelCompleted
              ? 'bg-radial from-cyan-400/35 via-blue-500/25 to-purple-500/20 opacity-100'
              : litCount > 0
              ? 'bg-radial from-blue-500/15 via-cyan-400/10 to-transparent opacity-100'
              : 'opacity-0'
          }`}
        />

        {/* 21x21 CSS Pixel Art Grid */}
        <div
          className="relative z-10 grid w-full aspect-square"
          style={{
            gridTemplateColumns: 'repeat(21, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(21, minmax(0, 1fr))',
            gap: '2px'
          }}
          onMouseLeave={() => setHoveredTile(null)}
          role="img"
          aria-label={`Level ${safeLevel}: ${levelName} · ${litCount} of ${totalTiles} blocks illuminated (${Math.round(
            animatedPct
          )}%). ${isMaxLevel ? 'Maximum Level Reached' : `${pixelsToGo} Pixels remaining to ${nextLevelName || 'next rank'}`}`}
        >
          {tiles.map((tile) => {
            // Strictly check if block is illuminated: MUST be litCount > 0 and tile.index <= litCount
            const isLit = litCount > 0 && tile.index <= litCount;
            const isHovered = hoveredTile?.index === tile.index;

            return (
              <div
                key={`${safeLevel}-${tile.x}-${tile.y}`}
                style={{
                  gridColumnStart: tile.x + 1,
                  gridRowStart: tile.y + 1
                }}
                onMouseEnter={() => setHoveredTile(tile)}
                onFocus={() => setHoveredTile(tile)}
                className={`aspect-square rounded-[2px] sm:rounded-[3px] transition-all duration-300 cursor-pointer ${
                  isLit
                    ? `${getFilledTileStyle(tile.type)} opacity-100 scale-100 z-1 hover:scale-130 hover:z-20 ${
                        isLevelCompleted ? 'shadow-[0_0_12px_rgba(56,189,248,0.9)] ring-1 ring-white/60' : ''
                      }`
                    : 'bg-slate-300/40 dark:bg-slate-700/35 border border-slate-300/60 dark:border-slate-600/40 opacity-30 hover:opacity-60 hover:scale-115'
                } ${isHovered ? 'ring-2 ring-white shadow-lg' : ''}`}
                title={`Block #${tile.index}: ${tile.label} (${
                  isLit
                    ? 'Illuminated'
                    : `Unfilled · Earn Pixels to illuminate`
                })`}
              />
            );
          })}
        </div>
      </div>

      {/* Dynamic Tile Status or Hover Feedback */}
      <div className="mt-3 w-full max-w-[310px] text-center">
        {hoveredTile ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-semibold shadow-xs transition-all">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                litCount > 0 && hoveredTile.index <= litCount ? 'bg-cyan-400' : 'bg-slate-400'
              }`}
            />
            <span className="truncate">
              Block #{hoveredTile.index} · {hoveredTile.label} (
              {litCount > 0 && hoveredTile.index <= litCount ? 'Illuminated' : 'Unfilled'})
            </span>
          </div>
        ) : isLevelCompleted ? (
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 text-[11px] font-bold text-blue-700 dark:text-sky-300 shadow-2xs animate-pulse">
            <Sparkles size={12} className="text-blue-500" />
            <span>
              {isMaxLevel ? 'Maximum Level Mastered!' : 'All Blocks Filled · Level Up Unlocked!'}
            </span>
          </div>
        ) : litCount === 0 ? (
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shadow-2xs">
            <Zap size={11} className="text-slate-400" />
            <span>0% Progress · Earn Pixels to illuminate blocks</span>
          </div>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-2xs">
            <Zap size={12} className="text-blue-500 fill-blue-500" />
            <span>
              {litCount} of {totalTiles} Blocks Illuminated ({Math.round(animatedPct)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
