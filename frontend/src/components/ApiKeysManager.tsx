"use client";

import { useEffect, useState } from "react";
import { api, getBackendUrl } from "@/lib/api";
import { Key, PlusCircle, Trash2, Copy, Check, Info, Code, AlertTriangle } from "lucide-react";

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<any>(null); // holds { raw_key: '...' } once
  const [copied, setCopied] = useState(false);
  const [copyCodeType, setCopyCodeType] = useState("curl");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await api.getApiKeys();
      setKeys(data);
    } catch (err) {
      console.error("Failed to load keys", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const data = await api.createApiKey(newKeyName);
      setCreatedKey(data);
      setNewKeyName("");
      // Refresh list
      fetchKeys();
    } catch (err: any) {
      alert("Failed to create key: " + err.message);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Applications using this key will immediately fail to authenticate.")) return;
    try {
      await api.revokeApiKey(id);
      setKeys(keys.filter((k) => k.id !== id));
      if (createdKey?.id === id) {
        setCreatedKey(null);
      }
    } catch (err: any) {
      alert("Failed to revoke key: " + err.message);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-semibold">Loading API credentials...</p>
      </div>
    );
  }

  const backendUrl = getBackendUrl();
  const demoApiKey = createdKey?.raw_key || "sds_live_your_api_key_here";

  const codeSnippets: Record<string, string> = {
    curl: `curl -X GET "${backendUrl}/api/datasets/YOUR_DATASET_ID/download?api_key=${demoApiKey}" \\
  -H "accept: application/octet-stream"`,
    python: `import requests

dataset_id = "YOUR_DATASET_ID"
url = f"${backendUrl}/api/datasets/{dataset_id}/download"
params = {"api_key": "${demoApiKey}"}

response = requests.get(url, params=params)
with open("dataset.csv", "wb") as f:
    f.write(response.content)
print("File downloaded successfully!")`,
    javascript: `const fs = require('fs');
const fetch = require('node-fetch');

const datasetId = "YOUR_DATASET_ID";
const url = \`${backendUrl}/api/datasets/\${datasetId}/download?api_key=${demoApiKey}\`;

fetch(url)
  .then(res => res.buffer())
  .then(buffer => {
    fs.writeFileSync('dataset.csv', buffer);
    console.log('File downloaded!');
  })
  .catch(err => console.error(err));`
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">API Access Manager</h1>
        <p className="text-muted text-sm mt-1 font-medium">
          Generate API keys to integrate synthetic data generation and secure downloads directly into your software testing workflows.
        </p>
      </div>

      {/* New Key display Alert */}
      {createdKey && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>Save your API Key!</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Copy this key now. For security reasons, <span className="font-bold">it will not be shown again.</span>
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-black/20 text-foreground font-mono p-3 rounded-xl border border-border select-all break-all text-xs font-semibold flex items-center justify-between">
              {createdKey.raw_key}
            </code>
            <button
              onClick={() => handleCopy(createdKey.raw_key)}
              className="px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* API keys list and form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Key className="h-5 w-5 text-muted" />
              Active API Keys
            </h2>

            <form onSubmit={handleCreateKey} className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key Description (e.g. CI/CD test key)"
                className="flex-1 px-4 py-3 bg-muted-bg border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-sm transition-all"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-primary/10 hover:shadow-primary/20 cursor-pointer shrink-0"
              >
                <PlusCircle className="h-4 w-4" />
                Create Key
              </button>
            </form>

            {keys.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl">
                <p className="text-muted text-sm font-bold">No API keys active.</p>
                <p className="text-muted text-xs mt-1">Generate a key above to start programmatic queries.</p>
              </div>
            ) : (
              <div className="divide-y divide-border text-sm font-medium">
                {keys.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <div className="flex gap-4 text-xs text-muted mt-1 font-semibold">
                        <code>{item.masked_key}</code>
                        <span>Created on: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeKey(item.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/10 hover:border-red-500/20 cursor-pointer"
                      title="Revoke Key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick instructions */}
          <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
              <Info className="h-4 w-4 text-primary" />
              API Key Usage Information
            </h2>
            <div className="text-xs text-muted leading-relaxed space-y-3 font-medium">
              <p>
                To download datasets programmatically, append your active key as a query parameter <code className="bg-black/25 px-1.5 py-0.5 rounded text-foreground">api_key</code> to the download URL.
              </p>
              <p>
                API access is rate-limited according to your subscription tier. Free users can execute up to <span className="font-bold text-foreground">50 requests per hour</span>. Keep your keys secret to avoid quota limits being depleted.
              </p>
            </div>
          </div>
        </div>

        {/* Integration code widgets */}
        <div className="lg:col-span-1 glass-panel border border-card-border p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Code className="h-5 w-5 text-muted" />
            Code Integrations
          </h2>

          <div className="flex gap-2 p-1 bg-muted-bg rounded-xl text-xs font-bold">
            {["curl", "python", "javascript"].map((lang) => (
              <button
                key={lang}
                onClick={() => setCopyCodeType(lang)}
                className={`flex-1 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  copyCodeType === lang ? "bg-card text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="bg-black/30 p-4 rounded-xl border border-border text-foreground font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 select-all">
              {codeSnippets[copyCodeType]}
            </pre>
            <button
              onClick={() => handleCopy(codeSnippets[copyCodeType])}
              className="absolute right-2 top-2 p-1.5 bg-card hover:bg-muted-bg border border-border text-foreground rounded-lg cursor-pointer transition-all"
              title="Copy snippet"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
