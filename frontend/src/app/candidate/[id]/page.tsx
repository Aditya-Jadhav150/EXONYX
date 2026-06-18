'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle, Info, Clock, Download } from 'lucide-react';
import SystemVisualizer from '@/components/SystemVisualizer';

export default function CandidateInvestigationCenter() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

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
    }
  };

  if (!candidate) return <div className="p-10 text-white">Loading candidate data...</div>;

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
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export Report
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

      <div className="flex gap-6">
        {/* Main Content */}
        <main className="flex-[3] flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Physical Parameters</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Radius (R⊕)</span><span className="font-mono text-emerald-300">{candidate.radius} ± {candidate.radius_err}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Period (d)</span><span className="font-mono text-white">{candidate.period.toFixed(4)} ± {candidate.period_err?.toFixed(4)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Semi-Major Axis (AU)</span><span className="font-mono text-white">{candidate.semi_major_axis?.toFixed(4)} ± {candidate.semi_major_axis_err?.toFixed(4)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Duration (h)</span><span className="font-mono text-white">{candidate.transit_duration.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Eq Temp (K)</span><span className="font-mono text-orange-300">{candidate.equilibrium_temp} ± {candidate.equilibrium_temp_err}</span></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Validation Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center"><span className="text-slate-500">FP Risk</span><span className="font-mono text-red-300">{candidate.fp_risk}%</span></div>
                <div className="flex justify-between text-sm items-center"><span className="text-slate-500">CNN Conv</span>{candidate.cnn_confidence !== null && candidate.cnn_confidence !== undefined ? <span className="font-mono text-blue-400">{candidate.cnn_confidence.toFixed(1)}%</span> : <span className="text-xs text-slate-400 border border-slate-700 px-1.5 rounded">UNAVAILABLE</span>}</div>
                <div className="flex justify-between text-sm items-center"><span className="text-slate-500">SDE Power</span><span className="font-mono text-white">{candidate.sde_confidence}</span></div>
                <div className="flex justify-between text-sm items-center"><span className="text-slate-500">Reduced X²</span><span className="font-mono text-white">{candidate.reduced_chi_square?.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Habitability</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">ESI Score</span><span className="font-mono text-green-300">{candidate.esi_score} ± {candidate.esi_score_err?.toFixed(1)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">HZ Centricity</span><span className="font-mono text-white">{candidate.hz_score}%</span></div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
             <h3 className="text-sm text-slate-300 font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> False Positive Assessment Log</h3>
             <p className="text-sm font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">{candidate.validation_summary}</p>
          </div>
        </main>

        {/* Sidebar: Visualizer & Notebook */}
        <aside className="flex-1 flex flex-col gap-4">
          <SystemVisualizer 
            starRadius={1.0} // Fallback, would ideally be passed from candidate record if stored
            planets={[{ radius: candidate.radius, semiMajorAxis: candidate.semi_major_axis }]}
          />
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" /> Research Notebook
            </h3>
            <textarea
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500 transition"
              placeholder="Add scientific observations, hypotheses, or external catalog links here..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button 
              onClick={handleSaveNotes}
              className="mt-4 w-full py-2 bg-indigo-600/80 hover:bg-indigo-500 rounded-lg text-sm font-medium transition text-white flex justify-center items-center gap-2"
            >
              <Save className="w-4 h-4" /> {isSavingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
