"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CosmicLoaderProps {
  isComplete?: boolean;
  realPercent?: number;
  realStage?: string;
}

const STAGE_ICONS: Record<string, string> = {
  'INITIALIZING OBSERVATORY...': '🔭',
  'CONNECTING TO MAST ARCHIVE...': '📡',
  'DOWNLOADING OBSERVATIONS...': '⬇️',
  'PROCESSING LIGHT CURVE...': '〰️',
  'RUNNING TLS SEARCH...': '🔍',
  'VALIDATING CANDIDATE...': '🛡️',
  'CHARACTERIZING PLANET...': '🪐',
  'GENERATING REPORT...': '📄',
  'CANDIDATE IDENTIFIED': '✅',
};

export default function CosmicLoader({ isComplete = false, realPercent = 0, realStage = 'INITIALIZING OBSERVATORY...' }: CosmicLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [prevStage, setPrevStage] = useState(realStage);
  const [stageOpacity, setStageOpacity] = useState(1);
  
  // Smooth stage transitions
  useEffect(() => {
    if (realStage !== prevStage) {
      setStageOpacity(0);
      const timer = setTimeout(() => {
        setPrevStage(realStage);
        setStageOpacity(1);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [realStage, prevStage]);

  // Star data
  const stars = useMemo(() =>
    Array.from({ length: 300 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 2 + 0.3,
      speed: Math.random() * 0.0002 + 0.0001,
      twinkleSpeed: Math.random() * 0.003 + 0.001,
      twinkleOffset: Math.random() * Math.PI * 2,
      brightness: Math.random() * 0.7 + 0.3,
      layer: Math.floor(Math.random() * 3), // 0=far, 1=mid, 2=near
    })), []);

  // Orbital ring data
  const orbits = useMemo(() => [
    { radius: 0.15, speed: 0.0008, planetSize: 4, color: '#38bdf8', planetColor: '#22d3ee' },
    { radius: 0.25, speed: 0.0005, planetSize: 6, color: '#6366f1', planetColor: '#818cf8' },
    { radius: 0.38, speed: 0.0003, planetSize: 3, color: '#a855f7', planetColor: '#c084fc' },
  ], []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => canvas.width / window.devicePixelRatio;
    const h = () => canvas.height / window.devicePixelRatio;

    let time = 0;
    const draw = () => {
      const cw = w(), ch = h();
      ctx.clearRect(0, 0, cw, ch);

      // Background gradient
      const grad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.7);
      grad.addColorStop(0, '#050a1a');
      grad.addColorStop(0.5, '#020617');
      grad.addColorStop(1, '#000208');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      // Stars with parallax
      stars.forEach(s => {
        const parallaxMultiplier = [0.3, 0.6, 1.0][s.layer];
        const offsetX = Math.sin(time * s.speed * 10) * 20 * parallaxMultiplier;
        const offsetY = Math.cos(time * s.speed * 8) * 15 * parallaxMultiplier;
        const twinkle = (Math.sin(time * s.twinkleSpeed + s.twinkleOffset) + 1) / 2;
        const alpha = s.brightness * (0.3 + twinkle * 0.7);

        ctx.beginPath();
        ctx.arc(s.x * cw + offsetX, s.y * ch + offsetY, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        // Glow for bright stars
        if (s.size > 1.5 && alpha > 0.6) {
          ctx.beginPath();
          ctx.arc(s.x * cw + offsetX, s.y * ch + offsetY, s.size * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(
            s.x * cw + offsetX, s.y * ch + offsetY, 0,
            s.x * cw + offsetX, s.y * ch + offsetY, s.size * 3
          );
          glow.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.3})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fill();
        }
      });

      // Central star glow
      const starGlow = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, 80);
      starGlow.addColorStop(0, 'rgba(255, 240, 200, 0.15)');
      starGlow.addColorStop(0.3, 'rgba(255, 200, 100, 0.05)');
      starGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = starGlow;
      ctx.fillRect(0, 0, cw, ch);

      // Scanning rings (pulse outward)
      for (let i = 0; i < 3; i++) {
        const ringTime = (time * 0.5 + i * 1000) % 3000;
        const ringProgress = ringTime / 3000;
        const ringRadius = ringProgress * Math.min(cw, ch) * 0.4;
        const ringAlpha = (1 - ringProgress) * 0.15;

        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 102, 241, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Orbital rings + planets
      orbits.forEach(orbit => {
        const orbitRadius = Math.min(cw, ch) * orbit.radius;
        const angle = time * orbit.speed;

        // Draw orbit path
        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `${orbit.color}15`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw planet
        const px = cw / 2 + Math.cos(angle) * orbitRadius;
        const py = ch / 2 + Math.sin(angle) * orbitRadius;

        // Planet glow
        const planetGlow = ctx.createRadialGradient(px, py, 0, px, py, orbit.planetSize * 4);
        planetGlow.addColorStop(0, `${orbit.planetColor}40`);
        planetGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = planetGlow;
        ctx.fillRect(px - orbit.planetSize * 4, py - orbit.planetSize * 4, orbit.planetSize * 8, orbit.planetSize * 8);

        // Planet body
        ctx.beginPath();
        ctx.arc(px, py, orbit.planetSize, 0, Math.PI * 2);
        ctx.fillStyle = orbit.planetColor;
        ctx.fill();
      });

      time++;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [stars, orbits]);

  const stageIcon = STAGE_ICONS[prevStage.toUpperCase()] || STAGE_ICONS['INITIALIZING OBSERVATORY...'];

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: '#020617' }}>
      {/* Canvas starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 2,
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,2,10,0.85) 100%)'
      }} />

      {/* HUD: Top Left */}
      <div className="absolute top-10 left-10 text-[11px] font-mono text-white/30 space-y-1 animate-pulse" style={{ zIndex: 5 }}>
        <div>SYSTEM: EXONYX_CORE v6.0</div>
        <div>MODE: {realPercent > 0 ? 'ANALYSIS_ACTIVE' : 'STANDBY'}</div>
        <div>ARCHIVE: NASA/MAST</div>
      </div>

      {/* HUD: Top Right */}
      <div className="absolute top-10 right-10 text-right text-[11px] font-mono text-white/30 space-y-1 animate-pulse" style={{ zIndex: 5 }}>
        <div>TGT_LOCK: {realPercent > 10 ? 'ACQUIRED' : 'SCANNING'}</div>
        <div>SNR: {realPercent > 30 ? 'OPTIMAL' : 'CALIBRATING'}</div>
        <div>[ {Math.floor(realPercent * 100).toString(16).toUpperCase().padStart(4, '0')} ]</div>
      </div>

      {/* Crosshairs */}
      <div className="absolute top-1/2 left-0 right-0 h-px pointer-events-none" style={{
        zIndex: 3,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)'
      }} />
      <div className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none" style={{
        zIndex: 3,
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)'
      }} />

      {/* Bottom Progress Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-16 pb-10 pt-20 flex items-end justify-between" style={{
        zIndex: 6,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)'
      }}>
        <div className="w-3/5">
          <div className="flex items-baseline gap-4 mb-3">
            <span className="text-[11px]" style={{ transition: 'opacity 0.2s' }}>{stageIcon}</span>
            <span className={`text-4xl font-extralight tracking-tight ${isComplete ? 'text-emerald-400' : 'text-slate-100'}`}
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              {Math.floor(realPercent)}%
            </span>
            <span className={`text-sm tracking-[0.15em] uppercase ${isComplete ? 'text-emerald-400' : 'text-white/60'}`}
              style={{ transition: 'opacity 0.2s', opacity: stageOpacity }}>
              {isComplete ? 'CANDIDATE IDENTIFIED' : prevStage}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-[2px] bg-white/10 rounded-full relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${realPercent}%`,
                background: isComplete
                  ? 'linear-gradient(90deg, #4ade80, #22d3ee)'
                  : 'linear-gradient(90deg, #6366f1, #38bdf8)',
                boxShadow: isComplete
                  ? '0 0 12px rgba(74, 222, 128, 0.5)'
                  : '0 0 12px rgba(99, 102, 241, 0.4)'
              }}
            />
          </div>
        </div>

        <div className="text-right text-[10px] font-mono text-white/20 tracking-wider space-y-1">
          <div>NASA MAST ARCHIVE LINK</div>
          <div>EXONYX DEEP FIELD OBSERVATORY</div>
        </div>
      </div>

      {/* Completion Flash */}
      {isComplete && (
        <div className="absolute inset-0" style={{
          zIndex: 10000,
          animation: 'whiteoutFlash 1.5s cubic-bezier(0.8, 0, 0.2, 1) forwards'
        }} />
      )}

      <style>{`
        @keyframes whiteoutFlash {
          0% { background: transparent; opacity: 0; }
          40% { background: #fff; opacity: 1; }
          100% { background: #fff; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
