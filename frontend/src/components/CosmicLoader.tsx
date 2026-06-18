"use client";
import React, { useEffect, useMemo } from 'react';

interface CosmicLoaderProps {
  isComplete?: boolean;
  realPercent?: number;
  realStage?: string;
}

export default function CosmicLoader({ isComplete = false, realPercent = 0, realStage = 'INITIALIZING OBSERVATORY...' }: CosmicLoaderProps) {
  // Generate random stars for the parallax background
  const stars = useMemo(() =>
    Array.from({ length: 200 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
    })), []);

  return (
    <>
      <style>{`
        @keyframes cinematicPan {
          0% { transform: scale(1.05) translate(0%, 0%) rotate(0deg); }
          100% { transform: scale(1.15) translate(-2%, -2%) rotate(2deg); }
        }
        @keyframes starPan {
          0% { transform: translate(0, 0); }
          100% { transform: translate(3%, 3%); }
        }
        @keyframes orbitMoon {
          0% { transform: rotate(0deg) translateX(30vw) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(30vw) rotate(-360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 1; }
        }
        @keyframes hudPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes whiteoutFlash {
          0% { background: transparent; opacity: 0; }
          40% { background: #fff; opacity: 1; }
          100% { background: #fff; opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#010408', // Deep space black/blue
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* --- DEEP BACKGROUND: STARS WITH PARALLAX --- */}
        <div style={{
          position: 'absolute', inset: '-10%',
          animation: 'starPan 40s linear infinite alternate',
          zIndex: 1
        }}>
          {stars.map(s => (
            <div key={s.id} style={{
              position: 'absolute',
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              backgroundColor: '#fff', borderRadius: '50%',
              opacity: s.opacity,
              boxShadow: s.size > 1.5 ? '0 0 5px rgba(255,255,255,0.8)' : 'none',
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }} />
          ))}
        </div>

        {/* --- MIDGROUND: MASSIVE PHOTOREALISTIC EXOPLANET --- */}
        <div style={{
          position: 'absolute',
          top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'cinematicPan 60s ease-out forwards',
          zIndex: 2,
          opacity: 0.85
        }}>
          <img 
            src="/cinematic_exoplanet.png" 
            alt="Exoplanet"
            style={{
              width: '120vw', 
              height: '120vw', 
              objectFit: 'contain',
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 100px rgba(14, 165, 233, 0.4))'
            }}
          />
        </div>

        {/* --- ATMOSPHERIC VIGNETTE & LIGHTING --- */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0,2,10,0.8) 100%)',
          zIndex: 4,
          pointerEvents: 'none'
        }} />

        {/* --- SUBTLE HUD OVERLAYS --- */}
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
          fontSize: '0.8rem'
        }}>
          {/* Subtle Crosshairs */}
          <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', width: '1px', background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)' }} />
          
          {/* Top Left Data */}
          <div style={{ position: 'absolute', top: '40px', left: '40px', animation: 'hudPulse 4s infinite' }}>
            <div>SYSTEM: EXONYX_CORE</div>
            <div>MODE: {realPercent > 0 ? 'ANALYSIS_ACTIVE' : 'STANDBY'}</div>
            <div>RA: 19h 20m 40s | DEC: +45° 20' 00"</div>
          </div>

          {/* Top Right Data */}
          <div style={{ position: 'absolute', top: '40px', right: '40px', textAlign: 'right', animation: 'hudPulse 5s infinite' }}>
            <div>TGT_LOCK: ACQUIRED</div>
            <div>SIG_NOISE: OPTIMAL</div>
            <div>[ {Math.floor(realPercent * 1000).toString(16).toUpperCase().padStart(4, '0')} ]</div>
          </div>

          {/* Scanner Line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'rgba(56, 189, 248, 0.2)',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
            animation: 'scanline 8s linear infinite'
          }} />
        </div>

        {/* --- BOTTOM PROGRESS FOOTER --- */}
        <div style={{
          position: 'absolute', bottom: '0', left: '0', right: '0',
          height: '120px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
          zIndex: 6,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '40px 60px',
        }}>
          
          {/* Progress Bar & Text */}
          <div style={{ width: '60%' }}>
            <div style={{ 
              display: 'flex', alignItems: 'baseline', gap: '15px', 
              marginBottom: '12px' 
            }}>
              <span style={{ 
                fontSize: '2.5rem', fontWeight: 300, color: isComplete ? '#4ade80' : '#e0f2fe',
                fontFamily: 'system-ui, sans-serif', lineHeight: 1
              }}>
                {Math.floor(realPercent)}%
              </span>
              <span style={{ 
                fontSize: '1rem', color: isComplete ? '#4ade80' : 'rgba(255,255,255,0.6)',
                letterSpacing: '0.15em', textTransform: 'uppercase'
              }}>
                {isComplete ? 'CANDIDATE IDENTIFIED' : realStage}
              </span>
            </div>

            {/* Ultra-thin progress line */}
            <div style={{
              width: '100%', height: '1px',
              background: 'rgba(255,255,255,0.1)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '1px',
                width: `${realPercent}%`,
                background: isComplete ? '#4ade80' : '#38bdf8',
                boxShadow: isComplete ? '0 0 10px #4ade80' : '0 0 10px #38bdf8',
                transition: 'width 0.4s ease-out, background 0.4s ease'
              }} />
            </div>
          </div>

          {/* NASA/Observatory Badge */}
          <div style={{ 
            color: 'rgba(255,255,255,0.3)', 
            fontSize: '0.7rem', 
            letterSpacing: '0.2em',
            textAlign: 'right' 
          }}>
            <div>NASA MAST ARCHIVE LINK</div>
            <div>EXONYX DEEP FIELD OBSERVATORY</div>
          </div>

        </div>

        {/* Flash Overlay when complete */}
        {isComplete && (
          <div style={{
            position: 'absolute', inset: 0,
            zIndex: 10000,
            animation: 'whiteoutFlash 1.5s cubic-bezier(0.8, 0, 0.2, 1) forwards'
          }} />
        )}

      </div>
    </>
  );
}
