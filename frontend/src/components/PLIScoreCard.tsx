"use client";

import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface PLIProps {
  score: number;
  breakdown: {
    tls: number;
    cnn: number | null;
    quality: number;
    consistency: number;
    fp_rejection: number;
  };
}

export default function PLIScoreCard({ score, breakdown }: PLIProps) {
  
  let category = '';
  let color = '';
  let Icon = ShieldCheck;

  if (score >= 90) {
    category = 'Very Strong Candidate';
    color = 'text-emerald-400';
    Icon = ShieldCheck;
  } else if (score >= 75) {
    category = 'Strong Candidate';
    color = 'text-blue-400';
    Icon = ShieldCheck;
  } else if (score >= 50) {
    category = 'Possible Candidate';
    color = 'text-yellow-400';
    Icon = ShieldAlert;
  } else {
    category = 'Weak Candidate';
    color = 'text-red-400';
    Icon = ShieldX;
  }

  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-wide">Planet Likelihood Index</h2>
          <p className="text-slate-400 text-sm mt-1">Composite scientific validation metric</p>
        </div>
        <div className={`p-3 rounded-full bg-slate-800 border ${color.replace('text-', 'border-')}`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 border-b border-slate-800 mb-6">
        <span className={`text-6xl font-bold ${color}`}>{score.toFixed(1)}</span>
        <span className="text-slate-300 font-medium mt-2">{category}</span>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Component Breakdown</h3>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">TLS Detection (35%)</span>
          <span className="font-mono text-emerald-400">{breakdown.tls.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">CNN Validation (25%)</span>
          <span className="font-mono text-blue-400">{breakdown.cnn !== null ? breakdown.cnn.toFixed(1) : 'N/A'}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">Signal Quality (15%)</span>
          <span className="font-mono text-purple-400">{breakdown.quality.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">Transit Consistency (15%)</span>
          <span className="font-mono text-orange-400">{breakdown.consistency.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">FP Rejection (10%)</span>
          <span className="font-mono text-yellow-400">{breakdown.fp_rejection.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
