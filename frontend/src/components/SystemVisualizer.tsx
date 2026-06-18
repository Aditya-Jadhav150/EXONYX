import React from 'react';

interface SystemVisualizerProps {
  starRadius: number; // in Solar Radii
  planets: {
    radius: number; // in Earth Radii
    semiMajorAxis: number; // in AU
  }[];
}

export default function SystemVisualizer({ starRadius, planets }: SystemVisualizerProps) {
  // SVG Coordinates
  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;

  // Logarithmic scaling for display purposes
  // 1 AU is scaled to roughly 120 pixels.
  const maxAu = Math.max(...planets.map(p => p.semiMajorAxis), 1.0);
  const scale = 150 / maxAu; 

  // Visual scaling for star and planets (log-ish so they are visible)
  const renderStarRadius = Math.max(15, Math.min(40, starRadius * 20));
  
  return (
    <div className="w-full flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold self-start">Planetary System Schematic</h3>
      
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-950 rounded-lg">
        {/* Draw orbits */}
        {planets.map((p, idx) => {
          if (!p.semiMajorAxis) return null;
          const r = p.semiMajorAxis * scale;
          return (
            <circle 
              key={`orbit-${idx}`}
              cx={cx} cy={cy} r={r} 
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4"
            />
          );
        })}

        {/* Draw Star */}
        <circle 
          cx={cx} cy={cy} r={renderStarRadius} 
          fill="url(#starGradient)" 
          filter="url(#glow)"
        />

        {/* Draw Planets */}
        {planets.map((p, idx) => {
          if (!p.semiMajorAxis) return null;
          const r = p.semiMajorAxis * scale;
          // Scale planet radius logarithmically for visibility
          const pr = Math.max(3, Math.min(12, Math.log10(p.radius + 1) * 6));
          return (
            <circle 
              key={`planet-${idx}`}
              cx={cx + r} cy={cy} r={pr} 
              fill="#38bdf8"
            />
          );
        })}

        {/* Defs */}
        <defs>
          <radialGradient id="starGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="mt-2 text-xs text-slate-500 font-mono">
        * Orbit scales are linear. Object sizes are logarithmically enhanced for visibility.
      </div>
    </div>
  );
}
