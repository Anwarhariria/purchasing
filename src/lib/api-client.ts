import type {
  RequestItem,
  UserAccount,
  NotificationItem,
  StudyProgramData,
  IngredientForecastItem,
} from "@/types/procurement";

const API_BASE_URL = "http://127.0.0.1:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem("spake_token");
  } catch {
    return null;
  }
}

function setToken(token: string) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("spake_token", token);
  } catch {}
}

function removeToken() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem("spake_token");
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const SpakeApi = {
  // Auth
  async login(email: string, pass: string) {
    const res = await request<{ status: string; token: string; user: UserAccount }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  async quickLogin(roleOrEmail: { role?: string; email?: string }) {
    const res = await request<{ status: string; token: string; user: UserAccount }>("/auth/quick-login", {
      method: "POST",
      body: JSON.stringify(roleOrEmail),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  async me() {
    return request<{ status: string; user: UserAccount }>("/auth/me");
  },

  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      removeToken();
    }
  },

  async getUsers() {
    return request<{ status: string; data: UserAccount[] }>("/users");
  },

  // Requests
  async getRequests(params?: { status?: string; prodi?: string }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "Semua Status") query.append("status", params.status);
    if (params?.prodi) query.append("prodi", params.prodi);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<{ status: string; data: RequestItem[] }>(`/requests${qs}`);
  },

  async getRequest(id: string) {
    return request<{ status: string; data: RequestItem }>(`/requests/${id}`);
  },

  async createRequest(data: Partial<RequestItem>) {
    return request<{ status: string; message: string; data: RequestItem }>("/requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRequest(id: string, data: Partial<RequestItem>) {
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: string, status: string, note?: string) {
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
  },

  async disburseFunds(id: string, amount: number, note?: string) {
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}/disburse`, {
      method: "POST",
      body: JSON.stringify({ amount, note }),
    });
  },

  async submitSpj(id: string, actualSpent: number, receiptImages: string[] = [], note?: string) {
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}/spj`, {
      method: "POST",
      body: JSON.stringify({ actualSpent, receiptImages, note }),
    });
  },

  async reimburseDeficit(id: string, note?: string) {
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}/reimburse`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async deleteRequest(id: string) {
    return request<{ status: string; message: string }>(`/requests/${id}`, {
      method: "DELETE",
    });
  },

  async getKpis() {
    return request<{ status: string; data: any }>("/requests/kpis");
  },

  async getSawRanking() {
    return request<{ status: string; data: any[] }>("/requests/saw-ranking");
  },

  // Stocks
  async getStocks() {
    return request<{ status: string; data: any[] }>("/stocks");
  },

  async getStockMap() {
    return request<{ status: string; data: Record<string, { stock: number; unit: string }> }>("/stocks/map");
  },

  // Notifications
  async getNotifications(role?: string) {
    const qs = role ? `?role=${encodeURIComponent(role)}` : "";
    return request<{ status: string; data: NotificationItem[] }>(`/notifications${qs}`);
  },

  async markNotificationRead(id: string) {
    return request<{ status: string; data: NotificationItem }>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  async markAllNotificationsRead(role?: string) {
    return request<{ status: string; message: string }>("/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  // Forecasting
  async getForecastingIngredients() {
    return request<{ status: string; data: IngredientForecastItem[] }>("/forecasting/ingredients");
  },

  async calculateForecast(ingredientId: string, alpha = 0.3, beta = 0.2, horizon = 1) {
    return request<{ status: string; data: any }>("/forecasting/calculate", {
      method: "POST",
      body: JSON.stringify({
        ingredient_id: ingredientId,
        alpha,
        beta,
        horizon,
      }),
    });
  },
};
