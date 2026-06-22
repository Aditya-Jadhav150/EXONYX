'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Ring } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Play, Pause, Activity, ShieldCheck, Cpu, CheckCircle, RotateCcw, ArrowLeft, Target, Database, BarChart3, AlertTriangle } from 'lucide-react';

interface CandidateData {
  target_id: string;
  mission: string;
  radius: number;
  period: number;
  semi_major_axis: number;
  equilibrium_temp: number;
  esi_score: number;
  pli_score: number;
  transit_duration: number;
  transit_depth: number;
  hz_score: number;
  cnn_confidence: number;
  fp_risk: number;
  sde_confidence: number;
}

type SimState = 'IDLE' | 'TRANSITION' | 'ORBITING' | 'TRANSIT_ACTIVE' | 'PIPELINE_REPLAY' | 'RESULTS';

// Map classification based on radius
function getPlanetMaterial(radius: number) {
  if (radius < 1.5) return { color: "#3b82f6", emissive: "#1d4ed8", type: "Earth-like" };
  if (radius < 2.5) return { color: "#a8a29e", emissive: "#78716c", type: "Super Earth" };
  if (radius < 4.0) return { color: "#06b6d4", emissive: "#0891b2", type: "Mini Neptune" };
  return { color: "#f59e0b", emissive: "#d97706", type: "Gas Giant" };
}

function CameraController({ simState, distance }: { simState: SimState, distance: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (simState !== 'IDLE') {
      // Lerp camera to looking directly down Z axis at the system (edge-on)
      camera.position.lerp(new THREE.Vector3(0, 0, distance * 2.5), 0.03);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.03);
        controlsRef.current.update();
      }
    }
  });

  return <OrbitControls ref={controlsRef} enablePan={true} enableDamping dampingFactor={0.05} maxDistance={100} minDistance={2} />;
}

