"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Check, Sparkles, Zap, Crown, Building2, ArrowRight,
  CreditCard, Shield, RefreshCw, ChevronDown, ChevronUp,
  Receipt, Clock, CheckCircle2, XCircle
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingPageProps {
  user: any;
  onPlanUpgrade: (newPlan: string) => void;
}

const PLAN_ICONS: Record<string, any> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  enterprise: Building2,
};

const PLAN_GRADIENTS: Record<string, string> = {
  free:       "from-slate-500/20 to-slate-600/10 border-slate-500/30",
  starter:    "from-indigo-500/20 to-indigo-600/10 border-indigo-500/40",
  pro:        "from-violet-500/20 to-violet-600/10 border-violet-500/40",
  enterprise: "from-amber-500/20 to-amber-600/10 border-amber-500/40",
};

const PLAN_ICON_COLORS: Record<string, string> = {
  free:       "text-slate-400 bg-slate-500/15",
  starter:    "text-indigo-400 bg-indigo-500/15",
  pro:        "text-violet-400 bg-violet-500/15",
  enterprise: "text-amber-400 bg-amber-500/15",
};

const BADGE_COLORS: Record<string, string> = {
  "Most Popular": "bg-indigo-500 text-white",
  "Best Value":   "bg-violet-500 text-white",
  "Enterprise":   "bg-amber-500 text-black",
};

