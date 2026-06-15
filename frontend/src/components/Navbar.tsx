"use client";

import { useState, useEffect } from "react";
import { Sparkles, BarChart2, FilePlus, Bookmark, History, Key, Users, Shield, LogOut, Sun, Moon, Menu, X, ShoppingBag, FileText, CreditCard, Zap, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Navbar({ currentTab, setCurrentTab, user, onLogout }: NavbarProps) {
  const [theme, setTheme] = useState("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Load initial theme from classList or localStorage
    const isDark = document.documentElement.classList.contains("dark") || 
                   (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  const handleLogout = () => {
    api.logout();
    onLogout();
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "wizard", label: "Generate Data", icon: FilePlus },
    { id: "image-studio", label: "Image Studio", icon: ImageIcon },
    { id: "templates", label: "Templates", icon: Bookmark },
    { id: "prompts", label: "Prompt Library", icon: FileText },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "history", label: "History", icon: History },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "workspaces", label: "Workspaces", icon: Users },
    { id: "pricing", label: "Pricing", icon: CreditCard },
  ];

  // Include admin tab if logged in as admin or demo
  const isAdmin = user && (
    user.email === "demo@syntheticstudio.ai" ||
    user.email?.includes("admin") ||
    user.email === "karankumarsk14@gmail.com" ||
    user.email === "karan.kumar@gmail.com"
  );
  if (isAdmin) {
    navItems.push({ id: "admin", label: "Admin Panel", icon: Shield });
  }

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-card-border">
      <div className="max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabClick("dashboard")}>
            <div className="p-2 rounded-xl bg-linear-to-tr from-primary to-secondary text-white">
              <Sparkles className="h-5 w-5 animate-pulse-subtle" />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">
              Synthetic <span className="gradient-text font-black">Data Studio</span>
            </span>
            <span className="font-extrabold text-xl tracking-tight sm:hidden gradient-text font-black">
              SDS
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/15"
                      : "text-muted hover:text-foreground hover:bg-muted-bg"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Theme & User Profile Actions */}
          <div className="flex items-center gap-2">
            {/* Upgrade badge for free users */}
            {user?.plan === "free" && (
              <button
                onClick={() => handleTabClick("pricing")}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all cursor-pointer animate-pulse-subtle"
              >
                <Zap className="h-3.5 w-3.5" />
                Upgrade
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border hover:bg-muted-bg text-foreground cursor-pointer transition-all"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-red-500/10 hover:bg-red-500/10 text-red-500 cursor-pointer transition-all flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl border border-border hover:bg-muted-bg md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-card-border absolute top-16 left-0 w-full animate-fade-in-up">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted hover:text-foreground hover:bg-muted-bg"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (Capacitor style, active only on extra small mobile screens) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-card-border grid grid-cols-5 md:hidden z-30 shadow-lg px-2 py-1 select-none">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold rounded-lg cursor-pointer ${
                isActive ? "text-primary animate-pulse-subtle" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