function OrbitingPlanet({ 
  candidate,
  simState,
  setSimState,
  setHudData,
  onLogMessage
}: { 
  candidate: CandidateData,
  simState: SimState, 
  setSimState: React.Dispatch<React.SetStateAction<SimState>>,
  setHudData: React.Dispatch<React.SetStateAction<any>>,
  onLogMessage: (msg: string) => void
}) {
  const planetRef = useRef<THREE.Mesh>(null);
  
  // Scale distances for visual display
  const distance = Math.max(4.0, (candidate.semi_major_axis || 0.1) * 40); 
  const pRadius = Math.max(0.2, Math.min(1.5, Math.log10((candidate.radius || 1) + 1) * 0.8));
  
  // Real transit depth or fallback visualization depth
  const actualDepth = candidate.transit_depth || Math.pow(pRadius / 5.0, 2);
  const matProps = getPlanetMaterial(candidate.radius);

  // Internal state for transit phases
  const phaseRef = useRef<'PRE'|'INGRESS'|'MID'|'EGRESS'|'POST'>('PRE');

  useFrame((state) => {
    if (!planetRef.current || simState === 'PIPELINE_REPLAY' || simState === 'RESULTS') return;
    
    // Time speed varies based on mode to simulate real time vs accelerated observation
    const speed = simState === 'IDLE' ? 0.1 : 0.4;
    const time = state.clock.getElapsedTime() * speed;
    
    // Calculate position
    const x = Math.cos(time) * distance;
    const z = Math.sin(time) * distance;
    planetRef.current.position.set(x, 0, z);

    if (simState === 'IDLE' || simState === 'TRANSITION') return;

    // Transit geometry
    const isFront = z > distance * 0.8;
    const xRatio = x / (distance * 0.3); // -1 to 1 across the star disk
    const isTransiting = isFront && Math.abs(xRatio) <= 1.0;
    
    // Calculate flux
    let currentDepth = 0;
    let newPhase = phaseRef.current;

    if (isTransiting) {
      if (simState !== 'TRANSIT_ACTIVE') setSimState('TRANSIT_ACTIVE');

      // Gaussian-ish dip based on position across the disk
      const dipShape = 1.0 - Math.pow(xRatio, 4); // Flattened U-shape
      currentDepth = actualDepth * Math.max(0, dipShape);

      // Phase detection for logs
      if (xRatio < -0.8 && phaseRef.current === 'PRE') {
        newPhase = 'INGRESS';
        onLogMessage("Planet begins ingress. Entering stellar disk.");
      } else if (Math.abs(xRatio) < 0.1 && phaseRef.current === 'INGRESS') {
        newPhase = 'MID';
        onLogMessage("Mid-transit reached. Signal-to-noise ratio stable.");
      } else if (xRatio > 0.8 && phaseRef.current === 'MID') {
        newPhase = 'EGRESS';
        onLogMessage("Planet begins egress. Restoring baseline flux.");
      }
    } else {
      if (simState === 'TRANSIT_ACTIVE' && xRatio > 1.0) {
        setSimState('PIPELINE_REPLAY');
        newPhase = 'POST';
        onLogMessage("Transit event complete. Baseline restored.");
      } else if (isFront && xRatio < -1.0) {
        newPhase = 'PRE';
      }
    }

    phaseRef.current = newPhase;
    const brightnessDip = 1.0 - currentDepth;
    const fluxPercent = (brightnessDip * 100);

    setHudData((prev: any) => {
      // Append to lightcurve data
      const newLc = [...prev.lightCurve];
      if (newLc.length > 200) newLc.shift();
      newLc.push(fluxPercent);

      return { 
        ...prev,
        isTransiting, 
        brightnessDip, 
        type: matProps.type,
        flux: fluxPercent,
        lightCurve: newLc
      };
    });
  });

  return (
    <group>
      <mesh ref={planetRef}>
        <sphereGeometry args={[pRadius, 64, 64]} />
        <meshStandardMaterial color={matProps.color} emissive={matProps.emissive} emissiveIntensity={0.3} roughness={0.7} metalness={0.2} />
        
        {/* Atmospheric Glow */}
        <mesh>
          <sphereGeometry args={[pRadius * 1.15, 32, 32]} />
          <meshBasicMaterial color={matProps.color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </mesh>
    </group>
  );
}

function HabitableZone({ distance }: { distance: number }) {
  const innerR = distance * 0.7;
  const outerR = distance * 1.3;
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <Ring args={[innerR - 0.05, innerR, 128]} material-color="#fbbf24" material-transparent material-opacity={0.3} material-side={THREE.DoubleSide} />
      <Ring args={[outerR, outerR + 0.05, 128]} material-color="#22d3ee" material-transparent material-opacity={0.2} material-side={THREE.DoubleSide} />
      <Ring args={[distance - 0.02, distance + 0.02, 128]} material-color="#ffffff" material-transparent material-opacity={0.15} material-side={THREE.DoubleSide} />
    </group>
  );
}

function Star({ brightnessDip = 1.0 }: { brightnessDip: number }) {
  return (
    <group>
      {/* Core Plasma */}
      <mesh>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Inner Corona */}
      <mesh>
        <sphereGeometry args={[2.7, 64, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.6 * brightnessDip} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Deep Space Glow */}
      <mesh>
        <sphereGeometry args={[5.0, 32, 32]} />
        <meshBasicMaterial color="#9a3412" transparent opacity={0.15 * brightnessDip} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#fff7ed" intensity={5 * brightnessDip} distance={300} decay={1.5} />
    </group>
  );
}

