"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, LayoutGrid, HeartPulse, Landmark, ShoppingBag, GraduationCap, Truck, UserCheck, ChevronRight } from "lucide-react";

interface TemplatesGalleryProps {
  setCurrentTab: (tab: string) => void;
  setSelectedTemplateSchema: (schema: any) => void;
}

export default function TemplatesGallery({ setCurrentTab, setSelectedTemplateSchema }: TemplatesGalleryProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", "Healthcare", "Banking", "Retail", "Education", "Logistics", "HR"];

  const getIcon = (industry: string) => {
    switch (industry.toLowerCase()) {
      case "healthcare": return HeartPulse;
      case "banking": return Landmark;
      case "retail": return ShoppingBag;
      case "education": return GraduationCap;
      case "logistics": return Truck;
      case "hr": return UserCheck;
      default: return LayoutGrid;
    }
  };

  const handleUseTemplate = (schema: any) => {
    setSelectedTemplateSchema(schema);
    setCurrentTab("wizard");
  };

  const filteredTemplates = filter === "All" 
    ? templates 
    : templates.filter(t => t.industry.toLowerCase() === filter.toLowerCase());

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading industry presets...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Templates Gallery</h1>
        <p className="text-muted text-sm mt-1 font-medium">
          Choose a pre-designed database template and populate it with realistic relational mock data.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4 overflow-x-auto">
        {categories.map((cat) => {
          const Icon = getIcon(cat);
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                filter === cat
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "text-muted hover:text-foreground hover:bg-muted-bg border border-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((tpl) => {
          const Icon = getIcon(tpl.industry);
          const tables = tpl.schema_definition?.tables || [];
          return (
            <div
              key={tpl.id}
              className="glass-panel border border-card-border p-6 rounded-2xl flex flex-col justify-between hover:border-primary/30 transition-all group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-muted-bg text-muted px-2.5 py-1 rounded-md">
                    {tpl.industry}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {tpl.name}
                </h3>
                <p className="text-muted text-xs leading-relaxed mt-2 font-medium">
                  {tpl.description}
                </p>

                {/* Schema display */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-muted">
                    Database Schema
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tables.map((tbl: any) => (
                      <div
                        key={tbl.name}
                        className="px-2.5 py-1 bg-muted-bg border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3 text-secondary" />
                        <span className="font-bold">{tbl.name}</span>
                        <span className="text-[10px] text-muted">({tbl.columns?.length} cols)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => handleUseTemplate(tpl.schema_definition)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 group-hover:shadow-primary/20 cursor-pointer"
                >
                  Configure Template
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
