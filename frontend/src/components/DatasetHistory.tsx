"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { History, FileDown, Trash2, Clock, Eye, Sparkles, AlertCircle, Copy, Bot, TrendingUp, ShoppingBag, CheckCircle2, MessageSquare, X } from "lucide-react";
import DatasetQualityReport from "./DatasetQualityReport";
import AiDatasetAssistant from "./AiDatasetAssistant";
import DataDriftSimulator from "./DataDriftSimulator";

interface DatasetHistoryProps {
  setCurrentTab: (tab: string) => void;
  setSelectedTemplateSchema: (schema: any) => void;
}

export default function DatasetHistory({ setCurrentTab, setSelectedTemplateSchema }: DatasetHistoryProps) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<any>(null);

  // Inspector & Action States
  const [inspectorTab, setInspectorTab] = useState<"fields" | "quality">("fields");
  const [showAssistant, setShowAssistant] = useState(false);
  const [showDrift, setShowDrift] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  // Publish state parameters
  const [publishPrice, setPublishPrice] = useState("0.00");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getDatasets();
      setDatasets(data);
    } catch (err) {
      setError("Failed to fetch dataset generation history.");
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
      alert("Failed to download: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset? This will remove the file permanently from the server.")) return;
    try {
      await api.deleteDataset(id);
      setDatasets(datasets.filter((d) => d.id !== id));
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
      }
    } catch (err: any) {
      alert("Failed to delete dataset: " + err.message);
    }
  };

  const handleCloneSchema = (item: any) => {
    // Extract standard schema definition
    if (item.schema_definition) {
      setSelectedTemplateSchema(item.schema_definition);
      setCurrentTab("wizard");
    }
  };

  const handlePublishToMarketplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;
    setPublishLoading(true);
    setPublishSuccess(false);
    try {
      const priceVal = parseFloat(publishPrice) || 0.0;
      await api.publishMarketplace(selectedDataset.id, priceVal, publishDesc);
      setPublishSuccess(true);
      // Update local state to reflect public listing
      setDatasets(datasets.map(d => d.id === selectedDataset.id ? { ...d, is_public: true, price: priceVal } : d));
      setSelectedDataset({ ...selectedDataset, is_public: true, price: priceVal });
      setPublishDesc("");
      setPublishPrice("0.00");
      setTimeout(() => {
        setShowPublishModal(false);
        setPublishSuccess(false);
      }, 1500);
    } catch (err: any) {
      alert("Publishing failed: " + err.message);
    } finally {
      setPublishLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading generation history...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dataset History</h1>
        <p className="text-muted text-sm mt-1 font-medium">
          Review your past generation runs, download files, inspect structure schemas, or clone schemas.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table view */}
        <div className="lg:col-span-2 glass-panel border border-card-border p-6 rounded-2xl">
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 text-muted mx-auto mb-3 opacity-50" />
              <p className="text-muted text-sm font-bold">No generation records found.</p>
              <button
                onClick={() => setCurrentTab("wizard")}
                className="text-xs text-primary font-bold hover:underline mt-2 block mx-auto"
              >
                Create your first dataset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted font-bold uppercase tracking-wider">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Rows</th>
                    <th className="pb-3">Format</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm font-medium">
                  {datasets.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDataset(item)}
                      className={`group hover:bg-muted-bg/30 cursor-pointer transition-all ${
                        selectedDataset?.id === item.id ? "bg-muted-bg/50" : ""
                      }`}
                    >
                      <td className="py-3.5 pr-2 text-foreground font-bold">{item.name}</td>
                      <td className="py-3.5 pr-2 text-muted">{item.row_count.toLocaleString()}</td>
                      <td className="py-3.5 pr-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                          {item.file_format}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-muted text-xs">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDownload(item.id, item.name, item.file_format)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted-bg text-foreground cursor-pointer"
                          title="Download File"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 text-red-500 cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schema details card */}
        <div className="lg:col-span-1">
          {selectedDataset ? (
            <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-4 animate-fade-in-up relative">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Metadata Inspector
                </span>
                <h2 className="text-xl font-bold mt-2 text-foreground">{selectedDataset.name}</h2>
                <div className="flex gap-2 mt-1 select-none">
                  {selectedDataset.is_public && (
                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                      Marketplace listed
                    </span>
                  )}
                  <span className="text-[9px] text-muted/80 font-bold block pt-0.5">
                    Version v{selectedDataset.version}
                  </span>
                </div>
              </div>

              {/* Sub tabs: Fields vs Quality Report */}
              <div className="flex border-b border-border/80 text-xs font-bold select-none pt-2">
                <button
                  type="button"
                  onClick={() => setInspectorTab("fields")}
                  className={`flex-1 pb-2 text-center border-b-2 transition-all ${
                    inspectorTab === "fields" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  Fields Schema
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("quality")}
                  className={`flex-1 pb-2 text-center border-b-2 transition-all ${
                    inspectorTab === "quality" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  Quality Report
                </button>
              </div>

              {inspectorTab === "fields" ? (
                <>
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted">Total Rows:</span>
                      <span className="text-foreground font-bold">
                        {selectedDataset.row_count.toLocaleString()} rows
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted">Export Format:</span>
                      <span className="text-foreground font-bold">{selectedDataset.file_format}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted">Generated On:</span>
                      <span className="text-foreground font-bold">
                        {new Date(selectedDataset.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted block mb-2">
                      Schema Fields
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                      {selectedDataset.schema_definition?.tables?.map((table: any) => (
                        <div key={table.name} className="space-y-1 bg-muted-bg p-2.5 rounded-xl border border-border">
                          <div className="text-xs font-black text-secondary flex justify-between items-center">
                            <span>Table: {table.name}</span>
                            <span className="text-[10px] text-muted">({table.rows} rows)</span>
                          </div>
                          <div className="space-y-1 pt-1.5">
                            {table.columns?.map((c: any) => (
                              <div key={c.name} className="flex justify-between items-center text-[11px] border-b border-border/40 pb-1">
                                <span className="font-bold text-foreground">{c.name}</span>
                                <span className="text-muted">{c.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="pt-1">
                  <DatasetQualityReport report={selectedDataset.quality_report} />
                </div>
              )}

              {/* Action Buttons row (AI Assistant, Drift, Publish) */}
              <div className="pt-3 border-t border-border/80 flex flex-wrap gap-1.5 select-none">
                <button
                  onClick={() => setShowAssistant(true)}
                  className="flex-1 min-w-[90px] py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl transition-all hover:bg-primary/25 flex items-center justify-center gap-1 cursor-pointer"
                  title="Talk to AI"
                >
                  <Bot className="h-3.5 w-3.5" />
                  AI Agent
                </button>
                <button
                  onClick={() => setShowDrift(true)}
                  className="flex-1 min-w-[90px] py-2 bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-bold rounded-xl transition-all hover:bg-purple-500/20 flex items-center justify-center gap-1 cursor-pointer"
                  title="Simulate Drift"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Drift
                </button>
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex-1 min-w-[90px] py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold rounded-xl transition-all hover:bg-amber-500/20 flex items-center justify-center gap-1 cursor-pointer"
                  title="Publish to Marketplace"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Publish
                </button>
              </div>

              {/* Clone and download row */}
              <div className="pt-3 border-t border-border flex gap-2 select-none">
                <button
                  onClick={() => handleCloneSchema(selectedDataset)}
                  className="flex-1 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Clone Schema
                </button>
                <button
                  onClick={() => handleDownload(selectedDataset.id, selectedDataset.name, selectedDataset.file_format)}
                  className="px-3.5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center"
                  title="Download File"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              </div>

              {/* AI Chat drawer overlay */}
              {showAssistant && (
                <AiDatasetAssistant
                  datasetId={selectedDataset.id}
                  datasetName={selectedDataset.name}
                  onClose={() => setShowAssistant(false)}
                />
              )}

              {/* Drift Simulator overlay modal */}
              {showDrift && (
                <DataDriftSimulator
                  datasetId={selectedDataset.id}
                  datasetName={selectedDataset.name}
                  onClose={() => setShowDrift(false)}
                />
              )}

              {/* Publish to Marketplace Dialog Overlay */}
              {showPublishModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
                  <div className="glass-panel border border-card-border bg-card w-full max-w-sm rounded-2xl p-5 space-y-4 animate-scale-in">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-amber-500" />
                        Publish to Public Marketplace
                      </h4>
                      <button
                        onClick={() => setShowPublishModal(false)}
                        className="p-1 rounded-lg hover:bg-muted-bg text-muted cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {publishSuccess ? (
                      <div className="text-center py-4 space-y-2 animate-fade-in-up">
                        <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-foreground">Published Successfully!</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePublishToMarketplace} className="space-y-4 text-left">
                        <div>
                          <label className="block text-[10px] uppercase font-black text-muted mb-1">Set Price (USD)</label>
                          <input
                            type="text"
                            placeholder="0.00 (Free)"
                            value={publishPrice}
                            onChange={(e) => setPublishPrice(e.target.value)}
                            className="w-full bg-muted-bg border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:border-primary outline-hidden"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-muted mb-1">Dataset Description</label>
                          <textarea
                            placeholder="Describe what variables this dataset highlights..."
                            value={publishDesc}
                            onChange={(e) => setPublishDesc(e.target.value)}
                            rows={3}
                            className="w-full bg-muted-bg border border-border rounded-xl px-3 py-2 text-xs font-medium focus:border-primary outline-hidden"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={publishLoading}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                        >
                          {publishLoading ? "Listing dataset..." : "Confirm Publish Marketplace"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel border border-card-border p-6 rounded-2xl text-center py-16">
              <Eye className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-muted text-xs font-bold">
                Select a dataset from the history to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