export default function PricingPage({ user, onPlanUpgrade }: PricingPageProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadRazorpayScript();
    fetchData();
  }, []);

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansData, historyData] = await Promise.all([
        api.getBillingPlans().catch(() => ({ plans: [] })),
        api.getPaymentHistory().catch(() => []),
      ]);
      setPlans(plansData.plans || []);
      setHistory(historyData || []);
    } catch {
      // Use fallback plans if backend is offline
      setPlans(FALLBACK_PLANS);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: any) => {
    if (plan.id === "free" || plan.id === user?.plan) return;
    setPaying(plan.id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const order = await api.createOrder(plan.id);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Synthetic Data Studio",
        description: `${plan.name} Plan — Monthly Subscription`,
        order_id: order.order_id,
        prefill: {
          email: user?.email || order.user_email,
        },
        theme: { color: "#6366f1" },
        modal: { backdropclose: false },
        handler: async (response: any) => {
          try {
            const result = await api.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setSuccessMsg(result.message || `Upgraded to ${plan.name} plan!`);
            onPlanUpgrade(result.plan);
            fetchData();
          } catch (err: any) {
            setErrorMsg("Payment verification failed. Please contact support.");
          }
        },
        "modal.ondismiss": () => setPaying(null),
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setErrorMsg(`Payment failed: ${resp.error.description}`);
        setPaying(null);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate payment.");
      setPaying(null);
    }
  };

  const currentPlan = user?.plan || "free";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-10 pb-20 md:pb-8">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
          <CreditCard className="h-3.5 w-3.5" />
          Subscription Plans
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Choose the right plan for{" "}
          <span className="gradient-text">your data needs</span>
        </h1>
        <p className="text-muted text-base font-semibold max-w-2xl mx-auto">
          Start free. Upgrade when you need more rows, formats, or API access.
          Payments secured by Razorpay — India's #1 payment gateway.
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          {[
            { icon: Shield, text: "Secure Razorpay Checkout" },
            { icon: RefreshCw, text: "Cancel Anytime" },
            { icon: CheckCircle2, text: "Instant Plan Activation" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-muted text-xs font-bold">
              <Icon className="h-3.5 w-3.5 text-emerald-500" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-sm animate-fade-in-up">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-bold text-sm animate-fade-in-up">
          <XCircle className="h-5 w-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {(plans.length > 0 ? plans : FALLBACK_PLANS).map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Sparkles;
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = !isCurrent && plan.id !== "free";
          const isPaying  = paying === plan.id;
          const gradient  = PLAN_GRADIENTS[plan.id];
          const iconStyle = PLAN_ICON_COLORS[plan.id];

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border-2 bg-gradient-to-br p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${gradient} ${
                isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${BADGE_COLORS[plan.badge] || "bg-primary text-white"}`}>
                  {plan.badge}
                </div>
              )}

              {/* Current plan tag */}
              {isCurrent && (
                <div className="absolute top-4 right-4 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">
                  Current
                </div>
              )}

              {/* Plan icon & name */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconStyle}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-1">{plan.name}</h3>

              {/* Pricing */}
              <div className="mb-5 mt-2">
                {plan.price_inr === 0 ? (
                  <div className="text-4xl font-black text-foreground">Free</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-lg font-bold text-muted">₹</span>
                    <span className="text-4xl font-black text-foreground">{plan.price_inr.toLocaleString("en-IN")}</span>
                    <span className="text-sm text-muted font-semibold mb-1">/mo</span>
                  </div>
                )}
                <p className="text-xs text-muted font-semibold mt-1">
                  {plan.rows_per_month >= 99_999_999
                    ? "Unlimited rows"
                    : `${plan.rows_per_month.toLocaleString("en-IN")} rows / month`}
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feat: string) => (
                  <li key={feat} className="flex items-start gap-2 text-xs font-semibold text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {plan.id === "free" ? (
                <div className="w-full py-3 rounded-xl bg-muted-bg text-muted text-xs font-black text-center border border-border">
                  {isCurrent ? "✓ Current Plan" : "Always Free"}
                </div>
              ) : isCurrent ? (
                <div className="w-full py-3 rounded-xl bg-primary/10 text-primary text-xs font-black text-center border border-primary/20">
                  ✓ Active Plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isPaying}
                  className={`w-full py-3 rounded-xl text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.id === "starter" ? "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20" :
                    plan.id === "pro"     ? "bg-violet-500 hover:bg-violet-600 shadow-lg shadow-violet-500/20" :
                                           "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 text-black"
                  }`}
                >
                  {isPaying ? (
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                  ) : (
                    <><ArrowRight className="h-3.5 w-3.5" /> Upgrade to {plan.name}</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="glass-panel border border-card-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-black text-foreground">Full Feature Comparison</h2>
          <p className="text-muted text-xs font-semibold mt-1">See exactly what's included in each plan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted-bg/30">
                <th className="text-left p-4 text-xs font-black uppercase text-muted tracking-wider w-1/3">Feature</th>
                {["Free", "Starter", "Pro", "Enterprise"].map((p) => (
                  <th key={p} className={`text-center p-4 text-xs font-black uppercase tracking-wider ${
                    p.toLowerCase() === currentPlan ? "text-primary" : "text-muted"
                  }`}>
                    {p}
                    {p.toLowerCase() === currentPlan && <span className="ml-1 text-[8px] text-primary">●</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-muted-bg/20 transition-colors">
                  <td className="p-4 text-xs font-semibold text-foreground">{row.feature}</td>
                  {[row.free, row.starter, row.pro, row.enterprise].map((val, i) => (
                    <td key={i} className="p-4 text-center">
                      {val === true  ? <Check    className="h-4 w-4 text-emerald-400 mx-auto" /> :
                       val === false ? <span className="text-muted text-lg font-bold">–</span> :
                       <span className="text-xs font-bold text-foreground">{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="glass-panel border border-card-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-muted-bg/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-black text-foreground">Payment History</h2>
              <p className="text-muted text-xs font-semibold">{history.length} transaction{history.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </button>

        {showHistory && (
          <div className="border-t border-border">
            {history.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm font-semibold">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No payment history yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <span className="text-xs font-black uppercase text-foreground">{item.plan} Plan</span>
                      <p className="text-[10px] text-muted font-semibold mt-0.5">
                        {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-foreground">
                        ₹{item.amount_inr.toLocaleString("en-IN")}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                        item.status === "paid"    ? "bg-emerald-500/15 text-emerald-400" :
                        item.status === "created" ? "bg-amber-500/15 text-amber-400" :
                        "bg-red-500/15 text-red-400"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Razorpay trust footer */}
      <div className="text-center space-y-2">
        <p className="text-muted text-xs font-semibold">
          Payments processed securely by{" "}
          <span className="text-foreground font-black">Razorpay</span>. 
          Your card details are never stored on our servers.
        </p>
        <p className="text-muted text-[11px] font-medium">
          All prices are in Indian Rupees (INR) and are billed monthly.
        </p>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────

const FALLBACK_PLANS = [
  {
    id: "free", name: "Free", price_inr: 0, price_paise: 0,
    rows_per_month: 5000, api_calls: 100, badge: "",
    features: ["5,000 rows / month", "CSV export only", "AI schema inference", "Basic templates", "Community support"],
  },
  {
    id: "starter", name: "Starter", price_inr: 499, price_paise: 49900,
    rows_per_month: 100000, api_calls: 1000, badge: "Most Popular",
    features: ["1,00,000 rows / month", "All export formats", "AI Prompt Generator", "Training data synthesizer", "Email support"],
  },
  {
    id: "pro", name: "Pro", price_inr: 1499, price_paise: 149900,
    rows_per_month: 1000000, api_calls: 10000, badge: "Best Value",
    features: ["10,00,000 rows / month", "All Starter features", "Data drift simulator", "Marketplace publish", "Priority support"],
  },
  {
    id: "enterprise", name: "Enterprise", price_inr: 4999, price_paise: 499900,
    rows_per_month: 99999999, api_calls: 999999, badge: "Enterprise",
    features: ["Unlimited rows", "All Pro features", "Team workspaces", "Custom data types", "Dedicated account manager"],
  },
];

const COMPARISON_ROWS = [
  { feature: "Rows / Month",         free: "5,000",       starter: "1,00,000",   pro: "10,00,000",  enterprise: "Unlimited" },
  { feature: "API Calls / Month",    free: "100",          starter: "1,000",       pro: "10,000",      enterprise: "Unlimited" },
  { feature: "CSV Export",           free: true,           starter: true,          pro: true,          enterprise: true        },
  { feature: "XLSX / JSON / SQL",    free: false,          starter: true,          pro: true,          enterprise: true        },
  { feature: "Parquet Export",       free: false,          starter: true,          pro: true,          enterprise: true        },
  { feature: "AI Schema Inference",  free: true,           starter: true,          pro: true,          enterprise: true        },
  { feature: "AI Training Datasets", free: false,          starter: true,          pro: true,          enterprise: true        },
  { feature: "Conversation Logs",    free: false,          starter: true,          pro: true,          enterprise: true        },
  { feature: "Data Drift Simulator", free: false,          starter: false,         pro: true,          enterprise: true        },
  { feature: "Marketplace Publish",  free: false,          starter: false,         pro: true,          enterprise: true        },
  { feature: "Relationship Designer",free: false,          starter: true,          pro: true,          enterprise: true        },
  { feature: "Team Workspaces",      free: false,          starter: false,         pro: false,         enterprise: true        },
  { feature: "Custom Data Types",    free: false,          starter: false,         pro: false,         enterprise: true        },
  { feature: "Support Level",        free: "Community",    starter: "Email",       pro: "Priority",    enterprise: "Dedicated" },
];
