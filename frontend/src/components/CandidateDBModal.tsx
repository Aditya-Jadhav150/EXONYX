import React from 'react';
import { Database, X } from 'lucide-react';
import CandidateTable from './CandidateTable';

interface CandidateDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDBModal({ isOpen, onClose }: CandidateDBModalProps) {
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
        <div className="flex-1 overflow-hidden p-4">
          <CandidateTable />
        </div>
      </div>
    </div>
  );
}
