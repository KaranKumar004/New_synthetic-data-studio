"use client";

import { CheckCircle2, AlertTriangle, Info, HelpCircle } from "lucide-react";

interface DatasetQualityReportProps {
  report: {
    overall: number;
    completeness: number;
    integrity: number;
    realism: number;
    duplicate_pct: number;
    missing_pct: number;
    logs: Array<{ status: "success" | "warning"; message: string }>;
  };
}

export default function DatasetQualityReport({ report }: DatasetQualityReportProps) {
  if (!report) {
    return (
      <div className="p-4 bg-muted-bg rounded-xl border border-border text-center text-xs text-muted">
        No quality metrics available for this dataset format.
      </div>
    );
  }

  const { overall, completeness, integrity, realism, duplicate_pct, missing_pct, logs } = report;

  // Color helper based on score value
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 stroke-emerald-500";
    if (score >= 70) return "text-amber-500 stroke-amber-500";
    return "text-red-500 stroke-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-500";
    if (score >= 70) return "bg-amber-500/10 text-amber-500";
    return "bg-red-500/10 text-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Top Section: Radial Score Gauge & Highlights */}
      <div className="flex items-center gap-4 bg-muted-bg/30 p-4 rounded-xl border border-border/50">
        {/* Radial Circle */}
        <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-border"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`transition-all duration-500 ${getScoreColor(overall)}`}
              strokeWidth="3.5"
              strokeDasharray={`${overall}, 100`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-lg font-black text-foreground leading-none">{overall}</span>
            <span className="text-[9px] text-muted font-bold">score</span>
          </div>
        </div>

        {/* Short Summary */}
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted">Quality Verdict</h4>
          <p className="text-sm font-bold text-foreground">
            {overall >= 90
              ? "Enterprise Ready"
              : overall >= 70
              ? "Good Accuracy (Minor Anomalies)"
              : "Noisy/Needs Parameter Adjustment"}
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-card border border-border text-muted">
              {duplicate_pct}% duplicates
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-card border border-border text-muted">
              {missing_pct}% empty
            </span>
          </div>
        </div>
      </div>

      {/* Score Breakdown (Completeness, Referential Integrity, Formatting Realism) */}
      <div className="space-y-3">
        <h4 className="text-[10px] uppercase font-black tracking-widest text-muted">Quality Metrics</h4>

        {/* Data Completeness */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-foreground flex items-center gap-1">
              Data Completeness
              <span className="group relative">
                <HelpCircle className="h-3 w-3 text-muted cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card text-[9px] text-foreground border border-border p-1.5 rounded-lg w-40 font-semibold shadow-xl">
                  Measures percentage of non-null cells across the generated tables.
                </span>
              </span>
            </span>
            <span className="text-muted">{completeness}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-primary to-purple-500 rounded-full transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Referential Integrity */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-foreground flex items-center gap-1">
              Referential Integrity
              <span className="group relative">
                <HelpCircle className="h-3 w-3 text-muted cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card text-[9px] text-foreground border border-border p-1.5 rounded-lg w-40 font-semibold shadow-xl">
                  Percentage of child foreign keys matching valid parent primary keys.
                </span>
              </span>
            </span>
            <span className="text-muted">{integrity}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${integrity}%` }}
            />
          </div>
        </div>

        {/* Schema Realism */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-foreground flex items-center gap-1">
              Data Realism
              <span className="group relative">
                <HelpCircle className="h-3 w-3 text-muted cursor-pointer" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card text-[9px] text-foreground border border-border p-1.5 rounded-lg w-40 font-semibold shadow-xl">
                  Evaluates formatting compliance (valid emails, phone formats, age constraints).
                </span>
              </span>
            </span>
            <span className="text-muted">{realism}%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-amber-500 to-orange-500 rounded-full transition-all"
              style={{ width: `${realism}%` }}
            />
          </div>
        </div>
      </div>

      {/* Logs and Alerts */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <h4 className="text-[10px] uppercase font-black tracking-widest text-muted">Quality Validation Audits</h4>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {logs && logs.map((log, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2 rounded-lg border text-xs font-semibold ${
                log.status === "success"
                  ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {log.status === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
