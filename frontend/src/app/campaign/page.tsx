'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, UploadCloud, Activity, CheckCircle, XCircle, AlertTriangle, ListFilter, Target, Search, FileText, Ban, ServerCrash } from 'lucide-react';
import CampaignCatalogModal from '@/components/CampaignCatalogModal';

interface TargetResult {
  target_id: string;
  mission: string;
  result_status: string;
  pli?: number;
  esi?: number;
  radius?: number;
  period?: number;
  fp_risk?: number;
  message?: string;
}

export default function CampaignDashboard() {
  const [inputText, setInputText] = useState('');
  const [mission, setMission] = useState('Kepler');
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [results, setResults] = useState<TargetResult[]>([]);
  
  const [telemetry, setTelemetry] = useState({
    uploaded: 0, processed: 0, candidates: 0,
    highPriority: 0, rejected: 0, failed: 0, pliSum: 0
  });

  const ws = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTargetList = () => inputText.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
  const currentCount = getTargetList().length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const existing = new Set(getTargetList());
        const newTargets = text.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0 && !existing.has(t));
        setInputText(prev => prev.trim().length > 0 ? prev + ',\n' + newTargets.join(',\n') : newTargets.join(',\n'));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLaunch = () => {
    const rawTargets = getTargetList();
    if (rawTargets.length === 0) return;
    if (rawTargets.length > 100) {
      alert("Campaign limit exceeded. Maximum 100 targets per batch.");
      return;
    }

    const targetPayload = rawTargets.map(t => ({ target_id: t, mission }));
    setResults(targetPayload.map(t => ({ target_id: t.target_id, mission: t.mission, result_status: 'Queued' })));
    setTelemetry({ uploaded: targetPayload.length, processed: 0, candidates: 0, highPriority: 0, rejected: 0, failed: 0, pliSum: 0 });
    setIsRunning(true);
    setIsFinished(false);

    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'ws://127.0.0.1:8000').replace('http', 'ws') + '/api/v1/survey/batch';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => { ws.current?.send(JSON.stringify({ targets: targetPayload })); };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'target_update') {
        setResults(prev => prev.map(r => r.target_id === data.target_id ? { ...r, result_status: data.status } : r));
      } else if (data.type === 'target_result') {
        setResults(prev => prev.map(r => r.target_id === data.target_id ? {
          ...r, result_status: data.result_status, pli: data.pli, esi: data.esi,
          radius: data.radius, period: data.period, fp_risk: data.fp_risk, message: data.message
        } : r));
        setTelemetry(prev => {
          const s = data.result_status;
          return {
            ...prev, processed: prev.processed + 1,
            candidates: prev.candidates + (s === 'Candidate' || s === 'Review Required' ? 1 : 0),
            highPriority: prev.highPriority + (s === 'High Priority' ? 1 : 0),
            rejected: prev.rejected + (s === 'Rejected' ? 1 : 0),
            failed: prev.failed + (s === 'Failed' || s === 'Target Not Found' ? 1 : 0),
            pliSum: prev.pliSum + (data.pli || 0)
          };
        });
      } else if (data.type === 'campaign_finished') {
        setIsRunning(false);
        setIsFinished(true);
        ws.current?.close();
      } else if (data.type === 'error') {
        setIsRunning(false);
      }
    };
    ws.current.onclose = () => { setIsRunning(false); };
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'High Priority': return { color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-500/50', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      case 'Candidate': return { color: 'text-indigo-400', bg: 'bg-indigo-900/30 border-indigo-500/50', icon: <Activity className="w-3.5 h-3.5" /> };
      case 'Review Required': return { color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-500/50', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
      case 'Rejected': return { color: 'text-red-400', bg: 'bg-red-900/30 border-red-500/50', icon: <XCircle className="w-3.5 h-3.5" /> };
      case 'Target Not Found': return { color: 'text-slate-400', bg: 'bg-slate-800 border-slate-600', icon: <Ban className="w-3.5 h-3.5" /> };
      case 'Failed': return { color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-500/50', icon: <ServerCrash className="w-3.5 h-3.5" /> };
      case 'Processing': return { color: 'text-cyan-400', bg: 'bg-cyan-900/30 border-cyan-500/50 animate-pulse', icon: <Activity className="w-3.5 h-3.5 animate-spin" /> };
      case 'Queued': return { color: 'text-slate-500', bg: 'bg-slate-800/50 border-slate-700', icon: null };
      default: return { color: 'text-slate-500', bg: 'bg-slate-800 border-slate-700', icon: null };
    }
  };

  const isNonScientific = (status: string) => ['Failed', 'Target Not Found'].includes(status);
  const avgPli = telemetry.processed > 0 ? (telemetry.pliSum / telemetry.processed).toFixed(1) : '—';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8">
      {isCatalogOpen && <CampaignCatalogModal onClose={() => setIsCatalogOpen(false)} onSelectTargets={(t) => setInputText(t)} />}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Main Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-3">
              <Target className="w-8 h-8 text-indigo-400" /> High-Throughput Survey Campaign
            </h1>
            <p className="text-slate-400 mt-2">Autonomous multi-target batch processing and triage</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isRunning ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-sm font-semibold tracking-wider uppercase">{isRunning ? 'Campaign Active' : 'Standby'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Target Ingestion */}
          <div className="lg:col-span-1 space-y-6">
            <div className="exo-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-400" /> Target Ingestion
                </h2>
                <button onClick={() => setIsCatalogOpen(true)} className="text-xs bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 transition flex items-center gap-1">
                  <Search className="w-3 h-3" /> Browse Catalog
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">Mission Catalog</label>
                  <select value={mission} onChange={(e) => setMission(e.target.value)} disabled={isRunning}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded p-2 focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="Kepler">Kepler (KIC / Kepler-N)</option>
                    <option value="K2">K2 (EPIC)</option>
                    <option value="TESS">TESS (TIC / TOI-N)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs text-slate-500 uppercase tracking-wider">Target IDs / Names</label>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
                      <FileText className="w-3 h-3" /> Import CSV/TXT
                    </button>
                    <input type="file" accept=".txt,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  </div>
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isRunning}
                    placeholder="e.g. Kepler-10, Kepler-22, TOI-700, TRAPPIST-1, 11442793..."
                    className={`w-full h-48 bg-slate-950 border text-slate-300 rounded p-3 text-sm font-mono resize-none focus:outline-none transition-colors ${currentCount > 100 ? 'border-red-500' : currentCount > 50 ? 'border-amber-500' : 'border-slate-800 focus:border-indigo-500'}`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs ${currentCount > 100 ? 'text-red-400 font-bold' : currentCount > 50 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {currentCount} targets loaded
                    </span>
                    {currentCount > 50 && currentCount <= 100 && <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> High load</span>}
                    {currentCount > 100 && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3"/> Limit exceeded</span>}
                  </div>
                </div>
                <button onClick={handleLaunch} disabled={isRunning || currentCount === 0 || currentCount > 100}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold tracking-wide uppercase rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                  <Play className="w-4 h-4" /> {isRunning ? 'Processing...' : 'Launch Campaign'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Mission Control */}
          <div className="lg:col-span-3 space-y-6">
            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="exo-card p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Queue</p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-slate-200">{telemetry.processed}</span>
                  <span className="text-sm text-slate-500 mb-1">/ {telemetry.uploaded}</span>
                </div>
              </div>
              <div className="exo-card p-4">
                <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> High Priority</p>
                <p className="text-3xl font-bold text-emerald-400">{telemetry.highPriority}</p>
              </div>
              <div className="exo-card p-4">
                <p className="text-[10px] text-indigo-500/70 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Candidates</p>
                <p className="text-3xl font-bold text-indigo-400">{telemetry.candidates}</p>
              </div>
              <div className="exo-card p-4">
                <p className="text-[10px] text-red-500/70 uppercase tracking-widest mb-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</p>
                <p className="text-3xl font-bold text-red-400">{telemetry.rejected}</p>
              </div>
              <div className="exo-card p-4">
                <p className="text-[10px] text-orange-500/70 uppercase tracking-widest mb-1 flex items-center gap-1"><ServerCrash className="w-3 h-3"/> Failed</p>
                <p className="text-3xl font-bold text-orange-400">{telemetry.failed}</p>
              </div>
            </div>

            {/* Live Queue Table */}
            <div className="exo-card overflow-hidden flex flex-col h-[500px]">
              <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-cyan-400" /> Live Mission Control Queue
                </h2>
                <div className="text-xs font-mono text-slate-400">AVG PLI: <span className="text-cyan-400">{avgPli}</span></div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 p-0">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-500 sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium">Target ID</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">PLI Score</th>
                      <th className="px-6 py-3 font-medium">ESI</th>
                      <th className="px-6 py-3 font-medium">Radius (R⊕)</th>
                      <th className="px-6 py-3 font-medium">Period (d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-20 text-slate-600">
                        <Target className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No targets ingested. Upload target IDs or browse the catalog to begin.</p>
                      </td></tr>
                    ) : results.map((r, i) => {
                      const style = getStatusStyle(r.result_status);
                      return (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-slate-300">{r.target_id}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${style.color} ${style.bg}`}>
                              {style.icon} {r.result_status}
                            </span>
                          </td>
                          {(r.result_status === 'Rejected' || isNonScientific(r.result_status)) && r.message ? (
                            <td colSpan={4} className="px-6 py-4">
                              <div className={`text-xs flex items-center gap-2 ${isNonScientific(r.result_status) ? 'text-orange-400/80' : 'text-red-400/80'}`}>
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{r.message}</span>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="px-6 py-4 font-mono">{r.pli !== undefined ? r.pli.toFixed(1) : '—'}</td>
                              <td className="px-6 py-4 font-mono">{r.esi !== undefined ? r.esi.toFixed(2) : '—'}</td>
                              <td className="px-6 py-4 font-mono">{r.radius !== undefined ? r.radius.toFixed(2) : '—'}</td>
                              <td className="px-6 py-4 font-mono">{r.period !== undefined ? r.period.toFixed(2) : '—'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {isFinished && (
                <div className="bg-emerald-900/20 border-t border-emerald-900/50 p-3 text-center text-emerald-400 text-sm font-bold tracking-wide flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> CAMPAIGN FINISHED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
