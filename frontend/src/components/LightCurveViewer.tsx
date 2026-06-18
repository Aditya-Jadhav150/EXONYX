"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <div className="w-full h-64 flex items-center justify-center text-slate-400">Loading visualization...</div> });

interface LightCurveViewerProps {
  data: {
    time: number[];
    raw_flux: number[];
    clean_flux?: number[];
    is_transit?: boolean[];
  };
  showClean?: boolean;
}

export default function LightCurveViewer({ data, showClean = false }: LightCurveViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-64 flex items-center justify-center bg-slate-900 rounded-lg">Loading...</div>;

  const traces = [];

  // Raw Flux
  if (!showClean) {
    traces.push({
      x: data.time,
      y: data.raw_flux,
      type: 'scatter',
      mode: 'markers',
      marker: { color: 'rgba(100, 150, 255, 0.5)', size: 3 },
      name: 'Raw Flux'
    });
  }

  // Clean Flux
  if (showClean && data.clean_flux) {
    traces.push({
      x: data.time,
      y: data.clean_flux,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgba(50, 200, 150, 0.8)', width: 1 },
      name: 'Detrended Flux'
    });
  }

  // Highlight transits
  const shapes: any[] = [];
  if (data.is_transit && data.is_transit.some(t => t)) {
    let inTransit = false;
    let startX: number | null = null;
    
    data.is_transit.forEach((isT, i) => {
      if (isT && !inTransit) {
        inTransit = true;
        startX = data.time[i];
      } else if (!isT && inTransit) {
        inTransit = false;
        shapes.push({
          type: 'rect',
          xref: 'x',
          yref: 'paper',
          x0: startX,
          x1: data.time[i-1],
          y0: 0,
          y1: 1,
          fillcolor: 'rgba(239, 68, 68, 0.15)',
          line: { color: 'rgba(239, 68, 68, 0.5)', width: 1 }
        });
      }
    });
    
    // Handle case where it ends in transit
    if (inTransit) {
        shapes.push({
          type: 'rect',
          xref: 'x',
          yref: 'paper',
          x0: startX,
          x1: data.time[data.time.length-1],
          y0: 0,
          y1: 1,
          fillcolor: 'rgba(239, 68, 68, 0.15)',
          line: { color: 'rgba(239, 68, 68, 0.5)', width: 1 }
        });
    }
  }

  return (
    <div className="w-full h-full min-h-[400px]">
      <Plot
        data={traces as any}
        layout={{
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          margin: { t: 20, r: 20, b: 40, l: 60 },
          xaxis: { 
            title: 'Time (days)', 
            gridcolor: '#334155',
            zerolinecolor: '#475569',
            tickfont: { color: '#94a3b8' },
            titlefont: { color: '#cbd5e1' }
          },
          yaxis: { 
            title: 'Normalized Flux', 
            gridcolor: '#334155',
            zerolinecolor: '#475569',
            tickfont: { color: '#94a3b8' },
            titlefont: { color: '#cbd5e1' }
          },
          legend: {
            font: { color: '#cbd5e1' },
            bgcolor: 'rgba(15, 23, 42, 0.7)'
          },
          shapes: shapes,
          hovermode: 'closest'
        } as any}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: true, displaylogo: false, responsive: true }}
      />
    </div>
  );
}
