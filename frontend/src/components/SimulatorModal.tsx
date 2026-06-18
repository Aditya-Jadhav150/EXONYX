import React, { useState } from 'react';
import { Beaker, X } from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (difficulty: string) => void;
}

export default function SimulatorModal({ isOpen, onClose, onRun }: SimulatorModalProps) {
  const [difficulty, setDifficulty] = useState('medium');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[400px] shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Beaker className="w-5 h-5 text-indigo-400" /> Discovery Simulator
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Generate an artificial light curve with injected noise and transit signatures to benchmark the detection pipeline.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Signal Difficulty</label>
            <div className="grid grid-cols-2 gap-2">
              {['easy', 'medium', 'hard', 'impossible'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium capitalize border transition ${
                    difficulty === level 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-1">Expected Conditions:</h4>
            {difficulty === 'easy' && <p className="text-[11px] text-slate-400">Deep transit (~2.0%), low noise. High confidence expected.</p>}
            {difficulty === 'medium' && <p className="text-[11px] text-slate-400">Moderate transit (~0.8%), moderate noise. Typical detection scenario.</p>}
            {difficulty === 'hard' && <p className="text-[11px] text-slate-400">Shallow transit (~0.4%), high noise. Wōtan detrending heavily required.</p>}
            {difficulty === 'impossible' && <p className="text-[11px] text-slate-400">Grazing transit (~0.1%), extreme noise. High false negative rate.</p>}
          </div>
        </div>

        <button 
          onClick={() => onRun(difficulty)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition"
        >
          Initialize Simulation
        </button>
      </div>
    </div>
  );
}
