'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldAlert, ShieldX, Scale } from 'lucide-react';

export default function CandidateTable({ data }: { data: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // keep max 2
    });
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      router.push(`/compare?c1=${selectedIds[0]}&c2=${selectedIds[1]}`);
    }
  };

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-slate-500">No candidates detected yet.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-white font-semibold">Candidate Database</h3>
        <button 
          onClick={handleCompare}
          disabled={selectedIds.length !== 2}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectedIds.length === 2 
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-500/20' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Scale className="w-4 h-4" /> Compare Selected ({selectedIds.length}/2)
        </button>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 border-y border-slate-800">
            <tr>
              <th className="px-4 py-3">Select</th>
              <th className="px-4 py-3">Target ID</th>
              <th className="px-4 py-3">Period (d)</th>
              <th className="px-4 py-3">Radius (R⊕)</th>
              <th className="px-4 py-3">PLI Score</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cand, idx) => {
              const isSelected = selectedIds.includes(cand.id);
              return (
                <tr 
                  key={idx} 
                  onClick={() => router.push(`/candidate/${cand.id}`)} 
                  className={`border-b border-slate-800 transition cursor-pointer ${
                    isSelected ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onClick={(e) => toggleSelect(e, cand.id)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{cand.target_id}</td>
                  <td className="px-4 py-3 font-mono">{cand.period ? cand.period.toFixed(3) : '-'}</td>
                  <td className="px-4 py-3 font-mono">{cand.radius ? cand.radius.toFixed(2) : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      cand.pli_score >= 90 ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/20' :
                      cand.pli_score >= 75 ? 'bg-blue-900/50 text-blue-400 border border-blue-500/20' :
                      cand.pli_score >= 50 ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-900/50 text-red-400 border border-red-500/20'
                    }`}>
                      {cand.pli_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {cand.status === 'PASS' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    {cand.status === 'WARNING' && <ShieldAlert className="w-4 h-4 text-yellow-400" />}
                    {cand.status === 'FAIL' && <ShieldX className="w-4 h-4 text-red-400" />}
                    {cand.status === 'Review' && <ShieldAlert className="w-4 h-4 text-blue-400" />}
                    <span className="text-xs uppercase">{cand.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
