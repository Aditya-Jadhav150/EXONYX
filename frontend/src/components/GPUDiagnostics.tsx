'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Database, Activity, Terminal } from 'lucide-react';

interface GPUDiag {
  gpu_name: string;
  cuda_available: boolean;
  cuda_version: string;
  pytorch_backend: string;
  onnx_providers: string[];
  tensorrt_enabled: boolean;
  cuda_provider_enabled: boolean;
  cupy_enabled: boolean;
  total_vram_mb: number;
  free_vram_mb: number;
}

export default function GPUDiagnostics() {
  const [diag, setDiag] = useState<GPUDiag | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only fetch in developer mode, or just periodically
    const fetchDiag = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/gpu/diagnostics');
        if (res.ok) {
          const data = await res.json();
          setDiag(data);
        }
      } catch (e) {
        // Silently fail if backend is down
      }
    };
    
    fetchDiag();
    const interval = setInterval(fetchDiag, 5000); // refresh every 5s for VRAM
    return () => clearInterval(interval);
  }, []);

  const usedVRAM = diag ? diag.total_vram_mb - diag.free_vram_mb : 0;
  const isTensorRT = diag ? diag.tensorrt_enabled : false;

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-[10px] uppercase tracking-wider">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/80 text-slate-400 border border-slate-700 p-2 rounded-full hover:text-cyan-400 hover:border-cyan-500 transition-colors backdrop-blur-md"
          title="Open GPU Diagnostics"
        >
          <Terminal className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div className="bg-slate-950/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md w-[280px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Cpu className="w-3 h-3" /> GPU Backend Status
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>

          {diag ? (
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">CUDA:</span>
                <span className={diag.cuda_available ? "text-emerald-400 font-bold" : "text-rose-400"}>
                  {diag.cuda_available ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TensorRT:</span>
                <span className={isTensorRT ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {isTensorRT ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CuPy:</span>
                <span className={diag.cupy_enabled ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {diag.cupy_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              
              <div className="border-t border-slate-800 my-2 pt-2" />
              
              <div className="flex justify-between">
                <span className="text-slate-500">Inference:</span>
                <span className="text-indigo-400 font-bold">
                  {isTensorRT ? "TensorRT" : (diag.cuda_provider_enabled ? "ONNX CUDA" : diag.pytorch_backend)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Array Processing:</span>
                <span className="text-cyan-400 font-bold">
                  {diag.cupy_enabled ? "CuPy" : "NumPy"}
                </span>
              </div>
              
              <div className="border-t border-slate-800 my-2 pt-2" />
              
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-500">
                  <Database className="w-3 h-3" /> VRAM
                </span>
                <span className={`${usedVRAM > 3500 ? "text-rose-400" : "text-emerald-400"} font-bold`}>
                  {(usedVRAM / 1024).toFixed(2)}GB / {(diag.total_vram_mb / 1024).toFixed(2)}GB
                </span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-center py-4">
              <p>Backend disconnected or updating...</p>
              <p className="text-[9px] mt-2">Ensure uvicorn is running on port 8000</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
