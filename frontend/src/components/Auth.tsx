"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { KeyRound, Mail, Sparkles, Loader2, Database, Shield, Cpu } from "lucide-react";

// Asset URLs
const BG_IMAGE_1 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";
const BG_IMAGE_2 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

interface RevealLayerProps {
  image: string;
  cursorX: number;
  cursorY: number;
  spotlightRadius: number;
}

// Spotlight Reveal Mask Component
function RevealLayer({ image, cursorX, cursorY, spotlightRadius }: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Build radial gradient at (cursorX, cursorY)
    const gradient = ctx.createRadialGradient(
      cursorX,
      cursorY,
      0,
      cursorX,
      cursorY,
      spotlightRadius
    );

    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.75)");
    gradient.addColorStop(0.75, "rgba(255, 255, 255, 0.4)");
    gradient.addColorStop(0.88, "rgba(255, 255, 255, 0.12)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, spotlightRadius, 0, Math.PI * 2);
    ctx.fill();

    try {
      const dataUrl = canvas.toDataURL();
      const div = divRef.current;
      if (div) {
        div.style.maskImage = `url(${dataUrl})`;
        div.style.webkitMaskImage = `url(${dataUrl})`;
        div.style.maskSize = "100% 100%";
        div.style.webkitMaskSize = "100% 100%";
      }
    } catch (e) {
      console.error("Canvas toDataURL failed: ", e);
    }
  }, [cursorX, cursorY, dimensions, spotlightRadius]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 pointer-events-none"
        style={{ display: "none" }}
      />
      <div
        ref={divRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  );
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google sign in simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [showCustomGoogleEmail, setShowCustomGoogleEmail] = useState(false);
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);

  // Spotlight Mouse Tracking with LERP
  const SPOTLIGHT_R = 260;
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    const updateSpotlight = () => {
      if (smooth.current.x === -999) {
        smooth.current = { ...mouse.current };
      } else {
        smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
        smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      }
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };

    rafRef.current = requestAnimationFrame(updateSpotlight);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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

  const handleGoogleLogin = () => {
    setShowGoogleModal(true);
  };

  const triggerGoogleLoginWithEmail = async (emailToUse: string) => {
    setGoogleLoggingIn(true);
    setError("");
    try {
      const data = await api.login(emailToUse, "google_oauth_bypass_12345");
      // Simulate typical Google auth redirect latency
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowGoogleModal(false);
      onAuthSuccess({
        email: data.email,
        plan: data.plan,
        maxRowsLimit: data.max_rows_limit,
      });
    } catch (err: any) {
      setError(err.message || "Google Authentication failed. Please verify the FastAPI backend is running.");
      setShowGoogleModal(false);
    } finally {
      setGoogleLoggingIn(false);
    }
  };

  const handleDemoBypass = async () => {
    setError("");
    setLoading(true);
    try {
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
    <div 
      className="min-h-screen w-full flex flex-col relative overflow-y-auto scroll-smooth bg-black text-white"
      style={{ 
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* FIXED SPOTLIGHT BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base Image */}
        <div 
          className="absolute inset-0 bg-center bg-cover bg-no-repeat hero-zoom"
          style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        />

        {/* Reveal Layer */}
        <RevealLayer 
          image={BG_IMAGE_2}
          cursorX={cursorPos.x}
          cursorY={cursorPos.y}
          spotlightRadius={SPOTLIGHT_R}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-5 md:px-10 md:py-6 bg-gradient-to-b from-black/80 to-transparent">
        <div 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Synthetic <span style={{ background: "linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Data Studio</span>
          </span>
        </div>

        {/* Center Navigation Pill */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <button className="bg-white/25 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap">
            Home
          </button>
          {[
            { label: "Supported Domains", target: "features-section" },
            { label: "Why Us", target: "why-us-section" },
            { label: "Use Cases", target: "use-cases-section" }
          ].map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => {
                const el = document.getElementById(item.target);
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-white/80 hover:bg-white/20 hover:text-white transition-colors px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Action */}
        <div className="hidden md:block">
          <button 
            onClick={() => {
              const el = document.getElementById("auth-card-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-all cursor-pointer whitespace-nowrap"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* SCROLLABLE CONTENT WRAPPER */}
      <div className="relative z-10 w-full flex flex-col">
        
        {/* Full-Screen Hero Section with exact absolute constraints */}
        <section 
          className="relative w-full overflow-hidden h-screen bg-transparent"
          style={{ height: '100dvh' }}
        >
          {/* Heading */}
          <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
            <h1 className="text-white leading-[0.95]">
              <span 
                className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
                style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
              >
                Data holds
              </span>
              <span 
                className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
                style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
              >
                patterns of truth
              </span>
            </h1>
          </div>

          {/* Bottom Left Paragraph */}
          <div 
            className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade text-left"
            style={{ animationDelay: '0.7s' }}
          >
            <p className="text-sm text-white/80 leading-relaxed font-medium">
              Every layer of correlation records a chapter of your system, from schema relations to deep statistical distributions, aligned across millions of records beneath your models.
            </p>
          </div>

          {/* Bottom Right Block */}
          <div 
            className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade text-left"
            style={{ animationDelay: '0.85s' }}
          >
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              Our correlation engines let you peel back the columns to trace how metrics, patterns, and deep features combine to shape the ground truth beneath your training pipelines.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById("features-section");
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30 cursor-pointer"
            >
              Start Seeding
            </button>
          </div>
        </section>

        {/* What Can Be Obtained / Domains Section */}
        <section id="features-section" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              What Can Be Obtained Here
            </h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Get instant access to rich multi-dimensional schemas across all major industry verticals
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Geology & Earth", desc: "Correlated mineral datasets, rock layer compositions, and fossil distributions.", color: "#e8702a" },
              { title: "Healthcare", desc: "Correlated diseases, matching patient symptoms, severity flags, and treatments.", color: "#6366f1" },
              { title: "Finance", desc: "Credit card transaction logs, categories, amounts, card types, and risk scores.", color: "#0ea5e9" },
              { title: "Agriculture", desc: "Crop yields aligned with soil pH, rainfall records, and fertilizers.", color: "#10b981" },
              { title: "Education", desc: "Student courses, GPAs, study hours, and post-grad career placements.", color: "#f59e0b" },
              { title: "HR & Salaries", desc: "Employee roles, department metrics, years of experience, and salary tiers.", color: "#ec4899" },
              { title: "Technology", desc: "Network device assets, operating systems, patch status, and vulnerabilities.", color: "#8b5cf6" },
              { title: "Environment", desc: "Sensor AQI parameters, temperatures, humidity, and carbon indices.", color: "#ef4444" }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl border transition-all duration-300 hover:border-white/20"
                style={{ 
                  backgroundColor: "rgba(17, 24, 39, 0.65)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)"
                }}
              >
                <div className="w-1.5 h-6 rounded-full mb-4" style={{ backgroundColor: item.color }} />
                <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Supported Formats */}
          <div 
            className="mt-10 p-6 rounded-2xl border border-white/8 bg-slate-900/40 flex flex-wrap items-center justify-between gap-6"
            style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          >
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Supported Export Formats</h4>
              <p className="text-xs text-slate-400 font-medium">Export high-density seed tables to feed directly into your applications.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {["CSV", "JSON", "SQL DUMP", "PARQUET", "EXCEL (XLSX)"].map((fmt, idx) => (
                <span key={idx} className="text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 text-indigo-300">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Why We Are The Best Section */}
        <section id="why-us-section" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Why Synthetic Data Studio is the Best
            </h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Engineered for realistic relational integrity, schema flexibility, and developer velocity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              className="p-8 rounded-2xl border flex flex-col transition-all duration-300"
              style={{ 
                backgroundColor: "rgba(17, 24, 39, 0.65)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
              }}
            >
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 w-fit mb-6">
                <Database className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>True Column Correlation</h3>
              <p className="text-xs text-slate-400 leading-relaxed flex-1 font-medium">
                Unlike generic generators that insert random strings, our engines enforce logical consistency. Symptoms match diseases, zip codes fit location tags, and metrics fluctuate with realistic standard deviations.
              </p>
            </div>

            <div 
              className="p-8 rounded-2xl border flex flex-col transition-all duration-300"
              style={{ 
                backgroundColor: "rgba(17, 24, 39, 0.65)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
              }}
            >
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 w-fit mb-6">
                <Cpu className="h-6 w-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Gemini Schema Inference</h3>
              <p className="text-xs text-slate-400 leading-relaxed flex-1 font-medium">
                No manual configuration required. Tell our Gemini AI what dataset you need in plain English (e.g., "Seed customer logs with payment details"), and the AI infers the columns, types, and generation instructions instantly.
              </p>
            </div>

            <div 
              className="p-8 rounded-2xl border flex flex-col transition-all duration-300"
              style={{ 
                backgroundColor: "rgba(17, 24, 39, 0.65)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
              }}
            >
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit mb-6">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Staging & Privacy Compliant</h3>
              <p className="text-xs text-slate-400 leading-relaxed flex-1 font-medium">
                Safeguard personal customer data. Fully replace actual client records with synthetic equivalents that have identical mathematical qualities, allowing developers to test sandbox code worry-free under GDPR and HIPAA.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases-section" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Where Can You Use This Data?
            </h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Accelerate your engineering and analytical pipelines with premium test data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { num: "1", title: "Machine Learning Training", desc: "Train algorithms, test feature variables, and balance datasets without exposing private user records. The mathematical features preserve model predictive accuracy.", color: "text-indigo-400" },
              { num: "2", title: "Database Seeding & Stress-Testing", desc: "Fill staging tables with 100,000s of logical records in seconds to test query latency, check execution plans, verify API indexes, and stress-test scaling benchmarks.", color: "text-sky-400" },
              { num: "3", title: "Product & Client Demos", desc: "Design mock UI screens and analytical reporting boards. Power client prototypes with logical, populated, and fully-formed dashboards instead of empty state templates.", color: "text-emerald-400" },
              { num: "4", title: "Compliance and Auditing", desc: "Conduct system audits, load testing, or third-party integration pipelines using mock rows that fulfill real privacy requirements like GDPR, HIPAA, and CCPA.", color: "text-amber-400" }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="flex gap-4 p-6 rounded-2xl border border-white/5 bg-slate-900/25"
                style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
              >
                <div className={`h-10 w-10 rounded-full bg-slate-800/80 flex items-center justify-center ${item.color} shrink-0 font-bold`}>{item.num}</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Login Card Section */}
        <section 
          id="auth-card-section" 
          className="relative z-10 w-full flex flex-col items-center justify-center py-24 px-6 scroll-mt-20"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Ready to Build?
            </h2>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-black">
              Sign up or log in below to open the developer dashboard
            </p>
          </div>

          {/* Main Spacious Card */}
          <div 
            className="w-full glass-panel shadow-2xl relative"
            style={{ 
              maxWidth: "680px", 
              padding: "56px 48px", 
              borderRadius: "24px",
              backgroundColor: "rgba(17, 24, 39, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#f3f4f6"
            }}
          >
            {/* Card Header */}
            <div className="text-center mb-8">
              <h3 
                className="text-2xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {isLogin ? "Sign In to Studio" : "Create Developer Account"}
              </h3>
              <p className="text-slate-400 text-xs mt-2 font-medium">
                {isLogin ? "Enter your credentials or use Google authorization" : "Get started with your free developer tier limits"}
              </p>
            </div>

            {/* Auth Mode Toggle Tabs */}
            <div 
              className="grid grid-cols-2 p-1 mb-8"
              style={{ 
                backgroundColor: "rgba(255, 255, 255, 0.04)", 
                border: "1px solid rgba(255, 255, 255, 0.05)", 
                borderRadius: "12px" 
              }}
            >
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                }}
                className="py-2.5 text-sm font-bold transition-all cursor-pointer"
                style={{ 
                  borderRadius: "8px",
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: isLogin ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isLogin ? "#ffffff" : "#94a3b8",
                  border: isLogin ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent"
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                }}
                className="py-2.5 text-sm font-bold transition-all cursor-pointer"
                style={{ 
                  borderRadius: "8px",
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: !isLogin ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: !isLogin ? "#ffffff" : "#94a3b8",
                  border: !isLogin ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent"
                }}
              >
                Create Account
              </button>
            </div>

            {/* Error Notice */}
            {error && (
              <div 
                className="p-4 mb-6 text-xs font-semibold leading-relaxed flex items-center gap-2"
                style={{ 
                  backgroundColor: "rgba(239, 68, 68, 0.1)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)", 
                  borderRadius: "10px", 
                  color: "#f87171" 
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "#94a3b8", fontSize: "11px" }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail 
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5" 
                    style={{ color: "#64748b" }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pr-4 outline-hidden text-sm transition-all"
                    style={{ 
                      paddingLeft: "46px", 
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                      fontFamily: "'Inter', sans-serif"
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "#94a3b8", fontSize: "11px" }}
                >
                  Password
                </label>
                <div className="relative">
                  <KeyRound 
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5" 
                    style={{ color: "#64748b" }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-4 outline-hidden text-sm transition-all"
                    style={{ 
                      paddingLeft: "46px", 
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                      fontFamily: "'Inter', sans-serif"
                    }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-medium"
                style={{ 
                  backgroundColor: "#6366f1",
                  color: "#ffffff",
                  height: "48px",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Register Account"
                )}
              </button>
            </form>

            {/* Social login option */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }} />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                <span 
                  className="px-4" 
                  style={{ 
                    backgroundColor: "rgb(20, 27, 43)", 
                    color: "#64748b",
                    fontSize: "10px",
                    fontFamily: "'Inter', sans-serif" 
                  }}
                >
                  Or Continue With
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs font-medium"
              style={{ 
                backgroundColor: "#ffffff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                height: "48px",
                borderRadius: "12px",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }} />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                <span 
                  className="px-4" 
                  style={{ 
                    backgroundColor: "rgb(20, 27, 43)", 
                    color: "#64748b",
                    fontSize: "10px",
                    fontFamily: "'Inter', sans-serif" 
                  }}
                >
                  Or Test Drive
                </span>
              </div>
            </div>

            <button
              onClick={handleDemoBypass}
              disabled={loading}
              className="w-full font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              style={{ 
                backgroundColor: "transparent",
                color: "#6366f1",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                height: "46px",
                borderRadius: "12px",
                fontSize: "13px",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "#38bdf8" }} />
              Bypass for Demo Mode
            </button>

            {/* Site Details Grid */}
            <div 
              className="mt-10 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
              style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
            >
              <div className="flex flex-col items-center text-center p-2 rounded-xl">
                <Cpu className="h-5.5 w-5.5 mb-2" style={{ color: "#6366f1" }} />
                <span className="block text-xs font-extrabold uppercase tracking-wide mb-1" style={{ color: "#e2e8f0", fontSize: "11px" }}>AI Inference</span>
                <span className="block text-[10.5px] leading-normal" style={{ color: "#94a3b8" }}>Describe in English; Gemini builds your database.</span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl">
                <Database className="h-5.5 w-5.5 mb-2" style={{ color: "#0ea5e9" }} />
                <span className="block text-xs font-extrabold uppercase tracking-wide mb-1" style={{ color: "#e2e8f0", fontSize: "11px" }}>ML-Ready Data</span>
                <span className="block text-[10.5px] leading-normal" style={{ color: "#94a3b8" }}>Correlated columns with realistic distributions.</span>
              </div>

              <div className="flex flex-col items-center text-center p-2 rounded-xl">
                <Shield className="h-5.5 w-5.5 mb-2" style={{ color: "#10b981" }} />
                <span className="block text-xs font-extrabold uppercase tracking-wide mb-1" style={{ color: "#e2e8f0", fontSize: "11px" }}>Developer APIs</span>
                <span className="block text-[10.5px] leading-normal" style={{ color: "#94a3b8" }}>Export 1M rows or integrate via REST endpoints.</span>
              </div>
            </div>

            <p 
              className="text-center text-[10px] mt-8 leading-relaxed font-medium"
              style={{ color: "#475569", fontFamily: "'Inter', sans-serif" }}
            >
              © 2026 Synthetic Data Studio. All rights reserved.
            </p>
          </div>
        </section>

      </div>

      {/* Simulated Google Sign-In Chooser Modal */}
      {showGoogleModal && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 custom-google-fade-in"
          style={{ backgroundColor: "rgba(3, 7, 18, 0.85)", backdropFilter: "blur(6px)" }}
        >
          <div 
            className="w-full relative shadow-2xl overflow-hidden custom-google-scale-up"
            style={{ 
              maxWidth: "420px", 
              backgroundColor: "#ffffff", 
              borderRadius: "16px",
              padding: "36px",
              color: "#1f2937",
              fontFamily: "Roboto, 'Segoe UI', Arial, sans-serif"
            }}
          >
            {/* Real-looking Google Auth Loader bar */}
            {googleLoggingIn && (
              <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-blue-100">
                <div className="h-full bg-blue-600 animate-pulse w-1/2 rounded" style={{ animationDuration: '1s', animationIterationCount: 'infinite' }} />
              </div>
            )}

            {/* Google Logo / Brand Header */}
            <div className="text-center mb-6">
              <svg className="h-8 w-8 mx-auto mb-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">Sign in with Google</h2>
              <p className="text-sm text-gray-500 mt-1">to continue to <span className="font-semibold text-gray-700">Synthetic Data Studio</span></p>
            </div>

            {googleLoggingIn ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Authorizing secure login...</p>
              </div>
            ) : !showCustomGoogleEmail ? (
              <div className="space-y-3">
                {/* Simulated Google Accounts */}
                <button
                  type="button"
                  onClick={() => triggerGoogleLoginWithEmail("karan.kumar@gmail.com")}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      K
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Karan Kumar</div>
                      <div className="text-xs text-gray-500">karan.kumar@gmail.com</div>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">Signed out</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerGoogleLoginWithEmail("karan@syntheticstudio.ai")}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      S
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Karan Kumar</div>
                      <div className="text-xs text-gray-500">karan@syntheticstudio.ai</div>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">Signed out</span>
                </button>

                {/* Custom Email option */}
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleEmail(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm text-gray-600 font-semibold">Use another account</span>
                </button>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (googleEmailInput.trim()) {
                    triggerGoogleLoginWithEmail(googleEmailInput.trim());
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email or phone</label>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="Enter your Google email"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleEmail(false)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Back to accounts
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGoogleModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Terms Notice */}
            <div className="mt-8 text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-4 font-normal">
              To continue, Google will share your name, email address, language preference, and profile picture with Synthetic Data Studio.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
