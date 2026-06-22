'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Sparkles, BrainCircuit, Activity, ShieldCheck, Microscope, AlertTriangle } from 'lucide-react';

interface StructuredResponse {
  title: string;
  metrics: Record<string, string>;
  analysis: string;
  evidence_used: string[];
  conclusion: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | StructuredResponse;
}

function getMetricColor(key: string, value: string) {
  const vLower = value.toLowerCase();
  if (vLower.includes("high") && key.includes("Confidence")) return "text-emerald-400 bg-emerald-900/30 border-emerald-500/50";
  if (vLower.includes("high") && key.includes("Risk")) return "text-rose-400 bg-rose-900/30 border-rose-500/50";
  if (vLower.includes("low") && key.includes("Risk")) return "text-emerald-400 bg-emerald-900/30 border-emerald-500/50";
  if (vLower.includes("strong")) return "text-indigo-400 bg-indigo-900/30 border-indigo-500/50";
  if (vLower.includes("weak")) return "text-amber-400 bg-amber-900/30 border-amber-500/50";
  return "text-slate-300 bg-slate-800 border-slate-600";
}

function StructuredMessageCard({ data }: { data: StructuredResponse }) {
  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl w-full text-left font-sans">
      
      {/* Title Header */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Microscope className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-bold tracking-wider text-slate-100 uppercase">{data.title || "Scientific Analysis"}</h4>
      </div>

      {/* Metrics Row */}
      {data.metrics && Object.keys(data.metrics).length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-slate-800/50 bg-slate-900/50">
          {Object.entries(data.metrics).map(([k, v], idx) => (
            <div key={idx} className={`px-2.5 py-1 text-[11px] font-mono rounded-md border flex items-center gap-1.5 ${getMetricColor(k, String(v))}`}>
              <Activity className="w-3 h-3 opacity-70" />
              <span className="opacity-70">{k}:</span> <strong className="opacity-100">{String(v)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Analysis Content */}
      <div className="p-4 space-y-4">
        <div>
          <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Analysis</h5>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{data.analysis}</p>
        </div>

        {/* Evidence Used */}
        {data.evidence_used && data.evidence_used.length > 0 && (
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Evidence Used</h5>
            <div className="flex flex-wrap gap-1.5">
              {data.evidence_used.map((ev, idx) => (
                <span key={idx} className="px-2 py-0.5 text-[10px] bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {ev}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conclusion */}
        {data.conclusion && (
          <div className="bg-slate-800/40 rounded-lg p-3 border-l-2 border-indigo-500">
            <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Conclusion</h5>
            <p className="text-sm font-medium text-slate-200">{data.conclusion}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AstroChatAssistant({ candidateId }: { candidateId: number }) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: {
        title: "EXONYX Research Co-Pilot Initialized",
        metrics: {},
        analysis: "I am ready to assist with your investigation of this candidate. I will formulate my responses based strictly on the pipeline telemetry, AstroNet confidence, and TLS processing outputs.",
        evidence_used: ["EXONYX Data Hub"],
        conclusion: "Awaiting your scientific query."
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim()) return;
    
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, message: messageText })
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: {
          title: "System Error",
          metrics: { "Status": "Offline" },
          analysis: "Failed to connect to EXONYX Backend.",
          evidence_used: [],
          conclusion: "Please ensure the local Python server is running."
        } 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    "Explain this candidate",
    "Why is PLI this value?",
    "Why is FP Risk high?",
    "Explain the transit evidence",
    "Compare to Earth",
    "Explain habitability"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950/50 rounded-b-lg rounded-tr-lg border border-slate-800/50">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner mt-1">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'rounded-lg p-3 text-sm bg-blue-600 text-white shadow-md' : 'w-full'}`}>
              {msg.role === 'user' ? (
                msg.content as string
              ) : (
                typeof msg.content === 'string' 
                  ? <div className="rounded-lg p-3 text-sm bg-slate-800/80 text-slate-200 border border-slate-700 shadow-sm">{msg.content}</div>
                  : <StructuredMessageCard data={msg.content as StructuredResponse} />
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded bg-blue-900/50 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Formulating scientific response...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {quickActions.map((action, idx) => (
          <button 
            key={idx}
            onClick={() => handleSend(action)}
            disabled={isLoading}
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-amber-400" /> {action}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30 rounded-b-lg">
        <div className="flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the Research Co-Pilot..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
