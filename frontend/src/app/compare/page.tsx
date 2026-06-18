'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Scale } from 'lucide-react';

export default function CompareCandidates() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const c1Id = searchParams.get('c1');
  const c2Id = searchParams.get('c2');

  const [c1, setC1] = useState<any>(null);
  const [c2, setC2] = useState<any>(null);
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

  if (loading) return <div className="p-10 text-white">Loading comparison...</div>;
  if (!c1 || !c2) return <div className="p-10 text-white">Failed to load candidates for comparison.</div>;

  const compareRow = (label: string, val1: any, val2: any, format: (v: any) => string = String) => (
    <div className="grid grid-cols-3 gap-4 border-b border-slate-800/50 py-3 text-sm">
      <div className="font-semibold text-slate-400">{label}</div>
      <div className="font-mono text-white">{format(val1)}</div>
      <div className="font-mono text-white">{format(val2)}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 flex flex-col gap-6">
      <header className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <button onClick={() => router.back()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 text-indigo-400" /> Candidate Comparison
          </h1>
          <p className="text-slate-400 text-sm mt-1">Side-by-side scientific evaluation</p>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-3 gap-4 border-b-2 border-slate-700 pb-4 mb-4">
          <div className="text-lg font-bold text-slate-500 uppercase">Metric</div>
          <div className="text-2xl font-bold text-blue-400">{c1.target_id}</div>
          <div className="text-2xl font-bold text-emerald-400">{c2.target_id}</div>
        </div>
        
        {compareRow("Mission", c1.mission, c2.mission)}
        {compareRow("Orbital Period (days)", c1.period, c2.period, v => Number(v).toFixed(4))}
        {compareRow("Planet Radius (Earth Radii)", c1.radius, c2.radius, v => Number(v).toFixed(3))}
        {compareRow("Transit Depth", c1.transit_depth, c2.transit_depth, v => Number(v).toExponential(3))}
        {compareRow("Transit Duration (hours)", c1.transit_duration, c2.transit_duration, v => Number(v).toFixed(2))}
        {compareRow("Semi-Major Axis (AU)", c1.semi_major_axis, c2.semi_major_axis, v => Number(v).toFixed(4))}
        {compareRow("Equilibrium Temp (K)", c1.equilibrium_temp, c2.equilibrium_temp, v => Number(v).toFixed(0))}
        {compareRow("Earth Similarity Index (ESI)", c1.esi_score, c2.esi_score, v => Number(v).toFixed(1))}
        {compareRow("Habitability Score (%)", c1.hz_score, c2.hz_score, v => Number(v).toFixed(1))}
        {compareRow("Planet Likelihood Index", c1.pli_score, c2.pli_score, v => Number(v).toFixed(1))}
        {compareRow("False Positive Risk (%)", c1.fp_risk, c2.fp_risk, v => Number(v).toFixed(1))}
        {compareRow("Reduced Chi-Square", c1.reduced_chi_square, c2.reduced_chi_square, v => Number(v).toFixed(2))}
        {compareRow("Status", c1.status, c2.status)}
      </div>
    </div>
  );
}
