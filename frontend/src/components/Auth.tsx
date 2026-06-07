"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { KeyRound, Mail, Sparkles, Loader2 } from "lucide-react";

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(email, password);
      } else {
        data = await api.register(email, password);
      }
      onAuthSuccess({
        email: data.email,
        plan: data.plan,
        maxRowsLimit: data.max_rows_limit,
      });
    } catch (err: any) {
      setError(err.message || "Authentication failed. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = async () => {
    setError("");
    setLoading(true);
    try {
      // Login with a default developer demo account
      const data = await api.login("demo@syntheticstudio.ai", "developer_mode_1234");
      onAuthSuccess({
        email: data.email,
        plan: data.plan,
        maxRowsLimit: data.max_rows_limit,
      });
    } catch (err: any) {
      setError(err.message || "Failed to initiate demo mode. Please verify the FastAPI backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs for premium design */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] animate-pulse-subtle" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[100px] animate-pulse-subtle" />

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-card-border relative z-10 animate-fade-in-up">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-linear-to-tr from-primary to-secondary text-white shadow-lg shadow-primary/20 mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Synthetic Data <span className="gradient-text font-black">Studio</span>
          </h1>
          <p className="text-muted text-sm mt-2 font-medium">
            Generate realistic datasets with AI in seconds
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-muted-bg rounded-xl mb-6">
          <button
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin
                ? "bg-card text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin
                ? "bg-card text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-muted-bg border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-sm transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-muted-bg border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-sm transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Register"
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
            <span className="bg-background px-3 text-muted">Or Test Drive</span>
          </div>
        </div>

        <button
          onClick={handleDemoBypass}
          disabled={loading}
          className="w-full py-3 bg-card hover:bg-muted-bg text-primary border border-primary/20 hover:border-primary/40 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-secondary" />
          Bypass for Demo Mode
        </button>

        <p className="text-center text-xs text-muted mt-6 leading-relaxed font-medium">
          Note: Demo mode runs against the local FastAPI server using default credentials.
        </p>
      </div>
    </div>
  );
}
