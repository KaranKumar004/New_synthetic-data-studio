"use client";

import { useState, useEffect } from "react";
import Auth from "@/components/Auth";
import Navbar from "@/components/Navbar";
import Dashboard from "@/components/Dashboard";
import GenerationWizard from "@/components/GenerationWizard";
import TemplatesGallery from "@/components/TemplatesGallery";
import DatasetHistory from "@/components/DatasetHistory";
import ApiKeysManager from "@/components/ApiKeysManager";
import TeamWorkspaces from "@/components/TeamWorkspaces";
import AdminPanel from "@/components/AdminPanel";
import SavedPrompts from "@/components/SavedPrompts";
import DatasetMarketplace from "@/components/DatasetMarketplace";
import PricingPage from "@/components/PricingPage";
import ImageDatasetGenerator from "@/components/ImageDatasetGenerator";
import { api, getStoredToken, setStoredToken } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Schema state to pass from template gallery / history cloning to wizard
  const [selectedTemplateSchema, setSelectedTemplateSchema] = useState<any>(null);
  const [loadedPrompt, setLoadedPrompt] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setStoredToken(session.access_token);
        await checkAuthStatus();
      } else if (event === "SIGNED_OUT") {
        setStoredToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    const token = getStoredToken();
    if (token) {
      try {
        const profile = await api.getProfile();
        setUser({
          email: profile.email,
          plan: profile.plan,
          maxRowsLimit: profile.max_rows_limit,
        });
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Session expired or backend offline", err);
        api.logout();
      }
    }
    setLoading(false);
  };

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Failed to sign out of Supabase", e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setCurrentTab("dashboard");
  };

  /** Called by PricingPage after successful Razorpay payment to update local user state */
  const handlePlanUpgrade = (newPlan: string) => {
    setUser((prev: any) => ({ ...prev, plan: newPlan }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted text-sm font-semibold">Initializing Synthetic Data Studio...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col relative pb-16 md:pb-0">
      {/* Background radial overlays */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[90px] pointer-events-none z-0" />

      {/* Shared Header Navigation */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Shared Content Dashboard viewport */}
      <main className="flex-1 flex flex-col z-10 w-full relative">
        {currentTab === "dashboard" && (
          <Dashboard setCurrentTab={setCurrentTab} user={user} />
        )}
        
        {currentTab === "wizard" && (
          <GenerationWizard 
            setCurrentTab={setCurrentTab}
            selectedTemplateSchema={selectedTemplateSchema}
            setSelectedTemplateSchema={setSelectedTemplateSchema}
            loadedPrompt={loadedPrompt}
            setLoadedPrompt={setLoadedPrompt}
            user={user}
          />
        )}
        
        {currentTab === "prompts" && (
          <SavedPrompts 
            setCurrentTab={setCurrentTab} 
            setAiPrompt={setLoadedPrompt} 
            setMode={() => {}} 
          />
        )}

        {currentTab === "marketplace" && (
          <DatasetMarketplace />
        )}

        {currentTab === "templates" && (
          <TemplatesGallery 
            setCurrentTab={setCurrentTab} 
            setSelectedTemplateSchema={setSelectedTemplateSchema} 
          />
        )}

        {currentTab === "image-studio" && (
          <ImageDatasetGenerator user={user} />
        )}

        {currentTab === "history" && (
          <DatasetHistory 
            setCurrentTab={setCurrentTab} 
            setSelectedTemplateSchema={setSelectedTemplateSchema} 
          />
        )}

        {currentTab === "api-keys" && (
          <ApiKeysManager />
        )}

        {currentTab === "workspaces" && (
          <TeamWorkspaces />
        )}

        {currentTab === "pricing" && (
          <PricingPage user={user} onPlanUpgrade={handlePlanUpgrade} />
        )}

        {currentTab === "admin" && (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}
