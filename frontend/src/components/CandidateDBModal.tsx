import React, { useEffect, useState } from 'react';
import { Database, X, Loader2 } from 'lucide-react';
import CandidateTable from './CandidateTable';

interface CandidateDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDBModal({ isOpen, onClose }: CandidateDBModalProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/candidates')
        .then(res => res.json())
        .then(data => {
          setCandidates(data.candidates || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch candidates", err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[80vh] flex flex-col relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Candidate Database
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition bg-slate-800 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p>Loading candidates...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CandidateTable data={candidates} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
