"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Download, Star, Tag, ShoppingCart, CheckCircle, CreditCard, Loader2, ArrowRight, ShieldAlert, Sparkles, X } from "lucide-react";

export default function DatasetMarketplace() {
  const [marketplaceDatasets, setMarketplaceDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment checkout flow state
  const [checkoutDataset, setCheckoutDataset] = useState<any>(null);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("4000 1234 5678 9010");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getMarketplace();
      setMarketplaceDatasets(data);
    } catch (err: any) {
      setError(err.message || "Failed to load marketplace datasets.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (dataset: any) => {
    // If the price is 0, download immediately or proceed to checkout
    if (dataset.price === 0) {
      triggerDownload(dataset.id, dataset.name, dataset.file_format);
      return;
    }
    // Paid dataset: trigger payment drawer
    setCheckoutDataset(dataset);
    setCheckoutSuccess(false);
    setCheckoutProcessing(false);
  };

  const executePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutDataset) return;

    setCheckoutProcessing(true);
    try {
      // Send API purchase command
      await api.purchaseMarketplace(checkoutDataset.id);
      
      setCheckoutProcessing(false);
      setCheckoutSuccess(true);
      
      // Update download count locally
      setMarketplaceDatasets((prev) =>
        prev.map((d) =>
          d.id === checkoutDataset.id ? { ...d, downloads: d.downloads + 1 } : d
        )
      );

      // Delay download trigger slightly for UX
      setTimeout(() => {
        triggerDownload(checkoutDataset.id, checkoutDataset.name, checkoutDataset.file_format);
        setCheckoutDataset(null);
        setCheckoutSuccess(false);
      }, 1500);

    } catch (err: any) {
      alert("Checkout failed: " + err.message);
      setCheckoutProcessing(false);
    }
  };

  const triggerDownload = async (id: string, name: string, format: string) => {
    try {
      const url = await api.downloadDatasetUrl(id);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${name.replace(/\s+/g, "_")}_marketplace.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to download: " + err.message);
    }
  };

  const filtered = marketplaceDatasets.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.schema_definition?.description || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading public marketplace...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dataset Marketplace</h1>
          <p className="text-muted text-sm mt-1 font-medium">
            Browse pre-generated industry-grade AI datasets, buy/sell synthetic test schemas, or download files.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search marketplace datasets by name or tags..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs outline-hidden focus:border-primary placeholder:text-muted/70 font-semibold"
        />
      </div>

      {/* Marketplace Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel border border-card-border p-16 text-center rounded-2xl">
          <ShoppingCart className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted text-sm font-bold">No public datasets match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className="glass-panel border border-card-border p-5 rounded-2xl flex flex-col justify-between gap-4 hover:border-primary/30 transition-all relative group">
              
              {/* Row Counts Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                  {item.row_count.toLocaleString()} rows
                </span>
                
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  {item.rating || "4.8"}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <p className="text-muted text-xs leading-relaxed font-semibold line-clamp-3">
                  {item.schema_definition?.description || "Premium synthetic training dataset containing compliant records, formatted relations and structures."}
                </p>
              </div>

              {/* Format & Downloads Count info */}
              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted-bg border border-border text-muted">
                  Format: {item.file_format}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted-bg border border-border text-muted">
                  Downloads: {item.downloads}
                </span>
              </div>

              {/* Footer: Price Tag and Button */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm font-black text-foreground">
                    {item.price === 0 ? "FREE" : `$${item.price.toFixed(2)}`}
                  </span>
                </div>

                <button
                  onClick={() => handlePurchase(item)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  {item.price === 0 ? <Download className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  {item.price === 0 ? "Download" : "Buy Dataset"}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Transactional Checkout Modal Overlay */}
      {checkoutDataset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel border border-card-border bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-primary" />
                Secure Checkout
              </h3>
              <button
                onClick={() => setCheckoutDataset(null)}
                className="p-1 rounded-lg hover:bg-muted-bg text-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="text-center py-6 space-y-3 animate-fade-in-up">
                <div className="h-12 w-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">Payment Approved!</h4>
                  <p className="text-[11px] text-muted font-semibold mt-1">
                    Your mock transaction succeeded. Downloading dataset file now...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={executePayment} className="space-y-4">
                {/* Product Summary */}
                <div className="bg-muted-bg/30 p-3.5 rounded-xl border border-border/60 flex justify-between items-center text-xs font-semibold">
                  <div className="space-y-0.5">
                    <span className="text-foreground font-black truncate block max-w-[200px]">{checkoutDataset.name}</span>
                    <span className="text-[10px] text-muted">{checkoutDataset.row_count.toLocaleString()} rows • {checkoutDataset.file_format}</span>
                  </div>
                  <span className="text-foreground font-black text-sm">${checkoutDataset.price.toFixed(2)}</span>
                </div>

                {/* Card input mock */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-muted mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-muted-bg border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-primary outline-hidden"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-muted mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-muted-bg border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-primary outline-hidden text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black text-muted mb-1">CVC</label>
                      <input
                        type="password"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full bg-muted-bg border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-primary outline-hidden text-center"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={checkoutProcessing}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {checkoutProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3.5 w-3.5" />
                    )}
                    {checkoutProcessing ? "Authorizing Charge..." : `Pay $${checkoutDataset.price.toFixed(2)}`}
                  </button>
                  <span className="text-[9px] text-muted/70 text-center block mt-2 font-bold flex items-center justify-center gap-1 select-none">
                    <Sparkles className="h-3 w-3 text-primary" /> Demo Mode: Feel free to use test cards!
                  </span>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
