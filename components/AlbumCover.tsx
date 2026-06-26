import React, { useMemo } from 'react';

interface AlbumCoverProps {
  seed: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  children?: React.ReactNode;
}

// Seeded random number generator for consistent results
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length)];
  }
}

// Curated color palettes - Zambian cultural heritage inspired
const palettes = [
  // Victoria Falls Mist
  { colors: ['#2d8a4e', '#4ecdc4', '#a8e6cf', '#e8f4f8'], bg: '#0a1f12' },
  // Copperbelt Sunset
  { colors: ['#d4760a', '#e8a817', '#ff6b35', '#ffd166'], bg: '#1a0f05' },
  // Chitenge Bold
  { colors: ['#c45e0a', '#e8a817', '#2d8a4e', '#d4760a'], bg: '#120a04' },
  // Kariba Twilight
  { colors: ['#1a472a', '#2d8a4e', '#4ea8de', '#e8a817'], bg: '#060f0a' },
  // Nkhwazi Spirit
  { colors: ['#d4760a', '#1a472a', '#c45e0a', '#2d8a4e'], bg: '#0c0805' },
  // Zambezi Flow
  { colors: ['#0ea5e9', '#2d8a4e', '#34d399', '#a78bfa'], bg: '#040d14' },
  // Tribal Fire
  { colors: ['#ef4444', '#d4760a', '#e8a817', '#ff6b35'], bg: '#1a0808' },
  // Luangwa Valley
  { colors: ['#8b5e3c', '#d4760a', '#2d8a4e', '#e8a817'], bg: '#0f0a06' },
  // Night Drums
  { colors: ['#c45e0a', '#ef4444', '#e8a817', '#d4760a'], bg: '#0d0604' },
  // Emerald Mine
  { colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'], bg: '#041a10' },
  // African Violet
  { colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#d4760a'], bg: '#0f0520' },
  // Sunrise Lusaka
  { colors: ['#f59e0b', '#d4760a', '#ef4444', '#fbbf24'], bg: '#1a1005' },
  // Baobab Bark
  { colors: ['#78350f', '#92400e', '#b45309', '#d4760a'], bg: '#0a0604' },
  // Lake Bangweulu
  { colors: ['#0284c7', '#0ea5e9', '#38bdf8', '#2d8a4e'], bg: '#030d16' },
  // Copper & Green
  { colors: ['#d4760a', '#2d8a4e', '#e8a817', '#1a472a'], bg: '#0a0d08' },
];

type PatternType = 'aurora' | 'mesh' | 'orbs' | 'rays' | 'waves' | 'geometric' | 'nebula' | 'gradient' | 'rings' | 'crystal';

const generatePattern = (rng: SeededRandom, palette: typeof palettes[0]): React.CSSProperties => {
  const patterns: PatternType[] = ['aurora', 'mesh', 'orbs', 'rays', 'waves', 'geometric', 'nebula', 'gradient', 'rings', 'crystal'];
  const pattern = rng.pick(patterns);
  const colors = palette.colors;
  const bg = palette.bg;

  switch (pattern) {
    case 'aurora': {
      const angle1 = rng.int(0, 360);
      const angle2 = rng.int(0, 360);
      return {
        background: `
          linear-gradient(${angle1}deg, ${colors[0]}00 0%, ${colors[0]}88 25%, ${colors[1]}88 50%, ${colors[2]}88 75%, ${colors[3]}00 100%),
          linear-gradient(${angle2}deg, ${colors[2]}00 0%, ${colors[3]}66 30%, ${colors[0]}66 70%, ${colors[1]}00 100%),
          radial-gradient(ellipse at ${rng.int(20, 80)}% ${rng.int(60, 100)}%, ${colors[1]}44 0%, transparent 50%),
          linear-gradient(180deg, ${bg} 0%, ${colors[3]}22 100%)
        `,
        backgroundColor: bg,
      };
    }

    case 'mesh': {
      const points = [
        { x: rng.int(0, 40), y: rng.int(0, 40) },
        { x: rng.int(60, 100), y: rng.int(0, 40) },
        { x: rng.int(0, 40), y: rng.int(60, 100) },
        { x: rng.int(60, 100), y: rng.int(60, 100) },
      ];
      return {
        background: `
          radial-gradient(at ${points[0].x}% ${points[0].y}%, ${colors[0]} 0%, transparent 50%),
          radial-gradient(at ${points[1].x}% ${points[1].y}%, ${colors[1]} 0%, transparent 50%),
          radial-gradient(at ${points[2].x}% ${points[2].y}%, ${colors[2]} 0%, transparent 50%),
          radial-gradient(at ${points[3].x}% ${points[3].y}%, ${colors[3]} 0%, transparent 50%)
        `,
        backgroundColor: bg,
      };
    }

    case 'orbs': {
      const orbCount = rng.int(3, 6);
      const orbs = Array.from({ length: orbCount }, (_, i) => {
        const size = rng.int(30, 70);
        const x = rng.int(10, 90);
        const y = rng.int(10, 90);
        const color = colors[i % colors.length];
        const blur = rng.int(20, 40);
        return `radial-gradient(circle ${size}% at ${x}% ${y}%, ${color}99 0%, ${color}44 ${blur}%, transparent 70%)`;
      });
      return {
        background: [...orbs, `linear-gradient(135deg, ${bg} 0%, ${colors[0]}11 100%)`].join(', '),
        backgroundColor: bg,
      };
    }

    case 'rays': {
      const centerX = rng.int(30, 70);
      const centerY = rng.int(30, 70);
      const rayCount = rng.int(6, 12);
      const rays = Array.from({ length: rayCount }, (_, i) => {
        const angle = (360 / rayCount) * i + rng.int(-10, 10);
        const color = colors[i % colors.length];
        return `linear-gradient(${angle}deg, transparent 0%, transparent 45%, ${color}66 48%, ${color}66 52%, transparent 55%, transparent 100%)`;
      });
      return {
        background: [
          `radial-gradient(circle at ${centerX}% ${centerY}%, ${colors[0]} 0%, transparent 30%)`,
          ...rays,
        ].join(', '),
        backgroundColor: bg,
      };
    }

    case 'waves': {
      const waveAngle = rng.int(0, 180);
      const waveSize = rng.int(8, 20);
      return {
        background: `
          repeating-linear-gradient(
            ${waveAngle}deg,
            ${colors[0]}44 0px,
            ${colors[1]}44 ${waveSize}px,
            ${colors[2]}44 ${waveSize * 2}px,
            ${colors[3]}44 ${waveSize * 3}px,
            ${colors[0]}44 ${waveSize * 4}px
          ),
          radial-gradient(ellipse at 50% 0%, ${colors[0]}66 0%, transparent 70%),
          radial-gradient(ellipse at 50% 100%, ${colors[2]}66 0%, transparent 70%)
        `,
        backgroundColor: bg,
      };
    }

    case 'geometric': {
      const angle = rng.int(0, 90);
      return {
        background: `
          conic-gradient(from ${angle}deg at 50% 50%, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]}, ${colors[0]}),
          repeating-conic-gradient(from 0deg at 50% 50%, ${bg}00 0deg, ${bg}88 ${90/rng.int(2,6)}deg)
        `,
        backgroundBlendMode: 'overlay',
        backgroundColor: bg,
      };
    }

    case 'nebula': {
      const x1 = rng.int(20, 80);
      const y1 = rng.int(20, 80);
      const x2 = rng.int(20, 80);
      const y2 = rng.int(20, 80);
      return {
        background: `
          radial-gradient(ellipse ${rng.int(60, 100)}% ${rng.int(40, 80)}% at ${x1}% ${y1}%, ${colors[0]}88 0%, transparent 50%),
          radial-gradient(ellipse ${rng.int(40, 80)}% ${rng.int(60, 100)}% at ${x2}% ${y2}%, ${colors[1]}88 0%, transparent 50%),
          radial-gradient(ellipse ${rng.int(50, 90)}% ${rng.int(50, 90)}% at ${100-x1}% ${100-y1}%, ${colors[2]}66 0%, transparent 60%),
          radial-gradient(ellipse ${rng.int(30, 60)}% ${rng.int(30, 60)}% at ${100-x2}% ${100-y2}%, ${colors[3]}44 0%, transparent 70%),
          linear-gradient(${rng.int(0, 360)}deg, ${bg} 0%, ${colors[0]}22 50%, ${bg} 100%)
        `,
        backgroundColor: bg,
      };
    }

    case 'gradient': {
      const angle = rng.int(0, 360);
      const type = rng.int(0, 3);
      if (type === 0) {
        return {
          background: `linear-gradient(${angle}deg, ${colors[0]} 0%, ${colors[1]} 33%, ${colors[2]} 66%, ${colors[3]} 100%)`,
        };
      } else if (type === 1) {
        return {
          background: `
            radial-gradient(circle at ${rng.int(30, 70)}% ${rng.int(30, 70)}%, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 60%, ${colors[3]} 100%)
          `,
        };
      } else {
        return {
          background: `
            linear-gradient(${angle}deg, ${colors[0]} 0%, ${colors[0]} 25%, transparent 25%, transparent 75%, ${colors[2]} 75%),
            linear-gradient(${angle + 90}deg, ${colors[1]} 0%, ${colors[1]} 25%, transparent 25%, transparent 75%, ${colors[3]} 75%),
            linear-gradient(${angle}deg, ${colors[2]} 0%, ${colors[3]} 100%)
          `,
          backgroundBlendMode: 'multiply, screen, normal',
        };
      }
    }

    case 'rings': {
      const centerX = rng.int(30, 70);
      const centerY = rng.int(30, 70);
      return {
        background: `
          repeating-radial-gradient(circle at ${centerX}% ${centerY}%,
            ${colors[0]}66 0px, ${colors[0]}66 2px,
            transparent 2px, transparent ${rng.int(15, 25)}px,
            ${colors[1]}66 ${rng.int(15, 25)}px, ${colors[1]}66 ${rng.int(17, 27)}px,
            transparent ${rng.int(17, 27)}px, transparent ${rng.int(35, 50)}px
          ),
          radial-gradient(circle at ${centerX}% ${centerY}%, ${colors[2]}88 0%, transparent 60%),
          linear-gradient(${rng.int(0, 180)}deg, ${colors[3]}44, ${colors[0]}44)
        `,
        backgroundColor: bg,
      };
    }

    case 'crystal': {
      const facets = rng.int(4, 8);
      const gradients = Array.from({ length: facets }, (_, i) => {
        const startAngle = (360 / facets) * i;
        const color = colors[i % colors.length];
        return `conic-gradient(from ${startAngle}deg at ${50 + rng.int(-20, 20)}% ${50 + rng.int(-20, 20)}%, ${color}88 0deg, transparent ${360/facets}deg)`;
      });
      return {
        background: [
          ...gradients,
          `radial-gradient(circle at 50% 50%, ${colors[0]}44 0%, transparent 70%)`,
        ].join(', '),
        backgroundColor: bg,
      };
    }

    default:
      return {
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      };
  }
};

export const AlbumCover: React.FC<AlbumCoverProps> = ({ seed, size = 'md', className = '', children }) => {
  const coverStyle = useMemo(() => {
    const rng = new SeededRandom(seed);
    const palette = rng.pick(palettes);
    return generatePattern(rng, palette);
  }, [seed]);

  const sizeClasses: Record<string, string> = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
    xl: 'w-48 h-48',
    full: 'w-full h-full',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-md shadow-lg flex-shrink-0 overflow-hidden relative ${className}`}
      style={coverStyle}
    >
      {children}
    </div>
  );
};

export default AlbumCover;
