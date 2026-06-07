"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp, Download, X, HelpCircle, Calendar, LineChart, Play, RefreshCw, CheckCircle2 } from "lucide-react";

interface DataDriftSimulatorProps {
  datasetId: string;
  datasetName: string;
  onClose: () => void;
}

export default function DataDriftSimulator({ datasetId, datasetName, onClose }: DataDriftSimulatorProps) {
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(false);
  const [driftResult, setDriftResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSimulate = async () => {
    setLoading(true);
    setError("");
    setDriftResult(null);
    try {
      const data = await api.simulateDrift(datasetId, months);
      setDriftResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to simulate data drift.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url: string, monthName: string) => {
    try {
      // url looks like "/api/datasets/{uuid}/download"
      const datasetUuid = url.split("/")[3];
      const downloadUrl = await api.downloadDatasetUrl(datasetUuid);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `${datasetName.replace(/\s+/g, "_")}_drift_${monthName.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to download drifted file: " + err.message);
    }
  };

  // Help calculate SVG paths for mini line graphs
  const generateSvgPath = (points: number[], width: number, height: number) => {
    if (points.length === 0) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    return points
      .map((p, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 8) - 4; // padding
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel border border-card-border bg-card w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Header */}
        <div className="p-5 border-b border-card-border flex items-center justify-between bg-muted-bg/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-linear-to-tr from-primary to-purple-500 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Data Drift Simulator</h3>
              <p className="text-[10px] text-muted font-bold">
                Model monthly statistical trends for: {datasetName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted-bg text-muted hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
              {error}
            </div>
          )}

          {!driftResult && !loading && (
            <div className="space-y-6 py-6 text-center max-w-md mx-auto">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <LineChart className="h-10 w-10 text-primary mx-auto mb-3" />
                <h4 className="text-sm font-black text-foreground">How does Drift Simulation work?</h4>
                <p className="text-muted text-xs leading-relaxed font-semibold mt-1">
                  We generate sequential monthly databases from your schema config. Each month introduces compound factors like a 3% inflation on Currency attributes, customer category churn adjustments (4-10% monthly), and randomized customer acquisition metrics.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-muted tracking-wider">
                  Simulation Timeline Length: {months} Months
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={months}
                    onChange={(e) => setMonths(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-black text-foreground w-12 bg-muted-bg border border-border px-2 py-1 rounded-md text-center">
                    {months} mos
                  </span>
                </div>
              </div>

              <button
                onClick={handleSimulate}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                Simulate Churn & Drift
              </button>
            </div>
          )}

          {loading && (
            <div className="py-20 text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h4 className="text-base font-black text-foreground">Modeling Multi-Month Drift...</h4>
                <p className="text-xs text-muted font-semibold mt-1">
                  Injecting compound trend multipliers, generating monthly files, and caching datasets.
                </p>
              </div>
            </div>
          )}

          {driftResult && (
            <div className="space-y-6">
              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Revenue Trends */}
                <div className="glass-panel border border-card-border p-4 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted block">
                    Revenue Trends (inflation + noise)
                  </span>
                  <div className="h-28 flex items-end justify-between gap-1 pt-4 px-2 bg-muted-bg/10 border border-border/40 rounded-xl relative">
                    {/* SVG Line path */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <path
                        d={generateSvgPath(driftResult.drift_metrics?.revenue_trend || [], 200, 80)}
                        fill="none"
                        stroke="url(#gradient-rev)"
                        strokeWidth="2.5"
                      />
                      <defs>
                        <linearGradient id="gradient-rev" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    {/* Month labels */}
                    <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[9px] text-muted font-bold pointer-events-none">
                      <span>{driftResult.months[0]}</span>
                      <span>{driftResult.months[driftResult.months.length - 1]}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold pt-1">
                    <span className="text-muted">Final Month:</span>
                    <span className="text-foreground">
                      ${driftResult.drift_metrics?.revenue_trend[driftResult.drift_metrics.revenue_trend.length - 1]?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Chart 2: Active Users Churn */}
                <div className="glass-panel border border-card-border p-4 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted block">
                    Active User Count & Churn Rates
                  </span>
                  <div className="h-28 flex items-end justify-between gap-1 pt-4 px-2 bg-muted-bg/10 border border-border/40 rounded-xl relative">
                    {/* SVG Line path */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <path
                        d={generateSvgPath(driftResult.drift_metrics?.active_users || [], 200, 80)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                    </svg>
                    
                    {/* Month labels */}
                    <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[9px] text-muted font-bold pointer-events-none">
                      <span>{driftResult.months[0]}</span>
                      <span>{driftResult.months[driftResult.months.length - 1]}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold pt-1">
                    <span className="text-muted">Acquisition / Churn Rate (Avg):</span>
                    <span className="text-emerald-500">
                      {driftResult.drift_metrics?.churn_rate[driftResult.drift_metrics.churn_rate.length - 1]}% churn
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Downloads list */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted">Generated Month Sequences</h4>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-muted-bg/10">
                  {driftResult.months.map((m: string, idx: number) => {
                    const downloadUrl = driftResult.download_urls[m];
                    const activeCount = driftResult.drift_metrics?.active_users[idx];
                    const churnRate = driftResult.drift_metrics?.churn_rate[idx];
                    return (
                      <div key={m} className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted-bg/25 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-card border border-border text-foreground shrink-0">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-sm font-extrabold text-foreground">{m} Data</span>
                            <div className="flex gap-2.5 text-[10px] text-muted font-semibold mt-0.5">
                              <span>Active Users: {activeCount}</span>
                              {idx > 0 && <span>Churn Rate: {churnRate}%</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(downloadUrl, m)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSimulate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-card hover:bg-muted-bg text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rerun Simulation
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
