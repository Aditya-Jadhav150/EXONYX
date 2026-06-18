"use client";

import React from 'react';
import { Droplet, Thermometer, Globe2 } from 'lucide-react';

interface HabitabilityProps {
  esi: number; // Earth Similarity Index (0-100)
  hzScore: number; // Habitable Zone Score (0-100)
  isHabitable: boolean;
  temp?: string;
}

export default function HabitabilityPanel({ esi, hzScore, isHabitable, temp = "288 K" }: HabitabilityProps) {
  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Globe2 className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-semibold text-white tracking-wide">Habitability Assessment</h2>
      </div>

      <div className="flex-grow space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Status</p>
            <p className={`text-xl font-bold mt-1 ${isHabitable ? 'text-emerald-400' : 'text-red-400'}`}>
              {isHabitable ? 'Potentially Habitable' : 'Not Habitable'}
            </p>
          </div>
          <div className={`p-3 rounded-full ${isHabitable ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
            <Droplet className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Earth Similarity Score</span>
              <span className="text-slate-100 font-mono">{esi.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${esi}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Habitable Zone Score</span>
              <span className="text-slate-100 font-mono">{hzScore.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${hzScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <Thermometer className="w-5 h-5 text-orange-400" />
          <div>
            <p className="text-xs text-slate-400 uppercase">Est. Surface Temp</p>
            <p className="text-sm font-semibold text-slate-200">{temp}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
