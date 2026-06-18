"use client";

import React, { useState } from 'react';
import { Play, Settings2, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface DiscoverySimulatorProps {
  onSimulate: (difficulty: string) => Promise<void> | void;
}

export default function DiscoverySimulator({ onSimulate }: DiscoverySimulatorProps) {
  const [difficulty, setDifficulty] = useState('medium');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    // Call backend or parent handler
    if (onSimulate) {
      await onSimulate(difficulty);
    }
    setIsSimulating(false);
  };

  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-white tracking-wide">Discovery Simulator</h2>
      </div>

      <p className="text-slate-400 text-sm mb-6">
        Inject synthetic exoplanet transits to test pipeline detection limits.
      </p>

      <div className="space-y-4 flex-grow">
        <label className="block text-sm font-medium text-slate-300">Preset Difficulty</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setDifficulty('easy')}
            className={`p-3 rounded-lg border text-sm font-medium transition-all ${difficulty === 'easy' ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
          >
            Easy Planet
            <span className="block text-xs opacity-70 font-normal mt-1">Large radius, low noise</span>
          </button>
          
          <button 
            onClick={() => setDifficulty('medium')}
            className={`p-3 rounded-lg border text-sm font-medium transition-all ${difficulty === 'medium' ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
          >
            Medium Planet
            <span className="block text-xs opacity-70 font-normal mt-1">Moderate signal</span>
          </button>
          
          <button 
            onClick={() => setDifficulty('hard')}
            className={`p-3 rounded-lg border text-sm font-medium transition-all ${difficulty === 'hard' ? 'bg-orange-900/40 border-orange-500 text-orange-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
          >
            Hard Planet
            <span className="block text-xs opacity-70 font-normal mt-1">Weak signal, noisy</span>
          </button>
          
          <button 
            onClick={() => setDifficulty('impossible')}
            className={`p-3 rounded-lg border text-sm font-medium transition-all ${difficulty === 'impossible' ? 'bg-red-900/40 border-red-500 text-red-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
          >
            Impossible
            <span className="block text-xs opacity-70 font-normal mt-1">Extreme noise</span>
          </button>
        </div>
      </div>

      <div className="mt-8">
        <button 
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all"
        >
          {isSimulating ? (
            <span className="animate-pulse">Running Pipeline...</span>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Inject & Analyze
            </>
          )}
        </button>
      </div>
    </div>
  );
}
