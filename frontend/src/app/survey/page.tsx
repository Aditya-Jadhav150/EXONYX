"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, HardDrive, Zap, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function SurveyDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/survey/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to load survey stats", err));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-xl animate-pulse text-indigo-400">Connecting to EXONYX Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Main Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Autonomous Survey Engine
            </h1>
            <p className="text-slate-400 mt-2">Live telemetry and operational statistics for background processing</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-900/30 text-emerald-400 px-4 py-2 rounded-full border border-emerald-800/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-sm font-semibold tracking-wider">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-semibold tracking-wide text-sm">TARGETS PROCESSED</h3>
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-4xl font-bold text-white">{stats.targets_processed}</div>
            <div className="text-xs text-slate-500 mt-2">Across all campaigns</div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-semibold tracking-wide text-sm">CANDIDATES FOUND</h3>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-4xl font-bold text-yellow-400">{stats.candidates_found}</div>
            <div className="text-xs text-slate-500 mt-2">PLI &gt; 50</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-semibold tracking-wide text-sm">STRONG CANDIDATES</h3>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-4xl font-bold text-emerald-400">{stats.strong_candidates}</div>
            <div className="text-xs text-slate-500 mt-2">PLI &gt; 85 (MCMC Characterized)</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-semibold tracking-wide text-sm">FALSE POSITIVES</h3>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-4xl font-bold text-red-400">{stats.false_positives}</div>
            <div className="text-xs text-slate-500 mt-2">Automated Rejections</div>
          </div>
        </div>

        {/* Hardware Telemetry */}
        <h2 className="text-2xl font-bold text-white mt-12 mb-6">Hardware Telemetry</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
              <Cpu className="w-48 h-48" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-2 relative z-10">Average Processing Time</h3>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-5xl font-black text-cyan-400">{stats.avg_processing_time_sec.toFixed(1)}</span>
              <span className="text-xl text-cyan-400/70 mb-1">sec / target</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
              <HardDrive className="w-48 h-48" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-2 relative z-10">Local Data Lake</h3>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-5xl font-black text-purple-400">{stats.storage_usage_gb.toFixed(2)}</span>
              <span className="text-xl text-purple-400/70 mb-1">GB Cache Size</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-500">
              <Cpu className="w-48 h-48" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-2 relative z-10">Host GPU/CPU Load</h3>
            <div className="space-y-4 relative z-10 mt-4">
              <div>
                <div className="flex justify-between text-xs mb-1"><span>CPU Usage</span><span>{stats.cpu_usage.toFixed(1)}%</span></div>
                <div className="w-full bg-slate-950 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.cpu_usage}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span>GPU Compute</span><span>{stats.gpu_usage.toFixed(1)}%</span></div>
                <div className="w-full bg-slate-950 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats.gpu_usage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
