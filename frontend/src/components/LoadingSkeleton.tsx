'use client';

import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function SkeletonLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return <div className="skeleton" style={{ width, height, minHeight: height }} />;
}

export function SkeletonCard() {
  return (
    <div className="exo-card p-6 space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLine width="40%" height="20px" />
        <SkeletonLine width="32px" height="32px" />
      </div>
      <SkeletonLine width="60%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="45%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 px-6 py-3 border-b border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${60 + Math.random() * 40}px`} height="12px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-6 py-4 border-b border-slate-800/50">
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonLine key={col} width={`${50 + Math.random() * 50}px`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-[#020617] p-8 space-y-6">
      <SkeletonLine width="300px" height="32px" />
      <SkeletonLine width="200px" height="16px" />
      <div className="grid grid-cols-3 gap-6 mt-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
