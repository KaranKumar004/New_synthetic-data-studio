"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  Sparkles, FileText, ChevronRight, ChevronLeft, Plus, Trash2, 
  HelpCircle, Settings2, CheckCircle2, Download, Bookmark, 
  Database, Info, AlertCircle, RefreshCw as SpinIcon, Compass, Brain, MessageCircle,
  Stethoscope, Wheat, Landmark, GraduationCap, Scale, Users, ShoppingCart,
  Factory, Truck, FlaskConical, Globe, Building2, Cpu, Leaf, BarChart3
} from "lucide-react";
import RelationshipDesigner from "./RelationshipDesigner";

interface GenerationWizardProps {
  setCurrentTab: (tab: string) => void;
  selectedTemplateSchema: any;
  setSelectedTemplateSchema: (schema: any) => void;
  loadedPrompt?: string | null;
  setLoadedPrompt?: (prompt: string | null) => void;
  user?: any;
}

const SUPPORTED_TYPES = [
  "Name", "First Name", "Last Name", "Age", "Gender", "Email", "Phone Number", 
  "Address", "City", "State", "Country", "Postal Code", "Date", "Datetime", 
  "Currency", "Product Name", "Company Name", "Employee ID", "Customer ID", 
  "UUID", "Boolean", "Integer", "Float", "Categories", "Custom Text"
];

