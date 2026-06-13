// API Client for Synthetic Data Studio

const DEFAULT_BACKEND_URL = "http://localhost:8000";

// Dynamically resolve the backend URL
export function getBackendUrl(): string {
  // If we are running in a browser environment and there's a configure variable, use it.
  // Otherwise, fallback to localhost:8000.
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("sds_backend_url");
    if (customUrl) return customUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL;
}

export function setBackendUrl(url: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("sds_backend_url", url);
  }
}

// Token Storage helpers
export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sds_auth_token");
  }
  return null;
}

export function setStoredToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("sds_auth_token", token);
    } else {
      localStorage.removeItem("sds_auth_token");
    }
  }
}

// Make authenticated fetch requests
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const baseUrl = getBackendUrl();
  const token = getStoredToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = "API Request failed";
    try {
      const errorData = await response.json();
      errMsg = errorData.detail || errorData.message || errMsg;
    } catch {
      errMsg = response.statusText || errMsg;
    }
    throw new Error(errMsg);
  }

  // Handle file download response
  if (response.headers.get("Content-Disposition") || endpoint.includes("/download")) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<any> {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async register(email: string, password: string): Promise<any> {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    return data;
  },

  logout() {
    setStoredToken(null);
  },

  // User & Usage
  async getProfile(): Promise<any> {
    return apiFetch("/api/user/profile");
  },

  async getUsage(): Promise<any> {
    return apiFetch("/api/user/usage");
  },

  // AI Prompt
  async inferSchema(prompt: string): Promise<any> {
    return apiFetch("/api/ai/schema", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  },

  // Dataset Generation
  async generateDataset(payload: any): Promise<any> {
    return apiFetch("/api/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Dataset History
  async getDatasets(): Promise<any[]> {
    return apiFetch("/api/datasets");
  },

  async getDataset(id: string): Promise<any> {
    return apiFetch(`/api/datasets/${id}`);
  },

  async deleteDataset(id: string): Promise<any> {
    return apiFetch(`/api/datasets/${id}`, {
      method: "DELETE",
    });
  },

  async downloadDatasetUrl(id: string): Promise<string> {
    const baseUrl = getBackendUrl();
    const token = getStoredToken();
    // Return direct download url that has the token embedded as a query param or build blob
    // For browser downloads, fetch as a blob and trigger a trigger link is highly reliable!
    const blob = await apiFetch(`/api/datasets/${id}/download`);
    return URL.createObjectURL(blob);
  },

  // Templates
  async getTemplates(): Promise<any[]> {
    return apiFetch("/api/templates");
  },

  async saveTemplate(payload: { name: string; description?: string; industry: string; schema_definition: any }): Promise<any> {
    return apiFetch("/api/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // API Keys
  async getApiKeys(): Promise<any[]> {
    return apiFetch("/api/api-keys");
  },

  async createApiKey(name: string): Promise<any> {
    return apiFetch("/api/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async revokeApiKey(id: string): Promise<any> {
    return apiFetch(`/api/api-keys/${id}`, {
      method: "DELETE",
    });
  },

  // Admin stats
  async getAdminStats(): Promise<any> {
    return apiFetch("/api/admin/stats");
  },

  // AI Assistant
  async queryAssistant(datasetId: string, message: string): Promise<any> {
    return apiFetch(`/api/datasets/${datasetId}/assistant`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  // Drift Simulator
  async simulateDrift(datasetId: string, months: number): Promise<any> {
    return apiFetch("/api/datasets/simulate-drift", {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId, months }),
    });
  },

  // Marketplace
  async getMarketplace(): Promise<any[]> {
    return apiFetch("/api/marketplace");
  },

  async publishMarketplace(datasetId: string, price: number, description?: string): Promise<any> {
    return apiFetch("/api/marketplace/publish", {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId, price, description }),
    });
  },

  async purchaseMarketplace(datasetId: string): Promise<any> {
    return apiFetch("/api/marketplace/purchase", {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId }),
    });
  },

  // Prompt Library
  async getSavedPrompts(): Promise<any[]> {
    return apiFetch("/api/prompts");
  },

  async savePrompt(title: string, promptText: string): Promise<any> {
    return apiFetch("/api/prompts", {
      method: "POST",
      body: JSON.stringify({ title, prompt_text: promptText }),
    });
  },

  async deletePrompt(id: string): Promise<any> {
    return apiFetch(`/api/prompts/${id}`, {
      method: "DELETE",
    });
  },

  async toggleFavoritePrompt(id: string): Promise<any> {
    return apiFetch(`/api/prompts/${id}/favorite`, {
      method: "POST",
    });
  },

  async duplicatePrompt(id: string): Promise<any> {
    return apiFetch(`/api/prompts/${id}/duplicate`, {
      method: "POST",
    });
  },

  async generateAiTrainingData(taskType: string, domain: string, rows: number): Promise<any> {
    return apiFetch(`/api/ai/training-data?task_type=${encodeURIComponent(taskType)}&domain=${encodeURIComponent(domain)}&rows=${rows}`, {
      method: "POST"
    });
  },

  async generateConversations(industry: string, length: number, tone: string, language: string): Promise<any> {
    return apiFetch(`/api/ai/conversation?industry=${encodeURIComponent(industry)}&length=${length}&tone=${encodeURIComponent(tone)}&language=${encodeURIComponent(language)}`, {
      method: "POST"
    });
  },

  // ── Billing / Razorpay ──────────────────────────────────────────
  async getBillingPlans(): Promise<any> {
    return apiFetch("/api/billing/plans");
  },

  async createOrder(planId: string): Promise<any> {
    return apiFetch(`/api/billing/create-order?plan_id=${encodeURIComponent(planId)}`, {
      method: "POST",
    });
  },

  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<any> {
    return apiFetch("/api/billing/verify-payment", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPaymentHistory(): Promise<any[]> {
    return apiFetch("/api/billing/history");
  },

  async generateImageDataset(
    datasetType: string,
    numImagesPerClass: number,
    imageSize: number,
    noiseLevel: string,
    splitRatio: number
  ): Promise<Blob> {
    return apiFetch(
      `/api/generate-image-dataset?dataset_type=${encodeURIComponent(
        datasetType
      )}&num_images_per_class=${numImagesPerClass}&image_size=${imageSize}&noise_level=${noiseLevel}&split_ratio=${splitRatio}`,
      {
        method: "POST",
      }
    );
  },
};

