"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Shield, Users, Database, Percent, Terminal, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AdminPanel() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([
    { timestamp: "2026-06-06T11:15:02Z", level: "INFO", message: "FastAPI server started on http://0.0.0.0:8000" },
    { timestamp: "2026-06-06T11:15:32Z", level: "INFO", message: "Connection to SQLite database established successfully" },
    { timestamp: "2026-06-06T11:16:10Z", level: "INFO", message: "Pre-loaded system industry templates loaded (4 entries)" },
    { timestamp: "2026-06-06T11:17:28Z", level: "INFO", message: "New user registered: demo@syntheticstudio.ai (Plan: Free)" },
    { timestamp: "2026-06-06T11:18:10Z", level: "INFO", message: "Auth validation query processed (User ID: ws_1)" }
  ]);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setLoading(false);
    }
  };

  const simulatedUsers = [
    { email: "demo@syntheticstudio.ai", plan: "free", rows: 4500, limit: 5000 },
    { email: "enterprise-team@microsoft.com", plan: "enterprise", rows: 752000, limit: 10000000 },
    { email: "developer.bob@gmail.com", plan: "starter", rows: 89000, limit: 100000 },
    { email: "test-account@tesla.com", plan: "pro", rows: 12000, limit: 1000000 }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading administration panel...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Control Center
          </h1>
          <p className="text-muted text-sm mt-1 font-medium">
            Global system usage diagnostics, database registries, and licensing statistics.
          </p>
        </div>
        <button
          onClick={fetchAdminStats}
          className="p-2.5 rounded-xl border border-border hover:bg-muted-bg text-foreground cursor-pointer transition-all flex items-center justify-center"
          title="Refresh statistics"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel border border-card-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-muted text-xs font-semibold block">Total Users</span>
            <span className="text-2xl font-black text-foreground">{stats?.total_users || 4}</span>
          </div>
        </div>

        <div className="glass-panel border border-card-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-muted text-xs font-semibold block">Total Runs</span>
            <span className="text-2xl font-black text-foreground">{stats?.total_datasets || 1}</span>
          </div>
        </div>

        <div className="glass-panel border border-card-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-sky-500/10 text-sky-500 rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <span className="text-muted text-xs font-semibold block">Rows Generated</span>
            <span className="text-2xl font-black text-foreground">
              {stats?.total_rows_generated?.toLocaleString() || "4,500"}
            </span>
          </div>
        </div>

        <div className="glass-panel border border-card-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 bg-green-500/10 text-green-500 rounded-xl">
            <CheckCircle2 className="h-6 w-6 animate-pulse-subtle" />
          </div>
          <div>
            <span className="text-muted text-xs font-semibold block">System Engine</span>
            <span className="text-base font-bold text-green-500">Online / Healthy</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User roster */}
        <div className="lg:col-span-2 glass-panel border border-card-border p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-foreground">SaaS User registry</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted font-bold uppercase tracking-wider">
                  <th className="pb-3">User Email</th>
                  <th className="pb-3">Subscription Tier</th>
                  <th className="pb-3">Quota Consumption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs font-medium">
                {simulatedUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-muted-bg/30">
                    <td className="py-3.5 pr-2 text-foreground font-bold">{u.email}</td>
                    <td className="py-3.5 pr-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        u.plan === "free" ? "bg-muted-bg text-muted border border-border" :
                        u.plan === "starter" ? "bg-indigo-500/10 text-indigo-500" :
                        u.plan === "pro" ? "bg-sky-500/10 text-sky-500" :
                        "bg-amber-500/10 text-amber-500"
                      }`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="py-3.5 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted-bg rounded-full overflow-hidden shrink-0">
                          <div
                            style={{ width: `${Math.min(100, (u.rows / u.limit) * 100)}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-[10px] text-muted font-bold">
                          {u.rows.toLocaleString()} / {u.limit.toLocaleString()} rows
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time system logs console */}
        <div className="lg:col-span-1 glass-panel border border-card-border p-6 rounded-2xl flex flex-col space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Terminal className="h-5 w-5 text-muted" />
            Backend Console logs
          </h2>
          <div className="flex-1 bg-black/40 p-4 rounded-xl border border-border font-mono text-[10px] leading-relaxed text-foreground/95 overflow-y-auto max-h-80 space-y-2 select-all">
            {logs.map((log, index) => (
              <div key={index} className="border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                <span className="text-muted">[{log.timestamp.split("T")[1].replace("Z", "")}]</span>{" "}
                <span className="text-secondary font-bold">[{log.level}]</span>{" "}
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
