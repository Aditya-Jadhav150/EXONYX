'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Database, X, Search, SlidersHorizontal, Star, Scale, ShieldCheck, ShieldAlert, ShieldX, ChevronUp, ChevronDown, Telescope } from 'lucide-react';
import { SkeletonTable } from './LoadingSkeleton';

interface Candidate {
  id: number;
  target_id: string;
  mission: string;
  period: number;
  radius: number;
  pli_score: number;
  esi_score: number;
  equilibrium_temp: number;
  fp_risk: number;
  status: string;
  detection_date: string;
}

interface CandidateDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortKey = 'pli_score' | 'esi_score' | 'period' | 'radius' | 'equilibrium_temp' | 'fp_risk' | 'detection_date';
type SortDir = 'asc' | 'desc';

export default function CandidateDBModal({ isOpen, onClose }: CandidateDBModalProps) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [missionFilter, setMissionFilter] = useState('All');
  const [pliMin, setPliMin] = useState(0);
  const [pliMax, setPliMax] = useState(100);
  const [esiMin, setEsiMin] = useState(0);
  const [esiMax, setEsiMax] = useState(100);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('pli_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('exonyx_favorites');
    if (stored) setFavorites(new Set(JSON.parse(stored)));
  }, []);

  const saveFavorites = (newFavs: Set<number>) => {
    setFavorites(newFavs);
    localStorage.setItem('exonyx_favorites', JSON.stringify([...newFavs]));
  };

  const toggleFavorite = (id: number) => {
    const newFavs = new Set(favorites);
    newFavs.has(id) ? newFavs.delete(id) : newFavs.add(id);
    saveFavorites(newFavs);
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/candidates')
        .then(res => res.json())
        .then(data => { setCandidates(data.candidates || []); setLoading(false); })
        .catch(() => { setLoading(false); });
    }
  }, [isOpen]);

  const toggleSelect = (e: React.SyntheticEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      router.push(`/compare?c1=${selectedIds[0]}&c2=${selectedIds[1]}`);
      onClose();
    }
  };

  // Filter + Search + Sort
  const filteredData = useMemo(() => {
    let data = [...candidates];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(c => c.target_id?.toLowerCase().includes(q) || c.mission?.toLowerCase().includes(q));
    }

    // Mission filter
    if (missionFilter !== 'All') {
      data = data.filter(c => c.mission === missionFilter);
    }

    // PLI range
    data = data.filter(c => (c.pli_score || 0) >= pliMin && (c.pli_score || 0) <= pliMax);

    // ESI range
    data = data.filter(c => (c.esi_score || 0) >= esiMin && (c.esi_score || 0) <= esiMax);

    // Sort
    data.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return data;
  }, [candidates, searchQuery, missionFilter, pliMin, pliMax, esiMin, esiMax, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-indigo-400" /> : <ChevronUp className="w-3 h-3 text-indigo-400" />;
  };

  const pliColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-900/50 text-emerald-400 border-emerald-500/20';
    if (score >= 75) return 'bg-blue-900/50 text-blue-400 border-blue-500/20';
    if (score >= 50) return 'bg-yellow-900/50 text-yellow-400 border-yellow-500/20';
    return 'bg-red-900/50 text-red-400 border-red-500/20';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[85vh] flex flex-col relative modal-enter">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Candidate Database Explorer
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={handleCompare} disabled={selectedIds.length !== 2}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedIds.length === 2 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
              <Scale className="w-3 h-3" /> Compare ({selectedIds.length}/2)
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition bg-slate-800 p-1.5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by target name or mission..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                showFilters ? 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
            <span className="text-xs text-slate-500">{filteredData.length} of {candidates.length} candidates</span>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800/50">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mission</label>
                <select value={missionFilter} onChange={(e) => setMissionFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
                  <option value="All">All Missions</option>
                  <option value="Kepler">Kepler</option>
                  <option value="K2">K2</option>
                  <option value="TESS">TESS</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">PLI Min</label>
                <input type="number" min={0} max={100} value={pliMin} onChange={(e) => setPliMin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">PLI Max</label>
                <input type="number" min={0} max={100} value={pliMax} onChange={(e) => setPliMax(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">ESI Min</label>
                <input type="number" min={0} max={100} value={esiMin} onChange={(e) => setEsiMin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">ESI Max</label>
                <input type="number" min={0} max={100} value={esiMax} onChange={(e) => setEsiMax(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden p-0 flex flex-col">
          {loading ? (
            <div className="flex-1 p-4"><SkeletonTable rows={8} cols={8} /></div>
          ) : filteredData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <Telescope className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-1">No candidates found</p>
              <p className="text-sm text-slate-600">{candidates.length === 0 ? 'Start analyzing targets to build your discovery catalog.' : 'Adjust your search or filter criteria.'}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-4 py-3 font-medium">Target ID</th>
                    <th className="px-4 py-3 font-medium">Mission</th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none" onClick={() => handleSort('period')}>
                      <span className="flex items-center gap-1">Period (d) <SortIcon col="period" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none" onClick={() => handleSort('radius')}>
                      <span className="flex items-center gap-1">Radius (R⊕) <SortIcon col="radius" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none" onClick={() => handleSort('pli_score')}>
                      <span className="flex items-center gap-1">PLI <SortIcon col="pli_score" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-indigo-400 transition-colors select-none" onClick={() => handleSort('esi_score')}>
                      <span className="flex items-center gap-1">ESI <SortIcon col="esi_score" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((cand) => {
                    const isSelected = selectedIds.includes(cand.id);
                    const isFav = favorites.has(cand.id);
                    return (
                      <tr key={cand.id} onClick={() => { router.push(`/candidate/${cand.id}`); onClose(); }}
                        className={`border-b border-slate-800/50 transition cursor-pointer ${isSelected ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'hover:bg-slate-800/50'}`}>
                        <td className="px-3 py-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(cand.id); }}
                            className="p-1 hover:bg-slate-800 rounded transition-colors">
                            <Star className={`w-4 h-4 transition-colors ${isFav ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 hover:text-slate-400'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelect(e, cand.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 cursor-pointer" />
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{cand.target_id}</td>
                        <td className="px-4 py-3 text-slate-400">{cand.mission}</td>
                        <td className="px-4 py-3 font-mono">{cand.period ? cand.period.toFixed(3) : '—'}</td>
                        <td className="px-4 py-3 font-mono">{cand.radius ? cand.radius.toFixed(2) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${pliColor(cand.pli_score)}`}>{cand.pli_score?.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{cand.esi_score?.toFixed(1) || '—'}</td>
                        <td className="px-4 py-3 flex items-center gap-2">
                          {cand.status === 'PASS' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                          {cand.status === 'WARNING' && <ShieldAlert className="w-4 h-4 text-yellow-400" />}
                          {cand.status === 'FAIL' && <ShieldX className="w-4 h-4 text-red-400" />}
                          {cand.status === 'Review' && <ShieldAlert className="w-4 h-4 text-blue-400" />}
                          <span className="text-xs uppercase">{cand.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
