'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle, Info, Clock, Download, Loader2, BrainCircuit } from 'lucide-react';
import SystemVisualizer from '@/components/SystemVisualizer';
import AstroChatAssistant from '@/components/AstroChatAssistant';
import MCMCDiagnostics from '@/components/MCMCDiagnostics';

export default function CandidateInvestigationCenter() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notebook' | 'chat'>('notebook');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/candidate/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCandidate(data.candidate);
          setNotes(data.candidate.notes || "");
        }
      })
      .catch(console.error);
  }, [id]);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/candidate/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
    } catch (e) {
      console.error(e);
    }
    setIsSavingNotes(false);
  };

  const handleExportReport = async () => {
    if (!candidate) return;
    setIsDownloading(true);
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/report/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_name: String(candidate.target_id),
          mission: String(candidate.mission),
          analysis_data: candidate
        })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EXONYX_Report_${candidate.target_id}.pdf`;
      a.click();
    } catch (error) {
      console.error('Failed to export report', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!candidate) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading candidate data...</p>
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Case File: {candidate.target_id} 
              <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${candidate.status === 'PASS' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : candidate.status === 'FAIL' ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30'}`}>
                {candidate.status}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Mission: {candidate.mission} | PLI: <span className="text-white font-bold">{candidate.pli_score}</span></p>
          </div>
        </div>
        <button 
          onClick={handleExportReport}
          disabled={isDownloading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg shadow transition flex items-center gap-2"
        >
          {isDownloading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
          ) : (
            <><Download className="w-4 h-4" /> Export Report</>
          )}
        </button>
      </header>

      {/* Candidate Timeline */}
      <div className="flex gap-4 items-center bg-slate-900/50 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-400">
        <Clock className="w-4 h-4 text-slate-500" />
        <span><strong className="text-slate-300">Detected:</strong> {formatDate(candidate.detection_date)}</span> |
        <span><strong className="text-slate-300">Analyzed:</strong> {formatDate(candidate.analysis_date)}</span> |
        <span><strong className="text-slate-300">Validated:</strong> {formatDate(candidate.validation_date)}</span> |
        <span><strong className="text-slate-300">Last Updated:</strong> {formatDate(candidate.last_updated)}</span>
      </div>

      {/* Hero Visualization */}
      <section className="w-full h-[600px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-2xl">
        <SystemVisualizer candidate={candidate} />
      </section>

      {/* MCMC Diagnostics */}
      <MCMCDiagnostics candidateId={candidate.id} />

      {/* Scientific Metrics & Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Physical Parameters
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2"><span className="text-slate-400">Radius (R⊕)</span><span className="font-mono text-emerald-300 font-medium">{candidate.radius} ± {candidate.radius_err}</span></div>
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2"><span className="text-slate-400">Period (d)</span><span className="font-mono text-white font-medium">{candidate.period.toFixed(4)} ± {candidate.period_err?.toFixed(4)}</span></div>
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2"><span className="text-slate-400">Semi-Major Axis (AU)</span><span className="font-mono text-white font-medium">{candidate.semi_major_axis?.toFixed(4)} ± {candidate.semi_major_axis_err?.toFixed(4)}</span></div>
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2"><span className="text-slate-400">Duration (h)</span><span className="font-mono text-white font-medium">{candidate.transit_duration.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Eq Temp (K)</span><span className="font-mono text-orange-400 font-medium">{candidate.equilibrium_temp} ± {candidate.equilibrium_temp_err}</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div> Validation Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2 items-center"><span className="text-slate-400">FP Risk</span><span className="font-mono text-red-400 font-medium">{candidate.fp_risk}%</span></div>
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2 items-center"><span className="text-slate-400">CNN Conv</span>{candidate.cnn_confidence !== null && candidate.cnn_confidence !== undefined ? <span className="font-mono text-blue-400 font-medium">{candidate.cnn_confidence.toFixed(1)}%</span> : <span className="text-xs text-slate-500 border border-slate-800 px-1.5 rounded bg-slate-950">UNAVAILABLE</span>}</div>
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2 items-center"><span className="text-slate-400">SDE Power</span><span className="font-mono text-white font-medium">{candidate.sde_confidence}</span></div>
            <div className="flex justify-between text-sm items-center"><span className="text-slate-400">Reduced X²</span><span className="font-mono text-white font-medium">{candidate.reduced_chi_square?.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Habitability
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm border-b border-slate-800/50 pb-2"><span className="text-slate-400">ESI Score</span><span className="font-mono text-green-400 font-medium">{candidate.esi_score} ± {candidate.esi_score_err?.toFixed(1)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">HZ Centricity</span><span className="font-mono text-white font-medium">{candidate.hz_score}%</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <h3 className="text-sm text-slate-300 font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> False Positive Assessment Log</h3>
           <div className="bg-slate-950 rounded-lg p-4 border border-slate-800/50 h-64 overflow-y-auto">
             <p className="text-sm font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">{candidate.validation_summary}</p>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col min-h-[400px]">
          <div className="flex border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('notebook')}
              className={`flex-1 py-3 text-sm font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'notebook' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/50 rounded-tl-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded-tl-xl'
              }`}
            >
              <Info className="w-4 h-4" /> Research Notebook
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'chat' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800/50 rounded-tr-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded-tr-xl'
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> Astro-Chat Assistant
            </button>
          </div>

          <div className="flex-1 p-5 flex flex-col">
            {activeTab === 'notebook' ? (
              <>
                <textarea
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 transition shadow-inner"
                  placeholder="Add scientific observations, hypotheses, or external catalog links here..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <button 
                  onClick={handleSaveNotes}
                  className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold tracking-wide transition text-white flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Save className="w-4 h-4" /> {isSavingNotes ? "Saving..." : "Save Notes"}
                </button>
              </>
            ) : (
              <AstroChatAssistant candidateId={candidate.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
