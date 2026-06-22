'use client';
import React, { useEffect, useState } from 'react';
import { Activity, Database, Crosshair, HelpCircle, Loader2 } from 'lucide-react';

interface MCMCDiagnosticsProps {
  candidateId: string | number;
}

interface MCMCData {
  status: string;
  message?: string;
  period_mcmc: number;
  period_err_minus: number;
  period_err_plus: number;
  depth_mcmc: number;
  depth_err_minus: number;
  depth_err_plus: number;
  impact_parameter: number;
  b_err_minus: number;
  b_err_plus: number;
  n_chains: number;
  n_samples: number;
  convergence_rhat: number;
  corner_plot_url: string;
}

export default function MCMCDiagnostics({ candidateId }: MCMCDiagnosticsProps) {
  const [data, setData] = useState<MCMCData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/candidate/${candidateId}/mcmc`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [candidateId]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data || data.status === 'unavailable') {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex flex-col items-center justify-center text-center mt-8">
        <HelpCircle className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-slate-300">Statistical Diagnostics Unavailable</h3>
        <p className="text-slate-500 max-w-md mt-2">
          {data?.message || "Candidate signal strength (PLI) was below the threshold required for multi-chain sampling."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-8">
      <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold tracking-widest text-slate-100 uppercase">MCMC Statistical Diagnostics</h2>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> Posterior Distributions
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Orbital Period (Days)</p>
                <p className="text-xl font-mono text-slate-200">
                  {data.period_mcmc.toFixed(4)} <span className="text-sm text-slate-500">+{data.period_err_plus.toFixed(4)} / -{data.period_err_minus.toFixed(4)}</span>
                </p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Transit Depth</p>
                <p className="text-xl font-mono text-slate-200">
                  {data.depth_mcmc.toFixed(4)} <span className="text-sm text-slate-500">+{data.depth_err_plus.toFixed(4)} / -{data.depth_err_minus.toFixed(4)}</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Impact Parameter</p>
                <p className="text-xl font-mono text-slate-200">
                  {data.impact_parameter.toFixed(3)} <span className="text-sm text-slate-500">+{data.b_err_plus.toFixed(3)} / -{data.b_err_minus.toFixed(3)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" /> Chain Statistics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Walkers</p>
                <p className="text-lg font-mono text-slate-300">{data.n_chains}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Samples</p>
                <p className="text-lg font-mono text-slate-300">{data.n_samples?.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Gelman-Rubin (R̂)</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-mono text-slate-300">{data.convergence_rhat?.toFixed(3)}</p>
                  {data.convergence_rhat < 1.05 && (
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 rounded uppercase tracking-wider">Converged</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Corner Plot */}
        <div className="lg:col-span-2 bg-slate-950 rounded-lg border border-slate-800 p-2 flex items-center justify-center min-h-[400px]">
          <img 
            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${data.corner_plot_url}`} 
            alt="MCMC Corner Plot" 
            className="w-full max-w-2xl h-auto rounded invert-[0.9] hue-rotate-180 contrast-125"
          />
        </div>

      </div>
    </div>
  );
}
