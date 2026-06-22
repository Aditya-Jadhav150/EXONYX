import React from 'react';
import { X, Star, Globe, Telescope, BookOpen } from 'lucide-react';

interface CampaignCatalogModalProps {
  onClose: () => void;
  onSelectTargets: (targets: string) => void;
}

export default function CampaignCatalogModal({ onClose, onSelectTargets }: CampaignCatalogModalProps) {
  
  const categories = [
    {
      title: "Famous Exoplanets",
      icon: <Star className="w-5 h-5 text-yellow-400" />,
      description: "Well-known confirmed exoplanet systems.",
      targets: ["Kepler-10", "Kepler-22", "Kepler-452", "TRAPPIST-1", "WASP-12", "WASP-39"]
    },
    {
      title: "Habitable Zone Candidates",
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      description: "Planets orbiting within the conservative habitable zone.",
      targets: ["Kepler-186", "Kepler-442", "Kepler-62", "TOI-700", "LHS 1140"]
    },
    {
      title: "Notable Kepler Targets",
      icon: <Telescope className="w-5 h-5 text-blue-400" />,
      description: "Fascinating and anomalous objects from the Kepler mission.",
      targets: ["KIC 8462852", "Kepler-16", "Kepler-11", "Kepler-90"]
    },
    {
      title: "False Positive Benchmark",
      icon: <BookOpen className="w-5 h-5 text-red-400" />,
      description: "Eclipsing binaries and noise artifacts for pipeline testing.",
      targets: ["11442793", "10666592", "11904151"]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Target Catalog Explorer</h2>
            <p className="text-sm text-slate-400 mt-1">Select a curated list to instantly populate your survey campaign.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-5 hover:border-indigo-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-800 rounded-lg shadow-inner">
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-200">{cat.title}</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4 h-10">{cat.description}</p>
              
              <div className="bg-slate-950 rounded p-3 mb-4 max-h-24 overflow-y-auto border border-slate-800/50">
                <p className="text-xs font-mono text-slate-500 leading-relaxed">
                  {cat.targets.join(", ")}
                </p>
              </div>
              
              <button 
                onClick={() => {
                  onSelectTargets(cat.targets.join(",\n"));
                  onClose();
                }}
                className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-sm tracking-wider uppercase rounded transition-all"
              >
                Load {cat.targets.length} Targets
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
