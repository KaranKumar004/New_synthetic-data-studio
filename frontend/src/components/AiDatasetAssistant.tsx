"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User, CornerDownLeft, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface AiDatasetAssistantProps {
  datasetId: string;
  datasetName: string;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export default function AiDatasetAssistant({ datasetId, datasetName, onClose }: AiDatasetAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hello! I am your AI Dataset Assistant. I have analyzed the schema and metadata of "${datasetName}". You can ask me queries like:\n- "What is the average age of customers?"\n- "Give me a summary of tables and row counts."\n- "Are there any data formatting anomalies?"`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", text: userText, timestamp: new Date() }]);
    setLoading(true);

    try {
      const response = await api.queryAssistant(datasetId, userText);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: response.response, timestamp: new Date() }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Error contacting assistant: ${err.message || "Is the server offline?"}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-card-border shadow-2xl flex flex-col z-50 animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-card-border flex items-center justify-between bg-muted-bg/30">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-foreground">AI Dataset Assistant</h3>
            <span className="text-[10px] text-muted font-semibold truncate block max-w-[180px]">
              Analyzing: {datasetName}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted-bg text-muted hover:text-foreground transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-secondary text-white"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-semibold ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-muted-bg border border-border/80 text-foreground rounded-tl-none whitespace-pre-line"
              }`}
            >
              {msg.text}
              <span
                className={`text-[8px] font-bold block mt-1.5 text-right ${
                  msg.role === "user" ? "text-white/60" : "text-muted"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3.5 items-start">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted-bg border border-border/80 text-foreground rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-card-border bg-muted-bg/10">
        <div className="relative flex items-center bg-card border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 rounded-xl transition-all p-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask questions about statistics..."
            className="flex-1 px-3 py-2.5 text-xs bg-transparent border-0 outline-hidden focus:ring-0 text-foreground placeholder:text-muted/70 font-semibold"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[9px] text-muted font-bold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary animate-pulse-subtle" /> Powered by Gemini LLM
          </span>
          <span className="text-[9px] text-muted/70 font-bold hidden sm:inline-flex items-center gap-0.5">
            Press Enter <CornerDownLeft className="h-2 w-2" />
          </span>
        </div>
      </form>
    </div>
  );
}