export default function GenerationWizard({ 
  setCurrentTab, 
  selectedTemplateSchema,
  setSelectedTemplateSchema,
  loadedPrompt,
  setLoadedPrompt,
  user
}: GenerationWizardProps) {
  // Visual designer state
  const [showVisualDesigner, setShowVisualDesigner] = useState(false);

  // Bias control states
  const [applyDemographicBias, setApplyDemographicBias] = useState(false);
  const [genderBiasRatio, setGenderBiasRatio] = useState(50); // female %
  const [ageBiasRange, setAgeBiasRange] = useState("adults"); // young, adults, seniors

  // Domain/field selector state (step 0)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // AI Special modes
  const [aiModeType, setAiModeType] = useState<"standard" | "training" | "conversation">("standard");
  const [trainingTaskType, setTrainingTaskType] = useState("Instruction Tuning");
  const [trainingDomain, setTrainingDomain] = useState("Healthcare");
  const [convIndustry, setConvIndustry] = useState("Healthcare");
  const [convLength, setConvLength] = useState(6);
  const [convTone, setConvTone] = useState("Professional");
  const [convLanguage, setConvLanguage] = useState("English");
  // Wizard Steps (0 = Domain Picker, 1 = Mode Select, 2 = Schema, 3 = Quality, 4 = Output)
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  // Domain definitions
  const DOMAINS = [
    { id: "Healthcare",   label: "Medical / Healthcare",    icon: Stethoscope,  color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    prompt: "I need patient records for a hospital management system with patient_id, name, age, gender, blood_type, diagnosis, doctor_name, admission_date, discharge_date, and treatment_cost." },
    { id: "Agriculture",  label: "Agriculture / Farming",   icon: Wheat,        color: "text-lime-400",    bg: "bg-lime-500/10",    border: "border-lime-500/30",    prompt: "I need farm records for an agricultural analytics platform with farmer_id, name, crop_type, farm_area_acres, region, soil_type, rainfall_mm, yield_tonnes, harvest_date, and revenue." },
    { id: "Finance",      label: "Finance / Banking",       icon: Landmark,     color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", prompt: "I need financial transaction records with account_id, owner_name, account_type, balance, transaction_type, amount, transaction_date, currency, and status." },
    { id: "Education",    label: "Education / Academia",    icon: GraduationCap,color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",    prompt: "I need student records for an education management system with student_id, name, age, gender, course, university, enrollment_year, gpa, attendance_pct, and graduation_status." },
    { id: "Legal",        label: "Legal / Law",             icon: Scale,        color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",  prompt: "I need legal case records with case_id, plaintiff_name, defendant_name, case_type, judge_name, filing_date, hearing_date, status, and verdict." },
    { id: "HR",           label: "HR / Human Resources",   icon: Users,        color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30", prompt: "I need employee records for an HR management system with employee_id, first_name, last_name, email, department, designation, joining_date, salary, performance_score, and is_active." },
    { id: "Retail",       label: "Retail / E-Commerce",    icon: ShoppingCart, color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30", prompt: "I need customer and order records for an e-commerce platform with customer_id, name, email, city, product_name, category, purchase_date, quantity, amount, and order_status." },
    { id: "Manufacturing",label: "Manufacturing / Industry",icon: Factory,      color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/30",  prompt: "I need production records for a manufacturing plant with product_id, product_name, batch_number, production_date, quantity_produced, defect_count, line_id, operator_name, and quality_score." },
    { id: "Logistics",    label: "Logistics / Supply Chain",icon: Truck,        color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",   prompt: "I need shipment records for a logistics company with shipment_id, sender_name, receiver_name, origin_city, destination_city, dispatch_date, delivery_date, weight_kg, carrier, and delivery_status." },
    { id: "Research",     label: "Science / Research",      icon: FlaskConical, color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/30",   prompt: "I need research experiment records with experiment_id, researcher_name, project_title, start_date, end_date, sample_size, control_group, treatment_group, outcome_metric, and p_value." },
    { id: "Government",   label: "Government / Public",     icon: Building2,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",   prompt: "I need citizen service records for a government portal with citizen_id, name, age, gender, state, service_type, application_date, status, officer_name, and resolution_date." },
    { id: "Technology",   label: "Technology / IT",         icon: Cpu,          color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30", prompt: "I need IT asset and incident records for a tech company with asset_id, asset_type, assigned_to, purchase_date, warranty_expiry, incident_id, issue_type, priority, raised_date, and resolution_time_hours." },
    { id: "Environment",  label: "Environment / Climate",   icon: Leaf,         color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30",  prompt: "I need environmental monitoring records with station_id, location, date, temperature_celsius, humidity_pct, co2_ppm, pm25_level, rainfall_mm, wind_speed_kmh, and air_quality_index." },
    { id: "Marketing",   label: "Marketing / Analytics",   icon: BarChart3,    color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/30",   prompt: "I need marketing campaign records with campaign_id, campaign_name, channel, target_audience, start_date, end_date, budget, impressions, clicks, conversions, and roi_pct." },
    { id: "Custom",      label: "Other / Custom Domain",   icon: Globe,        color: "text-primary",     bg: "bg-primary/10",     border: "border-primary/30",    prompt: "" },
  ];

  // Step 2: Schema Builder state
  const [datasetName, setDatasetName] = useState("My Synthetic Dataset");
  const [tables, setTables] = useState<any[]>([
    {
      name: "customers",
      rows: 100,
      columns: [
        { name: "id", type: "UUID", null_pct: 0, config: {} },
        { name: "name", type: "Name", null_pct: 0, config: {} },
        { name: "email", type: "Email", null_pct: 0, config: {} },
        { name: "age", type: "Age", null_pct: 0, config: { min: 18, max: 70 } }
      ]
    }
  ]);

  // AI input state
  const [aiPrompt, setAiPrompt] = useState(
    "I need 1,000 customer records for an Indian e-commerce company with customer_id, name, age, gender, city, state, email, phone number, annual_income, purchase_count, and customer_segment."
  );
  const [aiLoading, setAiLoading] = useState(false);

  // Step 3: Global config state
  const [locale, setLocale] = useState("en_US");
  const [noiseLevel, setNoiseLevel] = useState("perfect"); // perfect, realistic, noisy
  const [globalNullPct, setGlobalNullPct] = useState(0);
  const [exportFormat, setExportFormat] = useState("CSV");

  // Step 4: Output state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedResult, setGeneratedResult] = useState<any>(null); // holds { dataset, preview }
  const [activePreviewTable, setActivePreviewTable] = useState("");
  const [saveTplName, setSaveTplName] = useState("");
  const [saveTplIndustry, setSaveTplIndustry] = useState("Retail");
  const [saveTplSaved, setSaveTplSaved] = useState(false);
  const [error, setError] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (selectedTemplateSchema) {
      if (selectedTemplateSchema.tables) {
        setTables(selectedTemplateSchema.tables);
        if (selectedTemplateSchema.name) setDatasetName(selectedTemplateSchema.name);
        if (selectedTemplateSchema.locale) setLocale(selectedTemplateSchema.locale);
      }
      setMode("manual");
      setStep(2);
      // Clean after load
      setSelectedTemplateSchema(null);
    }
  }, [selectedTemplateSchema]);

  useEffect(() => {
    if (loadedPrompt) {
      setAiPrompt(loadedPrompt);
      setMode("ai");
      setStep(2);
      if (setLoadedPrompt) setLoadedPrompt(null);
    }
  }, [loadedPrompt]);

  const handleInferSchema = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError("");
    try {
      const data = await api.inferSchema(aiPrompt);
      if (data.tables) {
        setTables(data.tables);
        if (data.name) setDatasetName(data.name);
        if (data.locale) setLocale(data.locale);
        // Move to next step (Schema builder review)
        setStep(2);
      } else {
        throw new Error("Invalid schema structure returned from AI.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze prompt with Gemini API.");
    } finally {
      setAiLoading(false);
    }
  };

  // Add/Remove Tables
  const addTable = () => {
    const name = `table_${tables.length + 1}`;
    setTables([...tables, {
      name,
      rows: 100,
      columns: [
        { name: "id", type: "UUID", null_pct: 0, config: {} }
      ]
    }]);
  };

  const removeTable = (index: number) => {
    if (tables.length === 1) return;
    setTables(tables.filter((_, i) => i !== index));
  };

  const updateTableRows = (index: number, rows: number) => {
    const updated = [...tables];
    updated[index].rows = rows;
    setTables(updated);
  };

  const updateTableName = (index: number, name: string) => {
    const updated = [...tables];
    updated[index].name = name.toLowerCase().replace(/\s+/g, "_");
    setTables(updated);
  };

  // Add/Remove Columns
  const addColumn = (tableIndex: number) => {
    const updated = [...tables];
    updated[tableIndex].columns.push({
      name: `column_${updated[tableIndex].columns.length + 1}`,
      type: "Name",
      null_pct: 0,
      config: {}
    });
    setTables(updated);
  };

  const removeColumn = (tableIndex: number, colIndex: number) => {
    const updated = [...tables];
    updated[tableIndex].columns = updated[tableIndex].columns.filter((_: any, i: number) => i !== colIndex);
    setTables(updated);
  };

  const updateColumn = (tableIndex: number, colIndex: number, field: string, value: any) => {
    const updated = [...tables];
    updated[tableIndex].columns[colIndex][field] = value;
    setTables(updated);
  };

  const updateColumnConfig = (tableIndex: number, colIndex: number, configKey: string, value: any) => {
    const updated = [...tables];
    const col = updated[tableIndex].columns[colIndex];
    col.config = { ...col.config, [configKey]: value };
    setTables(updated);
  };

  const getForeignKeyOptions = (currentTableIndex: number) => {
    const options: string[] = [];
    tables.forEach((table, tIdx) => {
      if (tIdx === currentTableIndex) return; // avoid self-joins
      table.columns.forEach((col: any) => {
        options.push(`${table.name}.${col.name}`);
      });
    });
    return options;
  };

    // Run Generation
  const handleGenerate = async () => {
    // Sum total rows
    const totalRows = tables.reduce((acc, t) => acc + t.rows, 0);

    // Paywall check for Free users trying to generate more than 5,000 rows
    if (user?.plan === "free" && totalRows > 5000) {
      setShowPaywall(true);
      return;
    }

    setStep(4);
    setGenerating(true);
    setProgress(15);
    setError("");
    setGeneratedResult(null);
    setSaveTplSaved(false);

    const payload = {
      name: datasetName,
      rows: totalRows,
      locale,
      tables,
      noise_level: noiseLevel,
      global_null_pct: globalNullPct,
      export_format: exportFormat
    };

    // Simulate progress trigger
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 400);

    try {
      let result;
      if (mode === "ai" && aiModeType === "training") {
        result = await api.generateAiTrainingData(trainingTaskType, trainingDomain, totalRows || 15);
      } else if (mode === "ai" && aiModeType === "conversation") {
        result = await api.generateConversations(convIndustry, convLength, convTone, convLanguage);
      } else {
        // Standard dataset generation
        // If Demographic bias is turned on, adjust column category weights for age/gender dynamically
        const processedPayload = { ...payload };
        if (applyDemographicBias) {
          processedPayload.tables = payload.tables.map((tbl) => ({
            ...tbl,
            columns: tbl.columns.map((col: any) => {
              if (col.type === "Gender") {
                return {
                  ...col,
                  config: {
                    ...col.config,
                    categories: ["Female", "Male"],
                    weights: [genderBiasRatio / 100, (100 - genderBiasRatio) / 100]
                  }
                };
              }
              if (col.type === "Age") {
                let min = 18, max = 70;
                if (ageBiasRange === "young") { min = 18; max = 30; }
                else if (ageBiasRange === "seniors") { min = 60; max = 85; }
                return {
                  ...col,
                  config: { ...col.config, min, max }
                };
              }
              return col;
            })
          }));
        }
        result = await api.generateDataset(processedPayload);
      }
      
      setProgress(100);
      clearInterval(timer);
      setGeneratedResult(result);
      if (result.preview) {
        if (Array.isArray(result.preview)) {
          setActivePreviewTable("__flat_list__");
        } else {
          setActivePreviewTable(Object.keys(result.preview)[0] || "");
        }
      }
    } catch (err: any) {
      clearInterval(timer);
      setError(err.message || "Synthetic generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedResult?.dataset) return;
    const { id, name, file_format } = generatedResult.dataset;
    try {
      const url = await api.downloadDatasetUrl(id);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${name.replace(/\s+/g, "_")}.${file_format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to download: " + err.message);
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTplName.trim()) return;
    try {
      const payload = {
        name: saveTplName,
        industry: saveTplIndustry,
        schema_definition: {
          name: datasetName,
          locale,
          tables
        }
      };
      await api.saveTemplate(payload);
      setSaveTplSaved(true);
      setSaveTplName("");
    } catch (err: any) {
      alert("Failed to save template: " + err.message);
    }
  };

  const stepsList = [
    { num: 0, label: "Choose Domain" },
    { num: 1, label: "Mode Select" },
    { num: 2, label: "Define Schema" },
    { num: 3, label: "Quality Config" },
    { num: 4, label: "Output & Preview" }
  ];

  const handleDomainSelect = (domain: typeof DOMAINS[number]) => {
    setSelectedDomain(domain.id);
    // Sync the domain into training & conversation mode selectors
    setTrainingDomain(domain.id === "Custom" ? "Healthcare" : domain.id);
    setConvIndustry(domain.id === "Custom" ? "Healthcare" : domain.id);
    // Pre-fill AI prompt if a domain-specific template exists
    if (domain.prompt) {
      setAiPrompt(domain.prompt);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-6 pb-20 md:pb-8">
      {/* Step Indicator Header */}
      <div className="glass-panel border border-card-border p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <h1 className="text-xl sm:text-2xl font-black text-foreground">Dataset Wizard</h1>
        
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 md:pb-0">
          {stepsList.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2 shrink-0">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                step === s.num
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/15"
                  : step > s.num
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : "bg-muted-bg text-muted border-border"
              }`}>
                {step > s.num ? "✓" : idx + 1}
              </div>
              <span className={`text-xs font-bold ${step === s.num ? "text-foreground" : "text-muted"}`}>
                {s.label}
              </span>
              {idx < stepsList.length - 1 && <div className="h-0.5 w-4 bg-border hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      {error && step !== 4 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 0: DOMAIN SELECTOR */}
      {step === 0 && (
        <div className="space-y-6 py-4 animate-fade-in-up">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-2">
              <Database className="h-3.5 w-3.5" />
              Step 1 of 5
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Choose Your Data Domain</h2>
            <p className="text-muted text-sm font-semibold">
              Select the industry or field for your synthetic dataset. This helps pre-configure the schema, AI prompts, and domain-specific data types.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain)}
                  className={`group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 text-center cursor-pointer hover:scale-[1.03] ${
                    isSelected
                      ? `${domain.bg} ${domain.border} shadow-lg`
                      : "glass-panel border-card-border hover:border-border"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className={`h-4 w-4 ${domain.color}`} />
                    </div>
                  )}
                  <div className={`p-2.5 rounded-xl transition-all ${
                    isSelected ? domain.bg : "bg-muted-bg group-hover:bg-muted-bg/80"
                  }`}>
                    <Icon className={`h-6 w-6 transition-all ${
                      isSelected ? domain.color : "text-muted group-hover:" + domain.color
                    }`} />
                  </div>
                  <span className={`text-[11px] font-black leading-tight ${
                    isSelected ? domain.color : "text-muted"
                  }`}>
                    {domain.label}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDomain && (
            <div className="max-w-6xl mx-auto">
              <div className="glass-panel border border-card-border rounded-xl p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground mb-0.5">
                    Selected: {DOMAINS.find(d => d.id === selectedDomain)?.label}
                  </p>
                  <p className="text-[11px] text-muted font-medium leading-relaxed line-clamp-2">
                    {DOMAINS.find(d => d.id === selectedDomain)?.prompt || "You can describe your own custom dataset in the next step."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-2">
            {!selectedDomain && (
              <button
                onClick={() => { setSelectedDomain("Custom"); setStep(1); }}
                className="px-5 py-2.5 bg-card hover:bg-muted-bg border border-border text-muted font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Skip — I'll configure manually
              </button>
            )}
            {selectedDomain && (
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-md shadow-primary/15 hover:shadow-primary/25 cursor-pointer text-sm"
              >
                Continue to Mode Selection
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: MODE SELECTION */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto py-8">
          {/* AI Mode Card */}
          <div 
            onClick={() => { setMode("ai"); setAiModeType("standard"); }}
            className={`glass-panel border-2 p-6 rounded-2xl cursor-pointer text-center space-y-4 hover:scale-[1.01] transition-all flex flex-col items-center ${
              mode === "ai" && aiModeType === "standard" ? "border-primary shadow-lg shadow-primary/5" : "border-card-border"
            }`}
          >
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Sparkles className="h-8 w-8 animate-pulse-subtle" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground">AI Prompt Generator</h3>
            <p className="text-muted text-[11px] leading-relaxed max-w-sm font-semibold">
              Describe what kind of database you need in plain English, and our AI will automatically draft the schema tables, columns, constraints, and relationships.
            </p>
            <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-md ${
              mode === "ai" && aiModeType === "standard" ? "bg-primary/20 text-primary" : "bg-muted-bg text-muted"
            }`}>
              Recommended
            </span>
          </div>

          {/* Manual Mode Card */}
          <div 
            onClick={() => { setMode("manual"); setAiModeType("standard"); }}
            className={`glass-panel border-2 p-6 rounded-2xl cursor-pointer text-center space-y-4 hover:scale-[1.01] transition-all flex flex-col items-center ${
              mode === "manual" ? "border-primary shadow-lg shadow-primary/5" : "border-card-border"
            }`}
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground">Manual Dataset Builder</h3>
            <p className="text-muted text-[11px] leading-relaxed max-w-sm font-semibold">
              Define your database columns from scratch. Select data types, configure null rates, specify integer distributions, and link foreign keys manually.
            </p>
            <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-md ${
              mode === "manual" ? "bg-indigo-500/20 text-indigo-500" : "bg-muted-bg text-muted"
            }`}>
              Full Customization
            </span>
          </div>

          {/* AI Training Data Synthesizer Card */}
          <div 
            onClick={() => { setMode("ai"); setAiModeType("training"); }}
            className={`glass-panel border-2 p-6 rounded-2xl cursor-pointer text-center space-y-4 hover:scale-[1.01] transition-all flex flex-col items-center ${
              mode === "ai" && aiModeType === "training" ? "border-primary shadow-lg shadow-primary/5" : "border-card-border"
            }`}
          >
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Brain className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground">AI Training Synthesizer</h3>
            <p className="text-muted text-[11px] leading-relaxed max-w-sm font-semibold">
              Generate formatted datasets for training LLMs (Instruction Fine-Tuning, QA datasets, Classification records, or custom RAG document contexts).
            </p>
            <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-md ${
              mode === "ai" && aiModeType === "training" ? "bg-amber-500/20 text-amber-500" : "bg-muted-bg text-muted"
            }`}>
              AI / LLM Fine-Tuning
            </span>
          </div>

          {/* Synthetic Conversation Generator Card */}
          <div 
            onClick={() => { setMode("ai"); setAiModeType("conversation"); }}
            className={`glass-panel border-2 p-6 rounded-2xl cursor-pointer text-center space-y-4 hover:scale-[1.01] transition-all flex flex-col items-center ${
              mode === "ai" && aiModeType === "conversation" ? "border-primary shadow-lg shadow-primary/5" : "border-card-border"
            }`}
          >
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-foreground">Conversation Dialogue Logs</h3>
            <p className="text-muted text-[11px] leading-relaxed max-w-sm font-semibold">
              Generate realistic multi-turn chat dialogues between characters (e.g. Doctor-Patient visits, support tickets) formatted in JSONL logs.
            </p>
            <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest rounded-md ${
              mode === "ai" && aiModeType === "conversation" ? "bg-purple-500/20 text-purple-500" : "bg-muted-bg text-muted"
            }`}>
              Dialogues / JSONL Logs
            </span>
          </div>

          <div className="md:col-span-2 flex justify-between items-center pt-6">
            <button
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Change Domain
            </button>
            {selectedDomain && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Domain:</span>
                <span className="text-[10px] font-bold text-foreground">{DOMAINS.find(d => d.id === selectedDomain)?.label}</span>
              </div>
            )}
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-md shadow-primary/15 hover:shadow-primary/25 cursor-pointer text-sm"
            >
              Continue to Design
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SCHEMA BUILDER OR AI INPUT */}
      {step === 2 && (
        <div className="space-y-6">
          {/* AI Standard input segment */}
          {mode === "ai" && aiModeType === "standard" && tables.length === 1 && tables[0].columns.length === 4 && (
            <div className="glass-panel border border-card-border p-6 rounded-2xl max-w-3xl mx-auto space-y-6 animate-fade-in-up">
              <div className="flex gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 h-fit">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Describe your dataset requirements</h3>
                  <p className="text-muted text-xs font-semibold mt-0.5">
                    Our AI models will extract schema schemas and relations instantly.
                  </p>
                </div>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="I need 1,000 customer records for an Indian e-commerce company..."
                rows={4}
                className="w-full p-4 bg-muted-bg border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/25 outline-hidden text-sm leading-relaxed"
                required
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setMode("manual")}
                  className="px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Skip to Manual Build
                </button>
                <button
                  onClick={handleInferSchema}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer"
                >
                  {aiLoading ? <SpinIcon className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? "AI Inferring..." : "Infer Schema with AI"}
                </button>
              </div>
            </div>
          )}

          {/* AI Training Synthesizer parameters form */}
          {mode === "ai" && aiModeType === "training" && (
            <div className="glass-panel border border-card-border p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto space-y-6 animate-fade-in-up">
              <div className="flex gap-3 border-b border-border pb-4">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Training Data Synthesizer</h3>
                  <p className="text-muted text-xs font-semibold mt-0.5">
                    Generate mock records formatted for Instruction tuning, Classification, or RAG contexts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Task Format</label>
                  <select
                    value={trainingTaskType}
                    onChange={(e) => setTrainingTaskType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  >
                    <option>Instruction Tuning</option>
                    <option>Question Answering</option>
                    <option>RAG Datasets</option>
                    <option>Classification Datasets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Knowledge Domain</label>
                  <select
                    value={trainingDomain}
                    onChange={(e) => setTrainingDomain(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  >
                    <option>Healthcare</option>
                    <option>Legal</option>
                    <option>Finance</option>
                    <option>Retail</option>
                    <option>Education</option>
                    <option>Logistics</option>
                    <option>Customer Support</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Record Count</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={tables[0]?.rows || 10}
                    onChange={(e) => updateTableRows(0, parseInt(e.target.value) || 10)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  />
                  <span className="text-[10px] text-muted font-medium mt-1 block">
                    Synthesizing high-quality training pairs takes approximately 10-30s. Cap is 100 rows.
                  </span>
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-4 select-none">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Select Mode
                </button>
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer"
                >
                  <Brain className="h-4 w-4" />
                  Synthesize Training Data
                </button>
              </div>
            </div>
          )}

          {/* AI Dialogue Logs parameters form */}
          {mode === "ai" && aiModeType === "conversation" && (
            <div className="glass-panel border border-card-border p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto space-y-6 animate-fade-in-up">
              <div className="flex gap-3 border-b border-border pb-4">
                <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl shrink-0">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Dialogue Logs Generator</h3>
                  <p className="text-muted text-xs font-semibold mt-0.5">
                    Generate multi-turn conversation logs formatted in JSONL text.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Industry Setup</label>
                  <select
                    value={convIndustry}
                    onChange={(e) => setConvIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  >
                    <option>Healthcare</option>
                    <option>Sales</option>
                    <option>Teacher-Student</option>
                    <option>Customer Support</option>
                    <option>Bank Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Tone Mood</label>
                  <select
                    value={convTone}
                    onChange={(e) => setConvTone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  >
                    <option>Professional</option>
                    <option>Empathetic</option>
                    <option>Direct</option>
                    <option>Angry</option>
                    <option>Friendly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Turn Length (Chat exchanges)</label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={convLength}
                    onChange={(e) => setConvLength(parseInt(e.target.value) || 6)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">Dialogue Language</label>
                  <select
                    value={convLanguage}
                    onChange={(e) => setConvLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted-bg border border-border rounded-xl text-xs font-bold"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-4 select-none">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Select Mode
                </button>
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Generate Conversation
                </button>
              </div>
            </div>
          )}

          {/* Core manual schema layout tables list */}
          {(mode === "manual" || (mode === "ai" && aiModeType === "standard" && (tables.length > 1 || tables[0].columns.length > 4))) && (
            <div className="space-y-6">
              {showVisualDesigner ? (
                <RelationshipDesigner 
                  tables={tables} 
                  setTables={setTables} 
                  onBack={() => setShowVisualDesigner(false)} 
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md">
                      <span className="text-[9px] uppercase font-black tracking-widest text-muted block mb-1">
                        Dataset Name
                      </span>
                      <input
                        type="text"
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-foreground font-extrabold focus:border-primary outline-hidden text-lg transition-all"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowVisualDesigner(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl cursor-pointer"
                      >
                        <Compass className="h-4 w-4 text-primary" />
                        Visual Schema Mapper
                      </button>
                      <button
                        type="button"
                        onClick={addTable}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl cursor-pointer"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        Add Table
                      </button>
                    </div>
                  </div>

              <div className="space-y-8">
                {tables.map((table, tIdx) => (
                  <div key={tIdx} className="glass-panel border border-card-border rounded-2xl overflow-hidden p-6 space-y-4 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                      {/* Table metadata controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted block">Table Name</label>
                          <input
                            type="text"
                            value={table.name}
                            onChange={(e) => updateTableName(tIdx, e.target.value)}
                            className="bg-muted-bg border border-border rounded-lg px-2.5 py-1 text-sm font-black focus:border-primary outline-hidden text-foreground w-44"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-muted block">Mock Rows count</label>
                          <input
                            type="number"
                            value={table.rows}
                            onChange={(e) => updateTableRows(tIdx, parseInt(e.target.value) || 10)}
                            min={1}
                            max={100000}
                            className="bg-muted-bg border border-border rounded-lg px-2.5 py-1 text-sm font-bold focus:border-primary outline-hidden text-foreground w-24"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeTable(tIdx)}
                        disabled={tables.length === 1}
                        className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 border border-red-500/10 hover:border-red-500/20 rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        Delete Table
                      </button>
                    </div>

                    {/* Columns grid */}
                    <div className="space-y-3">
                      <div className="hidden md:grid grid-cols-12 gap-3 text-[10px] uppercase font-black tracking-wider text-muted px-2">
                        <div className="col-span-3">Column Name</div>
                        <div className="col-span-3">Data Type</div>
                        <div className="col-span-2">Null Ratio %</div>
                        <div className="col-span-3">Configuration / Rules</div>
                        <div className="col-span-1 text-right">Delete</div>
                      </div>

                      <div className="space-y-3">
                        {table.columns.map((col: any, cIdx: number) => {
                          const fkOptions = getForeignKeyOptions(tIdx);
                          return (
                            <div key={cIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-muted-bg/30 border border-border/50 p-3.5 rounded-xl hover:border-border transition-all">
                              {/* Col name */}
                              <div className="col-span-3">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => updateColumn(tIdx, cIdx, "name", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                  placeholder="e.g. email"
                                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold focus:border-primary outline-hidden"
                                />
                              </div>

                              {/* Data type select */}
                              <div className="col-span-3">
                                <select
                                  value={col.type}
                                  onChange={(e) => updateColumn(tIdx, cIdx, "type", e.target.value)}
                                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-hidden cursor-pointer"
                                >
                                  {SUPPORTED_TYPES.map((t) => (
                                    <option key={t}>{t}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Null Slider */}
                              <div className="col-span-2 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="90"
                                  value={col.null_pct}
                                  onChange={(e) => updateColumn(tIdx, cIdx, "null_pct", parseFloat(e.target.value))}
                                  className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-xs font-bold text-muted shrink-0 w-6">
                                  {col.null_pct}%
                                </span>
                              </div>

                              {/* Type Config Details */}
                              <div className="col-span-3 text-xs space-y-2">
                                {/* Relationships Foreign Key Configuration */}
                                {fkOptions.length > 0 && (
                                  <div>
                                    <select
                                      value={col.config?.foreign_key || ""}
                                      onChange={(e) => updateColumnConfig(tIdx, cIdx, "foreign_key", e.target.value || undefined)}
                                      className="w-full bg-card border border-border rounded-lg px-2 py-1 text-[11px] outline-hidden cursor-pointer"
                                    >
                                      <option value="">No Relation (Independent)</option>
                                      {fkOptions.map((opt) => (
                                        <option key={opt} value={opt}>Link: {opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Age Config */}
                                {col.type === "Age" && (
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      placeholder="Min"
                                      value={col.config?.min || ""}
                                      onChange={(e) => updateColumnConfig(tIdx, cIdx, "min", parseInt(e.target.value) || 18)}
                                      className="w-full bg-card border border-border rounded-lg px-1.5 py-0.5 text-[11px]"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={col.config?.max || ""}
                                      onChange={(e) => updateColumnConfig(tIdx, cIdx, "max", parseInt(e.target.value) || 80)}
                                      className="w-full bg-card border border-border rounded-lg px-1.5 py-0.5 text-[11px]"
                                    />
                                  </div>
                                )}

                                {/* ID prefix */}
                                {(col.type === "Employee ID" || col.type === "Customer ID") && (
                                  <input
                                    type="text"
                                    placeholder="ID Prefix (e.g. EMP-)"
                                    value={col.config?.prefix || ""}
                                    onChange={(e) => updateColumnConfig(tIdx, cIdx, "prefix", e.target.value)}
                                    className="w-full bg-card border border-border rounded-lg px-2 py-1 text-[11px]"
                                  />
                                )}

                                {/* Categories Input */}
                                {col.type === "Categories" && (
                                  <input
                                    type="text"
                                    placeholder="Comma-separated options"
                                    value={col.config?.categories?.join(", ") || ""}
                                    onChange={(e) => updateColumnConfig(tIdx, cIdx, "categories", e.target.value.split(",").map(s => s.trim()))}
                                    className="w-full bg-card border border-border rounded-lg px-2 py-1 text-[11px]"
                                  />
                                )}

                                {/* Currency Config */}
                                {col.type === "Currency" && (
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      placeholder="Min"
                                      value={col.config?.min || ""}
                                      onChange={(e) => updateColumnConfig(tIdx, cIdx, "min", parseFloat(e.target.value))}
                                      className="w-full bg-card border border-border rounded-lg px-1.5 py-0.5 text-[11px]"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={col.config?.max || ""}
                                      onChange={(e) => updateColumnConfig(tIdx, cIdx, "max", parseFloat(e.target.value))}
                                      className="w-full bg-card border border-border rounded-lg px-1.5 py-0.5 text-[11px]"
                                    />
                                  </div>
                                )}

                                {/* Default info tag if no configs needed */}
                                {!["Age", "Employee ID", "Customer ID", "Categories", "Currency"].includes(col.type) && (
                                  <span className="text-[10px] text-muted italic font-medium">Auto-generated by Faker API</span>
                                )}
                              </div>

                              {/* Delete column */}
                              <div className="col-span-1 text-right">
                                <button
                                  onClick={() => removeColumn(tIdx, cIdx)}
                                  disabled={table.columns.length === 1}
                                  className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer border border-border hover:border-red-500/20 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => addColumn(tIdx)}
                        className="w-full py-2.5 border border-dashed border-border hover:border-primary/50 text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer mt-3 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Field
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

              {/* Step Navigation buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-border select-none">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Select Mode
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer"
                >
                  Configure Output
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: QUALITY CONFIGS & TARGET EXPORT FORMAT */}
      {step === 3 && (
        <div className="glass-panel border border-card-border p-6 sm:p-8 rounded-2xl max-w-3xl mx-auto space-y-6 animate-fade-in-up">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted" />
            Generation Specifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
            {/* Locale mapping (en_IN vs en_US) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Regional Locale
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl focus:border-primary outline-hidden text-sm font-bold cursor-pointer"
              >
                <option value="en_US">United States (en_US)</option>
                <option value="en_IN">India (en_IN)</option>
                <option value="en_GB">Great Britain (en_GB)</option>
                <option value="de_DE">Germany (de_DE)</option>
                <option value="fr_FR">France (fr_FR)</option>
                <option value="es_ES">Spain (es_ES)</option>
                <option value="ja_JP">Japan (ja_JP)</option>
              </select>
              <span className="text-[10px] text-muted font-medium mt-1.5 block leading-relaxed">
                Applies regional contexts (e.g. Indian names like Rajesh Kumar or Indian States like Maharashtra if en_IN is active).
              </span>
            </div>

            {/* Quality distributions */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Data Quality Level
              </label>
              <select
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(e.target.value)}
                className="w-full px-4 py-3 bg-muted-bg border border-border rounded-xl focus:border-primary outline-hidden text-sm font-bold cursor-pointer"
              >
                <option value="perfect">Perfect Datasets (No constraints/Clean fields)</option>
                <option value="realistic">Realistic Datasets (Allows slight variations/2% dups)</option>
                <option value="noisy">Noisy Datasets (Random case errors, typos, 8% dups)</option>
              </select>
              <span className="text-[10px] text-muted font-medium mt-1.5 block leading-relaxed">
                Defines validation filters. Perfect contains zero blanks. Noisy mimics messy input databases.
              </span>
            </div>

            {/* Global Null Ratio Slider */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Global Null Ratio
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={globalNullPct}
                  onChange={(e) => setGlobalNullPct(parseInt(e.target.value))}
                  className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm font-black text-foreground shrink-0 w-10">
                  {globalNullPct}%
                </span>
              </div>
              <span className="text-[10px] text-muted font-medium mt-1.5 block leading-relaxed">
                Replaces generated fields globally with NULL, simulating sparse datasets.
              </span>
            </div>

            {/* Export Format Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Export Format
              </label>
              <div className="flex gap-2">
                {["CSV", "XLSX", "JSON", "SQL", "PARQUET"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    type="button"
                    className={`flex-1 py-3 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                      exportFormat === fmt
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/15"
                        : "bg-muted-bg text-muted border-border hover:bg-muted-bg/80"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Demographic Bias Controls */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-foreground">Demographic Fairness & Bias Controls</h3>
                <p className="text-muted text-[10px] font-semibold">Introduce controlled class imbalance or target age distributions.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={applyDemographicBias} 
                  onChange={(e) => setApplyDemographicBias(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {applyDemographicBias && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted-bg/30 border border-border/50 rounded-xl animate-fade-in-up">
                {/* Gender Bias Ratio */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted">Gender Split: {genderBiasRatio}% Female / {100 - genderBiasRatio}% Male</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted">Male</span>
                    <input 
                      type="range"
                      min="10"
                      max="90"
                      value={genderBiasRatio}
                      onChange={(e) => setGenderBiasRatio(parseInt(e.target.value))}
                      className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-[10px] font-bold text-muted">Female</span>
                  </div>
                </div>

                {/* Age Profile Bias */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted">Age Demographic Cap</label>
                  <select
                    value={ageBiasRange}
                    onChange={(e) => setAgeBiasRange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-semibold outline-hidden cursor-pointer"
                  >
                    <option value="young">Young Adults (18-30 years)</option>
                    <option value="adults">Core Workforce (18-70 years)</option>
                    <option value="seniors">Retired Seniors (60-85 years)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Steps buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-border select-none">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 px-4 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Edit Schema
            </button>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/15 hover:shadow-emerald-500/25 cursor-pointer text-sm"
            >
              <Database className="h-4 w-4" />
              Generate Dataset
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: OUTPUT PREVIEW & DOWNLOAD & SAVE TEMPLATE */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Loading status card */}
          {generating && (
            <div className="glass-panel border border-card-border p-8 rounded-2xl max-w-md mx-auto text-center space-y-6">
              <div className="relative h-20 w-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <Database className="h-8 w-8 text-primary animate-pulse-subtle" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Generating Dataset...</h3>
                <p className="text-muted text-xs mt-1 font-semibold leading-relaxed">
                  Compiling schemas, validating foreign keys, injecting formats and locales.
                </p>
              </div>
              <div className="h-2.5 w-full bg-muted-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-black text-muted tracking-wide">{progress}% Complete</span>
            </div>
          )}

          {/* Success Result Container */}
          {generatedResult && (
            <div className="space-y-6">
              <div className="glass-panel border border-card-border p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                    <CheckCircle2 className="h-8 w-8 animate-pulse-subtle" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-foreground">Generation Complete!</h3>
                    <p className="text-muted text-xs mt-0.5 font-semibold">
                      Successfully generated <span className="text-foreground font-bold">{generatedResult.dataset?.row_count.toLocaleString()} rows</span> in <span className="text-primary font-bold uppercase">{generatedResult.dataset?.file_format}</span> format.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 cursor-pointer w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </button>
              </div>

              {/* Dynamic Preview table */}
              {generatedResult.preview && (
                <div className="glass-panel border border-card-border rounded-2xl overflow-hidden p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Database className="h-5 w-5 text-muted" />
                      Dataset Preview
                    </h2>
                    
                    {/* Table Select Tabs if relational schema generates multiple tables */}
                    {Object.keys(generatedResult.preview).length > 1 && (
                      <div className="flex gap-2 p-1 bg-muted-bg rounded-xl text-xs font-bold self-start">
                        {Object.keys(generatedResult.preview).map((tName) => (
                          <button
                            key={tName}
                            onClick={() => setActivePreviewTable(tName)}
                            className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                              activePreviewTable === tName ? "bg-card text-foreground" : "text-muted hover:text-foreground"
                            }`}
                          >
                            {tName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table Element */}
                  {activePreviewTable && activePreviewTable !== "__flat_list__" && generatedResult.preview[activePreviewTable] && (
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border bg-muted-bg/30 text-xs text-muted font-black uppercase tracking-wider">
                            {Object.keys(generatedResult.preview[activePreviewTable][0] || {}).map((colName) => (
                              <th key={colName} className="p-3 font-bold">{colName}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs font-semibold">
                          {generatedResult.preview[activePreviewTable].map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted-bg/10">
                              {Object.values(row).map((val: any, valIdx: number) => (
                                <td key={valIdx} className="p-3 text-foreground font-semibold max-w-[200px] truncate">
                                  {val === null ? (
                                    <span className="text-muted/40 italic font-medium">NULL</span>
                                  ) : typeof val === "boolean" ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                      val ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                    }`}>
                                      {val ? "TRUE" : "FALSE"}
                                    </span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Flat List Element (Conversations / AI Training Data) */}
                  {activePreviewTable === "__flat_list__" && Array.isArray(generatedResult.preview) && (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {mode === "ai" && aiModeType === "conversation" ? (
                        <div className="space-y-3 p-4 bg-muted-bg/15 border border-border rounded-xl">
                          {generatedResult.preview.map((msg: any, idx: number) => {
                            const isEven = idx % 2 === 0;
                            return (
                              <div key={idx} className={`flex flex-col ${isEven ? "items-start" : "items-end"}`}>
                                <span className="text-[9px] text-muted font-black uppercase mb-1">{msg.sender}</span>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold max-w-[80%] leading-relaxed ${
                                  isEven ? "bg-primary/10 border border-primary/20 text-foreground rounded-tl-none" : "bg-primary text-white rounded-tr-none"
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {generatedResult.preview.map((item: any, idx: number) => (
                            <div key={idx} className="p-4 bg-muted-bg/30 border border-border rounded-xl space-y-2.5 font-semibold text-xs text-foreground">
                              <span className="text-[9px] uppercase font-black tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                                Record #{idx + 1}
                              </span>
                              {Object.entries(item).map(([k, v]: any) => (
                                <div key={k} className="space-y-1">
                                  <span className="text-[9px] uppercase font-black text-muted block capitalize">{k}</span>
                                  <div className="p-2.5 bg-card border border-border rounded-lg leading-relaxed whitespace-pre-line text-xs">
                                    {String(v)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="text-[10px] text-muted italic font-medium block">
                    Showing a sample preview of the first 15 records. Download file to view full batch data.
                  </span>
                </div>
              )}

              {/* Save Template & Redirect navigation options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Save Custom preset card */}
                <div className="glass-panel border border-card-border p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4 text-primary" />
                    Save Configuration as Custom Template
                  </h3>

                  {saveTplSaved ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold leading-relaxed text-center">
                      Template saved successfully! You can load this preset from the Gallery in the future.
                    </div>
                  ) : (
                    <form onSubmit={handleSaveAsTemplate} className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={saveTplName}
                          onChange={(e) => setSaveTplName(e.target.value)}
                          placeholder="e.g. My Indian Store Customers"
                          className="flex-1 px-3 py-2 bg-muted-bg border border-border rounded-xl focus:border-primary outline-hidden text-xs transition-all"
                          required
                        />
                        <select
                          value={saveTplIndustry}
                          onChange={(e) => setSaveTplIndustry(e.target.value)}
                          className="bg-muted-bg border border-border rounded-xl px-2.5 py-2 text-xs font-bold outline-hidden cursor-pointer"
                        >
                          <option>Retail</option>
                          <option>Healthcare</option>
                          <option>Banking</option>
                          <option>HR</option>
                          <option>Logistics</option>
                          <option>Education</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Save Preset Template
                      </button>
                    </form>
                  )}
                </div>

                {/* Back / Done Navigation Card */}
                <div className="glass-panel border border-card-border p-6 rounded-2xl flex flex-col justify-between items-start gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-secondary" />
                      Actions Finished
                    </h3>
                    <p className="text-xs text-muted leading-relaxed font-semibold mt-2">
                      Ready to start a different batch, or review generated datasets? Go back to the dashboard to monitor limits.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full select-none">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-2.5 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Modify Parameters
                    </button>
                    <button
                      onClick={() => setCurrentTab("dashboard")}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 hover:shadow-primary/20 text-center cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="glass-panel border border-card-border p-6 sm:p-8 rounded-3xl max-w-lg w-full space-y-6 relative shadow-2xl bg-background/95">
            {/* Close button */}
            <button 
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground text-sm font-bold bg-muted-bg/50 hover:bg-muted-bg p-2 rounded-full transition-all"
            >
              ✕
            </button>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 mb-2 border border-amber-500/25">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-foreground">Free Plan Limit Exceeded</h2>
              <p className="text-muted text-xs font-semibold leading-relaxed">
                You are trying to generate <span className="text-foreground font-black">{tables.reduce((acc, t) => acc + t.rows, 0).toLocaleString()} rows</span>. 
                Our free tier has a cap of <span className="text-primary font-black">5,000 rows</span> per generation.
              </p>
            </div>

            {/* Quick plan comparison cards */}
            <div className="grid grid-cols-2 gap-3 select-none">
              <div className="p-4 rounded-2xl bg-muted-bg/30 border border-border flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[9px] uppercase font-black text-muted tracking-wider block">Current Plan</span>
                  <h4 className="text-sm font-extrabold text-foreground">Free Tier</h4>
                </div>
                <p className="text-[10px] text-muted font-medium">5,000 rows/mo maximum. Limited features.</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">
                  Popular
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider block">Upgrade Plan</span>
                  <h4 className="text-sm font-extrabold text-foreground">Starter (₹499)</h4>
                </div>
                <p className="text-[10px] text-muted font-medium">1,00,000 rows/mo. All formats. AI generators.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 select-none">
              <button
                onClick={() => setShowPaywall(false)}
                className="flex-1 py-3 bg-card hover:bg-muted-bg border border-border text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Adjust Row Count
              </button>
              <button
                onClick={() => {
                  setShowPaywall(false);
                  setCurrentTab("pricing");
                }}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 text-center cursor-pointer"
              >
                View Pricing & Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
