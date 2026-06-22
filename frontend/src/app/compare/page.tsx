'use client';

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Scale, Trophy, Star, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface CandidateData {
  id: number;
  target_id: string;
  mission: string;
  period: number;
  radius: number;
  transit_depth: number;
  transit_duration: number;
  semi_major_axis: number;
  equilibrium_temp: number;
  esi_score: number;
  hz_score: number;
  pli_score: number;
  fp_risk: number;
  cnn_confidence: number;
  reduced_chi_square: number;
  status: string;
}

const METRICS = [
  { key: 'pli_score', label: 'PLI Score', unit: '', higherBetter: true },
  { key: 'esi_score', label: 'ESI', unit: '', higherBetter: true },
  { key: 'hz_score', label: 'HZ Score', unit: '%', higherBetter: true },
  { key: 'radius', label: 'Radius', unit: 'R⊕', higherBetter: false },
  { key: 'period', label: 'Period', unit: 'd', higherBetter: false },
  { key: 'semi_major_axis', label: 'Semi-Major Axis', unit: 'AU', higherBetter: false },
  { key: 'equilibrium_temp', label: 'Eq. Temp', unit: 'K', higherBetter: false },
  { key: 'fp_risk', label: 'FP Risk', unit: '%', higherBetter: false },
  { key: 'cnn_confidence', label: 'CNN Confidence', unit: '%', higherBetter: true },
  { key: 'reduced_chi_square', label: 'χ² Reduced', unit: '', higherBetter: false },
  { key: 'transit_depth', label: 'Transit Depth', unit: '', higherBetter: false },
  { key: 'transit_duration', label: 'Duration', unit: 'hrs', higherBetter: false },
];

const RADAR_KEYS = ['pli_score', 'esi_score', 'hz_score', 'cnn_confidence', 'fp_risk'];

function CompareCandidatesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const c1Id = searchParams.get('c1');
  const c2Id = searchParams.get('c2');

  const [c1, setC1] = useState<CandidateData | null>(null);
  const [c2, setC2] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!c1Id || !c2Id) return;
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/candidate/${c1Id}`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/candidate/${c2Id}`).then(r => r.json())
    ]).then(([res1, res2]) => {
      if (res1.status === 'success') setC1(res1.candidate);
      if (res2.status === 'success') setC2(res2.candidate);
      setLoading(false);
    });
  }, [c1Id, c2Id]);

  const winner = useMemo(() => {
    if (!c1 || !c2) return null;
    let c1Score = 0, c2Score = 0;
    METRICS.forEach(m => {
      const v1 = Number((c1 as any)[m.key]) || 0;
      const v2 = Number((c2 as any)[m.key]) || 0;
      if (m.higherBetter) { if (v1 > v2) c1Score++; else if (v2 > v1) c2Score++; }
      else { if (v1 < v2) c1Score++; else if (v2 < v1) c2Score++; }
    });
    if (c1Score > c2Score) return { id: c1.target_id, reason: `Wins ${c1Score} of ${METRICS.length} metrics` };
    if (c2Score > c1Score) return { id: c2.target_id, reason: `Wins ${c2Score} of ${METRICS.length} metrics` };
    return { id: 'Tie', reason: 'Equal across metrics' };
  }, [c1, c2]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <Scale className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading comparison data...</p>
        </div>
      </div>
    );
  }
  if (!c1 || !c2) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <p className="text-red-400">Failed to load one or both candidates. Please go back and try again.</p>
      </div>
    );
  }

  const radarData = [
    {
      type: 'scatterpolar' as const,
      r: RADAR_KEYS.map(k => {
        const val = Number((c1 as any)[k]) || 0;
        return k === 'fp_risk' ? 100 - val : val;
      }),
      theta: RADAR_KEYS.map(k => {
        const m = METRICS.find(m => m.key === k);
        return k === 'fp_risk' ? 'FP Safety' : (m?.label || k);
      }),
      fill: 'toself' as const,
      name: c1.target_id,
      line: { color: '#818cf8' },
      fillcolor: 'rgba(129, 140, 248, 0.15)',
    },
    {
      type: 'scatterpolar' as const,
      r: RADAR_KEYS.map(k => {
        const val = Number((c2 as any)[k]) || 0;
        return k === 'fp_risk' ? 100 - val : val;
      }),
      theta: RADAR_KEYS.map(k => {
        const m = METRICS.find(m => m.key === k);
        return k === 'fp_risk' ? 'FP Safety' : (m?.label || k);
      }),
      fill: 'toself' as const,
      name: c2.target_id,
      line: { color: '#4ade80' },
      fillcolor: 'rgba(74, 222, 128, 0.15)',
    }
  ];

  const format = (v: any) => {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) < 0.001) return n.toExponential(3);
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    return n.toFixed(3);
  };

  const getWinnerStyle = (key: string) => {
    const m = METRICS.find(m => m.key === key);
    if (!m) return ['', ''];
    const v1 = Number((c1 as any)[key]) || 0;
    const v2 = Number((c2 as any)[key]) || 0;
    if (v1 === v2) return ['', ''];
    const c1Wins = m.higherBetter ? v1 > v2 : v1 < v2;
    return c1Wins ? ['text-emerald-400', 'text-slate-400'] : ['text-slate-400', 'text-emerald-400'];
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col gap-6">
      <header className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <button onClick={() => router.back()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 text-indigo-400" /> Candidate Comparison Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Side-by-side scientific evaluation and ranking</p>
        </div>
      </header>

      {/* Ranking Summary */}
      {winner && (
        <div className="exo-card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-900/30 rounded-lg">
            <Trophy className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Recommended Candidate</p>
            <p className="text-xl font-bold text-white">{winner.id}</p>
            <p className="text-xs text-slate-500 mt-0.5">{winner.reason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
        <div className="exo-card p-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-indigo-400" /> Radar Comparison
          </h3>
          <Plot
            data={radarData}
            layout={{
              polar: {
                bgcolor: 'transparent',
                radialaxis: { visible: true, range: [0, 100], tickfont: { color: '#64748b', size: 10 }, gridcolor: '#1e293b' },
                angularaxis: { tickfont: { color: '#94a3b8', size: 11 }, gridcolor: '#1e293b', linecolor: '#334155' },
              },
              showlegend: true,
              legend: { font: { color: '#94a3b8', size: 11 }, x: 0, y: -0.15, orientation: 'h' as const },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              margin: { t: 30, b: 60, l: 40, r: 40 },
              height: 350,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Metric Comparison Table */}
        <div className="exo-card p-0 overflow-hidden lg:col-span-2">
          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-700">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-bold text-slate-500 uppercase">Metric</div>
              <div className="text-lg font-bold text-indigo-400">{c1.target_id}</div>
              <div className="text-lg font-bold text-emerald-400">{c2.target_id}</div>
            </div>
          </div>
          <div className="divide-y divide-slate-800/50">
            {METRICS.map(m => {
              const [style1, style2] = getWinnerStyle(m.key);
              const v1 = (c1 as any)[m.key];
              const v2 = (c2 as any)[m.key];
              return (
                <div key={m.key} className="grid grid-cols-3 gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    {m.label}
                    {m.unit && <span className="text-[10px] text-slate-600">({m.unit})</span>}
                  </div>
                  <div className={`font-mono text-sm flex items-center gap-1 ${style1}`}>
                    {format(v1)}
                    {style1.includes('emerald') && <TrendingUp className="w-3 h-3" />}
                  </div>
                  <div className={`font-mono text-sm flex items-center gap-1 ${style2}`}>
                    {format(v2)}
                    {style2.includes('emerald') && <TrendingUp className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompareCandidates() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Scale className="w-12 h-12 text-indigo-400 animate-pulse" />
      </div>
    }>
      <CompareCandidatesContent />
    </Suspense>
  );
}
