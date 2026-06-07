"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bookmark, Star, Trash2, Copy, Search, Send, Plus, AlertCircle, Sparkles } from "lucide-react";

interface SavedPromptsProps {
  setCurrentTab: (tab: string) => void;
  setAiPrompt: (prompt: string) => void;
  setMode: (mode: "ai" | "manual") => void;
}

export default function SavedPrompts({ setCurrentTab, setAiPrompt, setMode }: SavedPromptsProps) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);

  // New prompt form state
  const [newTitle, setNewTitle] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    let result = prompts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.prompt_text.toLowerCase().includes(q)
      );
    }
    if (filterFavorites) {
      result = result.filter((p) => p.is_favorite);
    }
    setFilteredPrompts(result);
  }, [prompts, searchQuery, filterFavorites]);

  const fetchPrompts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getSavedPrompts();
      setPrompts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load prompts library.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPromptText.trim()) return;

    try {
      const added = await api.savePrompt(newTitle, newPromptText);
      setPrompts([added, ...prompts]);
      setNewTitle("");
      setNewPromptText("");
      setIsCreating(false);
    } catch (err: any) {
      alert("Failed to save prompt: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt template?")) return;
    try {
      await api.deletePrompt(id);
      setPrompts(prompts.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const updated = await api.toggleFavoritePrompt(id);
      setPrompts(prompts.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      alert("Failed to toggle favorite: " + err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await api.duplicatePrompt(id);
      setPrompts([duplicated, ...prompts]);
    } catch (err: any) {
      alert("Failed to duplicate prompt: " + err.message);
    }
  };

  const handleLoadIntoGenerator = (promptText: string) => {
    setAiPrompt(promptText);
    setMode("ai");
    setCurrentTab("wizard");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading prompts library...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Saved Prompt Library</h1>
          <p className="text-muted text-sm mt-1 font-medium">
            Save successful prompts, organize templates, clone configuration presets, or launch them in the AI engine.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Prompt Preset
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Save prompt form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="glass-panel border border-card-border p-6 rounded-2xl max-w-2xl space-y-4 animate-fade-in-up">
          <h3 className="text-base font-extrabold text-foreground">New Saved Prompt Template</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1.5">Prompt Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Retail Customers with Purchases"
                className="w-full px-3.5 py-2 bg-muted-bg border border-border rounded-xl focus:border-primary outline-hidden text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1.5">Prompt Instructions</label>
              <textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="Describe your dataset tables, fields, rows, locales..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl focus:border-primary outline-hidden text-xs font-medium leading-relaxed"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-card hover:bg-muted-bg border border-border text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-primary/10 cursor-pointer"
            >
              Save to Library
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved templates..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs outline-hidden focus:border-primary placeholder:text-muted/70 font-semibold"
          />
        </div>

        {/* Favorite toggle */}
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer w-full sm:w-auto justify-center ${
            filterFavorites
              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
              : "bg-card border-border text-muted hover:text-foreground"
          }`}
        >
          <Star className={`h-4 w-4 ${filterFavorites ? "fill-amber-500" : ""}`} />
          Favorites Only
        </button>
      </div>

      {/* Prompts Cards Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="glass-panel border border-card-border p-12 text-center rounded-2xl">
          <Bookmark className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted text-sm font-bold">No saved prompt templates found.</p>
          <span className="text-xs text-muted/70 block mt-1 font-semibold">
            {searchQuery || filterFavorites ? "Try clearing your active filters." : "Create one to pre-populate your library configuration."}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((item) => (
            <div key={item.id} className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between gap-4 hover:border-primary/30 transition-all group relative">
              {/* Star absolute button */}
              <button
                onClick={() => handleToggleFavorite(item.id)}
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-border bg-card/60 text-muted hover:text-amber-500 transition-all cursor-pointer"
              >
                <Star className={`h-3.5 w-3.5 ${item.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
              </button>

              <div className="space-y-3 pr-6">
                <div>
                  <h3 className="font-extrabold text-sm text-foreground line-clamp-1">{item.title}</h3>
                  <span className="text-[9px] text-muted font-bold tracking-tight block mt-0.5">
                    Saved {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted text-xs leading-relaxed font-semibold bg-muted-bg/30 p-3 rounded-xl border border-border/40 min-h-[72px] line-clamp-3">
                  "{item.prompt_text}"
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDuplicate(item.id)}
                    className="p-2 rounded-lg border border-border text-muted hover:text-foreground cursor-pointer hover:bg-muted-bg"
                    title="Duplicate Preset"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    title="Delete Preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleLoadIntoGenerator(item.prompt_text)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  Load Generator
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
