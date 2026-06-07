"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FileDown, PlusCircle, CheckCircle, Database, AlertCircle, Bookmark, Key, Clock, ShieldAlert } from "lucide-react";

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  user: any;
}

export default function Dashboard({ setCurrentTab, user }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getUsage();
      setStats(data);
    } catch (err: any) {
      setError("Failed to load usage statistics. Ensure your FastAPI server is online.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, name: string, ext: string) => {
    try {
      const url = await api.downloadDatasetUrl(id);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${name.replace(/\s+/g, "_")}.${ext.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to download file: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading your workspace statistics...</p>
      </div>
    );
  }

  const generatedRows = stats?.rows_generated || 0;
  const limitRows = stats?.rows_limit || 5000;
  const usagePercentage = Math.min(100, Math.round((generatedRows / limitRows) * 100));

  // Circular gauge parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel border border-card-border p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, <span className="gradient-text font-black">{user?.email?.split("@")[0]}</span>
          </h1>
          <p className="text-muted text-sm mt-1 font-medium">
            You are currently on the <span className="text-primary font-bold uppercase">{stats?.plan || "Free"}</span> Plan.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab("wizard")}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Generate New Dataset
        </button>
      </div>

      {/* Upgrade banner when usage ≥ 80% */}
      {stats && usagePercentage >= 80 && stats.plan === "free" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-indigo-500/15 border border-indigo-500/30 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">
                {usagePercentage >= 100 ? "🚫 Row limit reached!" : `⚡ ${100 - usagePercentage}% of your free quota remaining`}
              </p>
              <p className="text-muted text-xs font-semibold mt-0.5">
                {usagePercentage >= 100
                  ? "Upgrade to keep generating data this month."
                  : "Upgrade to Starter for 100K rows/month + all export formats."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab("pricing")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer shrink-0"
          >
            View Plans — from ₹499/mo
          </button>
        </div>
      )}


      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database offline fallback:</span> {error}
            <button onClick={fetchDashboardStats} className="underline block mt-2 text-xs font-semibold hover:text-red-400">
              Try Reconnecting
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Usage Quota Circle Chart */}
        <div className="glass-panel border border-card-border p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 self-start">
            Monthly Row Usage
          </h2>
          <div className="relative h-36 w-36 flex items-center justify-center">
            {/* SVG circle gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-muted-bg fill-transparent"
                strokeWidth="10"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary fill-transparent transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black">{usagePercentage}%</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Used</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-lg font-black tracking-tight text-foreground">
              {generatedRows.toLocaleString()} / {limitRows.toLocaleString()}
            </p>
            <p className="text-xs text-muted font-medium mt-1">
              Rows reset at the end of the month
            </p>
          </div>
        </div>

        {/* Formats distribution bar chart (rendered via SVG) */}
        <div className="glass-panel border border-card-border p-6 rounded-2xl flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
            Export Format Breakdown
          </h2>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {stats?.generation_by_format && Object.entries(stats.generation_by_format).map(([fmt, count]) => {
              const maxVal = Math.max(1, ...Object.values(stats.generation_by_format as Record<string, number>));
              const percent = Math.round(((count as number) / maxVal) * 100);
              return (
                <div key={fmt} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-foreground">{fmt}</span>
                    <span className="text-muted">{(count as number)} datasets</span>
                  </div>
                  <div className="h-3 w-full bg-muted-bg rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-all duration-500 bg-linear-to-r ${
                        fmt === "CSV" ? "from-indigo-500 to-indigo-600" :
                        fmt === "XLSX" ? "from-emerald-500 to-emerald-600" :
                        fmt === "JSON" ? "from-sky-500 to-sky-600" :
                        fmt === "SQL" ? "from-purple-500 to-purple-600" :
                        "from-amber-500 to-amber-600"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions/statistics summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl w-fit">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-2xl font-black block mt-2">{stats?.total_datasets || 0}</span>
              <span className="text-xs text-muted font-semibold">Total Datasets</span>
            </div>
          </div>
          <div className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <span className="text-2xl font-black block mt-2">6 Preset</span>
              <span className="text-xs text-muted font-semibold">Templates Library</span>
            </div>
          </div>
          <div className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between">
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl w-fit">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <span className="text-2xl font-black block mt-2">Active</span>
              <span className="text-xs text-muted font-semibold">API Credentials</span>
            </div>
          </div>
          <div className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-2xl font-black block mt-2">100k Rows</span>
              <span className="text-xs text-muted font-semibold">Max Single Batch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="glass-panel border border-card-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted" />
            <h2 className="text-lg font-bold text-foreground">Recent Generations</h2>
          </div>
          <button onClick={() => setCurrentTab("history")} className="text-xs text-primary font-bold hover:underline">
            View Full History
          </button>
        </div>

        {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <Database className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-muted text-sm font-semibold">No datasets generated yet.</p>
            <button onClick={() => setCurrentTab("wizard")} className="text-xs text-primary font-bold hover:underline mt-1 block">
              Generate your first one now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted font-bold uppercase tracking-wider">
                  <th className="pb-3 font-bold">Name</th>
                  <th className="pb-3 font-bold">Rows</th>
                  <th className="pb-3 font-bold">Format</th>
                  <th className="pb-3 font-bold">Created At</th>
                  <th className="pb-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm font-medium">
                {stats.recent_activity.map((item: any) => (
                  <tr key={item.id} className="group hover:bg-muted-bg/30">
                    <td className="py-3.5 pr-3 text-foreground font-bold">{item.name}</td>
                    <td className="py-3.5 pr-3 text-muted">{item.row_count.toLocaleString()} rows</td>
                    <td className="py-3.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.file_format === "CSV" ? "bg-indigo-500/10 text-indigo-500" :
                        item.file_format === "XLSX" ? "bg-emerald-500/10 text-emerald-500" :
                        item.file_format === "JSON" ? "bg-sky-500/10 text-sky-500" :
                        "bg-purple-500/10 text-purple-500"
                      }`}>
                        {item.file_format}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 text-muted">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleDownload(item.id, item.name, item.file_format)}
                        className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
                      >
                        <FileDown className="h-3 w-3" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