export default function SystemVisualizer({ candidate }: { candidate: CandidateData }) {
  const [simState, setSimState] = useState<SimState>('IDLE');
  const [hud, setHudData] = useState({ isTransiting: false, brightnessDip: 1.0, type: "Analyzing...", flux: 100.0, lightCurve: Array(200).fill(100.0) });
  const [isMounted, setIsMounted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [pipelineStage, setPipelineStage] = useState(0);

  useEffect(() => setIsMounted(true), []);

  // Pipeline Replay Animation Sequence
  useEffect(() => {
    if (simState === 'PIPELINE_REPLAY') {
      const stages = [
        "RAW LIGHT CURVE ACQUIRED",
        "WOTAN DETRENDING APPLIED",
        "TLS PERIOD SEARCH EXECUTED",
        "FALSE POSITIVE ANALYSIS",
        "ASTRONET CNN VALIDATION",
        "PLANET LIKELIHOOD INDEX CALCULATED"
      ];
      
      let step = 0;
      const interval = setInterval(() => {
        if (step < stages.length) {
          addLog(`[SYSTEM] ${stages[step]}... OK`);
          setPipelineStage(step + 1);
          step++;
        } else {
          clearInterval(interval);
          setTimeout(() => setSimState('RESULTS'), 1000);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [simState]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]);
  };

  const handleStartSimulation = () => {
    setSimState('TRANSITION');
    setLogs([]);
    setPipelineStage(0);
    setHudData(prev => ({ ...prev, lightCurve: Array(200).fill(100.0) }));
    addLog("OBSERVATION MODE ENGAGED.");
    addLog("Aligning orbital inclination vectors...");
    
    setTimeout(() => {
      setSimState('ORBITING');
      addLog("Monitoring stellar flux.");
    }, 2500);
  };

  if (!candidate || !isMounted) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm animate-pulse">Initializing Telemetry...</div>;
  }

  const distance = Math.max(4.0, (candidate.semi_major_axis || 0.1) * 40);

  // SVG Light Curve Generator
  const points = hud.lightCurve.map((val: number, i: number) => {
    const x = (i / 199) * 200;
    // scale 99.8 to 100.0 into 0 to 60px height. 
    // We auto-scale based on actual depth
    const maxDrop = candidate.transit_depth || 0.005;
    const minVal = 100.0 - (maxDrop * 100 * 1.5);
    const range = 100.0 - minVal;
    const y = 60 - (((val - minVal) / range) * 60);
    return `${x},${Math.max(0, Math.min(60, y))}`;
  }).join(' ');

  const pipelineNodes = [
    { name: "RAW LIGHT CURVE", icon: <BarChart3 className="w-4 h-4" /> },
    { name: "WOTAN DETRENDING", icon: <Activity className="w-4 h-4" /> },
    { name: "TLS PERIOD SEARCH", icon: <Target className="w-4 h-4" /> },
    { name: "FALSE POSITIVE", icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "ASTRONET VALIDATION", icon: <Cpu className="w-4 h-4" /> },
    { name: "PLI SCORING", icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full h-full relative font-sans bg-[#020617] overflow-hidden">
      
      {/* --- IDLE HUD (Original) --- */}
      {simState === 'IDLE' && (
        <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start fade-in">
          <div className="space-y-1 drop-shadow-2xl">
            <h2 className="text-3xl font-extrabold text-white tracking-widest flex items-center gap-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {candidate.target_id}
            </h2>
            <p className="text-sm font-mono text-cyan-400 uppercase tracking-[0.2em]">{hud.type} • ESI {candidate.esi_score}</p>
          </div>
          
          <div className="bg-slate-950/70 backdrop-blur-xl border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-2 shadow-2xl min-w-[220px]">
            <div className="flex justify-between gap-6"><span className="text-slate-500">RADIUS</span> <span className="text-emerald-300">{candidate.radius} R⊕</span></div>
            <div className="flex justify-between gap-6"><span className="text-slate-500">PERIOD</span> <span className="text-white">{candidate.period.toFixed(2)} d</span></div>
            <div className="flex justify-between gap-6"><span className="text-slate-500">SEMI-MAJOR</span> <span className="text-white">{candidate.semi_major_axis?.toFixed(3)} AU</span></div>
            <div className="flex justify-between gap-6"><span className="text-slate-500">EQ TEMP</span> <span className="text-orange-400">{candidate.equilibrium_temp} K</span></div>
          </div>
        </div>
      )}

      {/* --- IDLE START BUTTON --- */}
      {simState === 'IDLE' && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
          <button 
            onClick={handleStartSimulation}
            className="px-8 py-4 bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400 shadow-[0_0_30px_rgba(79,70,229,0.4)] rounded-full font-bold text-sm tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-3 backdrop-blur-md"
          >
            <Play className="w-5 h-5 fill-current" /> Transit Simulation
          </button>
        </div>
      )}

      {/* --- SCIENTIFIC OBSERVATION HUD --- */}
      {simState !== 'IDLE' && simState !== 'RESULTS' && (
        <>
          {/* Top Left: Target Lock & Telemetry */}
          <div className="absolute top-6 left-6 z-10 pointer-events-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              <div className="text-rose-400 font-mono text-xs tracking-[0.3em] font-bold">TARGET LOCK: ACQUIRED</div>
            </div>
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-4 rounded text-[10px] font-mono text-slate-300 space-y-1 shadow-2xl min-w-[250px] uppercase">
              <div className="text-cyan-400 mb-2 border-b border-slate-800 pb-2">MODE: TRANSIT OBSERVATION</div>
              <div className="flex justify-between"><span>MISSION</span> <span className="text-white">{candidate.mission}</span></div>
              <div className="flex justify-between"><span>TARGET</span> <span className="text-white">{candidate.target_id}</span></div>
              <div className="flex justify-between"><span>ORB. PERIOD</span> <span className="text-white">{candidate.period.toFixed(4)} d</span></div>
              <div className="flex justify-between"><span>SEMI-MAJOR</span> <span className="text-white">{candidate.semi_major_axis?.toFixed(4)} AU</span></div>
              <div className="flex justify-between"><span>PL. RADIUS</span> <span className="text-emerald-400">{candidate.radius.toFixed(2)} R⊕</span></div>
              <div className="flex justify-between border-t border-slate-800 mt-2 pt-2 text-rose-400 font-bold tracking-widest">
                <span>EST. TRANSIT DEPTH</span> 
                <span>{candidate.transit_depth ? (candidate.transit_depth * 100).toFixed(4) : '--'}%</span>
              </div>
            </div>
          </div>

          {/* Center Pulsing Indicator */}
          {simState === 'TRANSIT_ACTIVE' && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center">
              <div className="text-rose-500 font-black text-2xl tracking-[0.5em] animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">
                TRANSIT ACTIVE
              </div>
              <div className="mt-2 text-rose-400/80 font-mono text-xs uppercase tracking-widest">
                Measuring Stellar Flux Attenuation
              </div>
            </div>
          )}

          {/* Bottom Left: Event Logs */}
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none w-[400px]">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-3 rounded text-[11px] font-mono shadow-2xl">
              <div className="text-slate-500 mb-2 uppercase border-b border-slate-800 pb-1">Instrument Logs</div>
              <div className="space-y-1 h-[70px] flex flex-col justify-end">
                {logs.map((log, i) => (
                  <div key={i} className={`animate-fade-in ${i === logs.length - 1 ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Right: Live Light Curve */}
          <div className="absolute bottom-6 right-6 z-10 pointer-events-none w-[350px]">
            <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-4 rounded shadow-2xl">
              <div className="flex justify-between items-end mb-3 border-b border-slate-800 pb-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Relative Stellar Flux</div>
                <div className={`font-mono font-bold text-lg ${simState === 'TRANSIT_ACTIVE' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {hud.flux.toFixed(4)}%
                </div>
              </div>
              <div className="h-[60px] w-full relative border-l border-b border-slate-700/50">
                <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                  <path 
                    d={`M 0,${60 - (((hud.lightCurve[0] - (100.0 - ((candidate.transit_depth || 0.005) * 100 * 1.5))) / ((candidate.transit_depth || 0.005) * 100 * 1.5)) * 60)} L ${points}`} 
                    fill="none" 
                    stroke={simState === 'TRANSIT_ACTIVE' ? '#fb7185' : '#38bdf8'} 
                    strokeWidth="2" 
                    strokeLinejoin="round" 
                  />
                  {/* Current position marker */}
                  <circle cx="200" cy={points.split(' ').pop()?.split(',')[1] || 0} r="3" fill="#fff" className="animate-pulse" />
                </svg>
                {/* Axes Labels */}
                <div className="absolute -bottom-5 left-0 text-[8px] font-mono text-slate-500">TIME</div>
                <div className="absolute top-0 -left-8 text-[8px] font-mono text-slate-500">FLUX</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- PIPELINE REPLAY OVERLAY --- */}
      {simState === 'PIPELINE_REPLAY' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl max-w-lg w-full">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.2em] mb-6 text-center">
              EXONYX Signal Processing Pipeline
            </h3>
            <div className="space-y-4">
              {pipelineNodes.map((node, i) => {
                const isActive = pipelineStage > i;
                const isCurrent = pipelineStage === i + 1;
                return (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded border transition-all duration-500 ${
                    isActive 
                      ? 'bg-indigo-900/30 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}>
                    <div className={`p-2 rounded-full ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900'}`}>
                      {node.icon}
                    </div>
                    <div className="flex-1 font-mono text-xs tracking-wider">
                      {node.name}
                    </div>
                    {isCurrent && <div className="text-[10px] text-indigo-400 animate-pulse font-mono uppercase">Processing...</div>}
                    {pipelineStage > i + 1 && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- FINAL RESULTS SCREEN --- */}
      {simState === 'RESULTS' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md modal-enter">
          <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] max-w-2xl w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            
            <div className="inline-flex items-center justify-center p-4 bg-emerald-900/30 rounded-full mb-6">
              <ShieldCheck className="w-12 h-12 text-emerald-400" />
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-[0.2em] mb-2">TRANSIT CONFIRMED</h2>
            <p className="text-slate-400 font-mono text-sm mb-8">Signal verified by autonomous pipeline.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">Transit Depth</div>
                <div className="text-lg font-bold text-white">{(candidate.transit_depth ? candidate.transit_depth * 100 : 0).toFixed(4)}%</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">TLS Strength</div>
                <div className="text-lg font-bold text-cyan-400">{candidate.sde_confidence?.toFixed(1) || '--'} SDE</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider">CNN Score</div>
                <div className="text-lg font-bold text-indigo-400">{candidate.cnn_confidence?.toFixed(1) || '--'}%</div>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
                <div className="text-[10px] text-emerald-500 font-mono mb-1 uppercase tracking-wider">Final PLI</div>
                <div className="text-2xl font-black text-emerald-400">{candidate.pli_score?.toFixed(1) || '--'}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => setSimState('IDLE')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs tracking-widest uppercase transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Investigation
              </button>
              <button 
                onClick={handleStartSimulation}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs tracking-widest uppercase transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Replay Detection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- THREE.JS CANVAS --- */}
      <Canvas camera={{ position: [distance * 1.5, distance * 0.8, distance * 2.0], fov: 45 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <color attach="background" args={['#020617']} />
        
        {/* Background Space */}
        <ambientLight intensity={0.15} />
        <Stars radius={150} depth={50} count={5000} factor={6} saturation={0.8} fade speed={1.5} />
        
        {/* Physics Objects */}
        <Star brightnessDip={hud.brightnessDip} />
        <HabitableZone distance={distance} />
        <OrbitingPlanet 
          candidate={candidate}
          simState={simState}
          setSimState={setSimState}
          setHudData={setHudData}
          onLogMessage={addLog}
        />
        
        {/* Camera Logic */}
        <CameraController simState={simState} distance={distance} />

        {/* Cinematic Post Processing */}
        <EffectComposer multisampling={4}>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.2} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
