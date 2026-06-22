"use client";

import React, { useState, useRef, useEffect } from 'react';
import SimulatorModal from '@/components/SimulatorModal';
import CandidateDBModal from '@/components/CandidateDBModal';
import PLIScoreCard from '@/components/PLIScoreCard';
import HabitabilityPanel from '@/components/HabitabilityPanel';
import LightCurveViewer from '@/components/LightCurveViewer';
import CandidateTable from '@/components/CandidateTable';
import CosmicLoader from '@/components/CosmicLoader';
import dynamic from 'next/dynamic';
import { Telescope, Search, Database, LayoutDashboard, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ResearchWorkspace() {
  const [targetName, setTargetName] = useState('Kepler-452');
  const [mission, setMission] = useState('Kepler');
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCandidateDBOpen, setIsCandidateDBOpen] = useState(false);
  const candidateTableRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'comparison' | 'raw' | 'detrended'>('comparison');
  const [metadata, setMetadata] = useState<any>(null);
  const [deepRecoveryMode, setDeepRecoveryMode] = useState(false);
  const [deepRecoveryRecommended, setDeepRecoveryRecommended] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState<number | undefined>(undefined);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [realPercent, setRealPercent] = useState(0);
  const [realStage, setRealStage] = useState('Connecting to MAST Archive...');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  
  const [data, setData] = useState({
    time: Array.from({length: 100}, (_, i) => i * 0.1),
    raw_flux: Array.from({length: 100}, () => 1 + (Math.random() - 0.5) * 0.01),
    clean_flux: Array.from({length: 100}, () => 1 + (Math.random() - 0.5) * 0.002),
    is_transit: Array.from({length: 100}, () => false)
  });

  const [pliData, setPliData] = useState({
    score: 0,
    breakdown: { tls: 0, cnn: 0, quality: 0, consistency: 0, fp_rejection: 0 }
  });

  const [habitabilityData, setHabitabilityData] = useState({
    esi: 0,
    hzScore: 0,
    isHabitable: false,
    temp: "N/A"
  });


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (q: string, m: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSuggesting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/targets/search?q=${encodeURIComponent(q)}&mission=${encodeURIComponent(m)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      if (data.suggestions && data.suggestions.length > 0) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch(e) {
      console.error("Failed to fetch suggestions");
    }
    setIsSuggesting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      setTargetName(suggestions[highlightIndex]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleRunSimulation = async (difficulty: string) => {
    setIsSimulatorOpen(false);
    setIsLoading(true);
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty })
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setData(result.data);
        setMetadata({
            targetid: `SIM-${difficulty.toUpperCase()}`,
            mission: "Simulation",
            ra: 0.0,
            dec: 0.0,
            obs_count: result.data.time.length,
            obs_span_days: result.data.time[result.data.time.length - 1] - result.data.time[0],
            signal_quality: difficulty === 'easy' ? 95 : difficulty === 'medium' ? 75 : 40,
            noise_reduction_pct: 0.0,
            validation_summary: result.validation_summary,
            characterization: {
              planet_radius_earth: 2.0,
              planet_radius_err: 0.1,
              period_days: result.validation_summary.period,
              period_err: 0.0,
              semi_major_axis_au: 1.0,
              semi_major_axis_err: 0.0,
              transit_duration_hours: 4.0,
              transit_depth: result.validation_summary.depth
            },
            fit: { reduced_chi_square: 1.0 }
        });
        setPliData(result.pli);
        setHabitabilityData(result.habitability);
      } else {
        alert("Simulation failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Error connecting to Simulator API.");
    }
    setIsLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFetchComplete(false);
    setRealPercent(0);
    setRealStage('Connecting to MAST Archive...');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/api/v1/data/stream';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({ target_name: targetName, mission, deep_recovery_mode: deepRecoveryMode }));
      };
      
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'progress') {
          setRealPercent(msg.percent);
          setRealStage(msg.stage);
        } else if (msg.type === 'complete') {
          const result = msg.data;
          
          if (result.status === 'success') {
            setData(result.data);
            setMetadata({
                ...result.metadata,
                validation_summary: result.validation_summary,
                characterization: result.characterization,
                fit: result.fit
            });
            setDeepRecoveryRecommended(result.deep_recovery_recommended || false);
            setPliData(result.pli);
            setHabitabilityData(result.habitability);
            
            // Trigger completion animation
            setRealPercent(100);
            setRealStage('Candidate Identified');
            setFetchComplete(true);
            setTimeout(() => {
              setIsLoading(false);
              setFetchComplete(false);
            }, 1500);
          } else {
            alert("Failed to load data: " + (result.detail || result.message || "Unknown error"));
            setIsLoading(false);
          }
        } else if (msg.type === 'error') {
          alert("Pipeline Error: " + msg.message);
          setIsLoading(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        alert("Error connecting to EXONYX Backend.");
        setIsLoading(false);
      };

    } catch (error) {
      console.error("Error creating WebSocket:", error);
      alert("Error connecting to EXONYX Backend.");
      setIsLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!metadata || !pliData) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/report/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_name: String(metadata.targetid || targetName),
          mission: String(metadata.mission || mission),
          analysis_data: {
            timeseries_data: data,
            pli: pliData,
            habitability: habitabilityData,
            obs_count: metadata.obs_count || 0,
            obs_span_days: metadata.obs_span_days ? metadata.obs_span_days.toFixed(1) : 0,
            validation_summary: metadata.validation_summary || "",
            period: metadata.characterization?.period_days || metadata.validation_summary?.period || 0,
            period_err: metadata.characterization?.period_err || 0,
            transit_depth: metadata.characterization?.transit_depth || metadata.validation_summary?.depth || 0,
            sde_confidence: metadata.validation_summary?.power_spectrum?.power?.[0] || 0,
            cnn_confidence: metadata.validation_summary?.cnn_confidence || 'N/A',
            fp_risk: metadata.validation_summary?.fp_risk || 0,
            radius: metadata.characterization?.planet_radius_earth || 0,
            radius_err: metadata.characterization?.planet_radius_err || 0,
            semi_major_axis: metadata.characterization?.semi_major_axis_au || 0,
            semi_major_axis_err: metadata.characterization?.semi_major_axis_err || 0,
            transit_duration: metadata.characterization?.transit_duration_hours || 0,
            reduced_chi_square: metadata.fit?.reduced_chi_square || 0,
            esi_score: habitabilityData.esi,
            esi_score_err: 0.1,
            hz_score: habitabilityData.hzScore,
            equilibrium_temp: habitabilityData.temp,
            equilibrium_temp_err: 15.0,
            analysis_date: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EXONYX_Report_${targetName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate report.");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 flex flex-col relative">
      {isLoading && <CosmicLoader isComplete={fetchComplete} realPercent={realPercent} realStage={realStage} />}
      {/* Top Navbar */}
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-900/40 rounded-lg border border-blue-500/50">
            <Telescope className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white tracking-tight">EXONYX Research Workspace</h1>
              {metadata?.mission === "Simulation" && (
                <span className="px-3 py-1 bg-red-900/80 border border-red-500 text-red-200 text-xs font-bold rounded shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                  SIMULATION
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-1">Real Data Hub & Validation Engine</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleDownloadReport}
             disabled={!metadata || isDownloading}
             className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-sm font-medium transition text-white flex items-center gap-2"
           >
             {isDownloading ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
             ) : (
               "Download PDF Report"
             )}
           </button>
           <button onClick={() => setIsSimulatorOpen(true)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-700 transition flex items-center gap-2">
             <LayoutDashboard className="w-4 h-4"/> Simulator
           </button>
           <Link href="/campaign" className="px-4 py-2 bg-yellow-600/80 hover:bg-yellow-500 rounded-lg text-sm font-medium transition text-white flex items-center gap-2">
             <Zap className="w-4 h-4"/> Survey Campaign
           </Link>
           <button onClick={() => setIsCandidateDBOpen(true)} className="px-4 py-2 bg-emerald-700/80 hover:bg-emerald-600 rounded-lg text-sm font-medium transition text-white flex items-center gap-2">
             <Database className="w-4 h-4"/> Candidate DB
           </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex gap-4 flex-1">
        
        {/* LEFT PANEL: Data Hub */}
        <aside className="w-72 flex flex-col gap-4 shrink-0">
          <div className="glass-panel p-5 rounded-xl relative z-20">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" /> Target Search
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mission</label>
                <select 
                  value={mission} 
                  onChange={e => setMission(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Kepler">Kepler</option>
                  <option value="K2">K2</option>
                  <option value="TESS">TESS</option>
                </select>
              </div>
              <div className="relative" ref={autocompleteRef}>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex justify-between">
                  <span>Target Identifier</span>
                  {isSuggesting && <span className="text-blue-400 animate-pulse text-[10px]">Searching catalogs...</span>}
                </label>
                <input 
                  type="text" 
                  value={targetName}
                  onChange={e => {
                    const val = e.target.value;
                    setTargetName(val);
                    setHighlightIndex(-1);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      fetchSuggestions(val, mission);
                    }, 150);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="e.g. Kepler-452 or TOI-700"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  autoComplete="off"
                />
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {suggestions.map((suggestion, index) => (
                      <div 
                        key={suggestion}
                        onMouseDown={() => {
                          setTargetName(suggestion);
                          setShowSuggestions(false);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                          index === highlightIndex 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {suggestion}
                      </div>
                    ))}
                    {suggestions.length === 0 && !isSuggesting && targetName.length >= 2 && (
                      <div className="px-3 py-2 text-sm text-slate-500 italic">
                        No confirmed matches. Manual entry allowed.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="deep_mode" 
                  checked={deepRecoveryMode}
                  onChange={e => setDeepRecoveryMode(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-600"
                />
                <label htmlFor="deep_mode" className="text-xs text-slate-400">Deep Recovery Mode (Slower)</label>
              </div>
              
              {deepRecoveryRecommended && !deepRecoveryMode && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-300 animate-pulse">
                  <AlertTriangle className="w-4 h-4 inline mr-1 mb-0.5" />
                  <strong>Deep Recovery Mode Recommended:</strong> Borderline SDE or sparse transits detected. Enable deep mode to stitch full baseline.
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2 rounded-lg transition text-sm"
              >
                {isLoading ? 'Querying MAST...' : 'Fetch Observations'}
              </button>
            </form>
          </div>

          <div className="glass-panel p-5 rounded-xl flex-1">
            <h2 className="text-lg font-semibold text-white mb-4">Metadata</h2>
            {metadata ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Target ID</span>
                  <span className="text-slate-200 font-mono">{metadata.targetid}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Mission</span>
                  <span className="text-slate-200">{metadata.mission}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Right Ascension</span>
                  <span className="text-slate-200">{metadata.ra?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Declination</span>
                  <span className="text-slate-200">{metadata.dec?.toFixed(4)}</span>
                </div>
                {metadata.obs_count && (
                  <>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Observations</span>
                      <span className="text-slate-200">{metadata.obs_count} points</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Time Span</span>
                      <span className="text-slate-200">{metadata.obs_span_days?.toFixed(1)} days</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Signal Quality</span>
                      <span className="text-slate-200">{metadata.signal_quality?.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Wōtan Noise Red.</span>
                      <span className="text-emerald-400">-{metadata.noise_reduction_pct?.toFixed(1)}%</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">No data loaded.</p>
            )}
          </div>
        </aside>

        {/* CENTER PANEL: Visualizations */}
        <main className="flex-1 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              EXONYX V5
            </h1>
            <p className="text-slate-400 mt-2">High-Performance Local Research Platform</p>
          </div>
          <div className="flex gap-4">
            <Link href="/survey" className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Survey Engine
            </Link>
            <div className="flex gap-2">
              <button onClick={() => setViewMode('raw')} className={`px-2 py-1 rounded text-xs transition ${viewMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Raw</button>
              <button onClick={() => setViewMode('detrended')} className={`px-2 py-1 rounded text-xs transition ${viewMode === 'detrended' ? 'bg-emerald-600 text-white' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-800/60'}`}>Detrended</button>
              <button onClick={() => setViewMode('comparison')} className={`px-2 py-1 rounded text-xs transition ${viewMode === 'comparison' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/50 hover:bg-indigo-800/60'}`}>Comparison</button>
            </div>
          </div>
        </div>
            <div className="flex-1 w-full bg-slate-900/50 rounded-lg border border-slate-800 min-h-0">
              {viewMode === 'raw' && <LightCurveViewer data={{...data, clean_flux: undefined}} showClean={false} />}
              {viewMode === 'detrended' && <LightCurveViewer data={{...data, raw_flux: data.clean_flux || data.raw_flux}} showClean={false} />}
              {viewMode === 'comparison' && <LightCurveViewer data={data} showClean={true} />}
            </div>
          </div>

        {/* BOTTOM PANEL: Explainability & Spectrum */}
          <div className="glass-panel p-4 rounded-xl h-72 shrink-0 flex gap-4">
             {/* TLS Power Spectrum */}
             <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 text-sm font-semibold text-white">TLS Power Spectrum</div>
                <div className="flex-1 w-full min-h-0">
                  {metadata && data && (
                    <Plot
                      data={[{
                        x: metadata.validation_summary?.power_spectrum?.periods || [],
                        y: metadata.validation_summary?.power_spectrum?.power || [],
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: 'rgba(236, 72, 153, 0.8)', width: 1.5 },
                      }] as any}
                      layout={{
                        autosize: true, margin: { t: 10, r: 10, b: 30, l: 40 },
                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                        xaxis: { title: 'Period (days)', gridcolor: '#334155', tickfont: { color: '#94a3b8' } },
                        yaxis: { title: 'SDE Power', gridcolor: '#334155', tickfont: { color: '#94a3b8' } },
                        shapes: [
                          {
                            type: 'line',
                            y0: 7.0, y1: 7.0,
                            x0: 0, x1: 1, xref: 'paper', yref: 'y',
                            line: { color: 'rgba(239, 68, 68, 0.8)', width: 1, dash: 'dash' }
                          },
                          metadata?.validation_summary?.period ? {
                            type: 'line',
                            x0: metadata.validation_summary.period, x1: metadata.validation_summary.period,
                            y0: 0, y1: 1, xref: 'x', yref: 'paper',
                            line: { color: 'rgba(52, 211, 153, 0.8)', width: 1, dash: 'dot' }
                          } : {}
                        ]
                      } as any}
                      useResizeHandler={true} style={{ width: '100%', height: '100%' }}
                      config={{ displayModeBar: false, responsive: true }}
                    />
                  )}
                </div>
             </div>
             

          </div>
        </main>

        {/* RIGHT PANEL: Scientific Analysis */}
        <aside className="w-80 flex flex-col gap-4 shrink-0">
          <div className="shrink-0">
            <PLIScoreCard score={pliData.score} breakdown={pliData.breakdown} />
          </div>
          <div className="flex-1 shrink-0">
            <HabitabilityPanel 
              esi={habitabilityData.esi} 
              hzScore={habitabilityData.hzScore} 
              isHabitable={habitabilityData.isHabitable} 
              temp={habitabilityData.temp}
            />
          </div>
        </aside>

      </div>
      <SimulatorModal 
        isOpen={isSimulatorOpen} 
        onClose={() => setIsSimulatorOpen(false)} 
        onRun={handleRunSimulation} 
      />
      <CandidateDBModal
        isOpen={isCandidateDBOpen}
        onClose={() => setIsCandidateDBOpen(false)}
      />
    </div>
  );
}
