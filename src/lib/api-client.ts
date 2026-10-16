import type {
  RequestItem,
  UserAccount,
  NotificationItem,
  StudyProgramData,
  IngredientForecastItem,
  ProcurementActivityLog,
  ForecastModelInfo,
  AlurBPredictionResponse,
} from "@/types/procurement";

const API_BASE_URL = (import.meta.env["VITE_API_URL"] as string) || "http://localhost:8000/api";

export function getToken(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem("spake_token");
  } catch {
    return null;
  }
}

export function hasAuthToken(): boolean {
  return !!getToken();
}

function setToken(token: string) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("spake_token", token);
  } catch {
    // intentional ignore storage write error
  }
}

function removeToken() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem("spake_token");
  } catch {
    // intentional ignore storage write error
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (_err: unknown) {
    throw new Error("Tidak dapat terhubung ke server. Pastikan backend aktif.");
  }

  let data: { message?: string; errors?: Record<string, string[]> } | undefined;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Respon server tidak valid (Status: ${response.status})`);
  }

  if (response.status === 401) {
    if (endpoint !== "/login" && endpoint !== "/auth/login") {
      removeToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem("spake_user");
        localStorage.removeItem("spake_role");
        window.dispatchEvent(new CustomEvent("spake:unauthorized"));
        if (window.location.hash !== "#login") {
          window.location.hash = "login";
        }
      }
    }
    throw new Error(data?.message || "Sesi login Anda telah berakhir. Silakan masuk kembali.");
  }

  if (response.status === 429) {
    throw new Error(data?.message || "Terlalu banyak percobaan login. Coba lagi dalam 1 menit.");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Permintaan gagal dengan status ${response.status}`);
  }

  return data as unknown as T;
}

export const SpakeApi = {
  // Auth Token helpers
  getToken() {
    return getToken();
  },
  hasToken(): boolean {
    return hasAuthToken();
  },

  // Auth
  async login(email: string, pass: string) {
    const res = await request<{ status: string; token: string; user: UserAccount }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
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
    } catch {
      // Biarkan logout lokal tetap berjalan walau backend tidak merespons
    } finally {
      removeToken();
    }
  },

  async getUsers() {
    return request<{ status: string; data: UserAccount[] }>("/users");
  },

  async getUnits() {
    return request<{ status: string; data: { id: string; nama: string; kode?: string }[] }>(
      "/units",
    );
  },

  async createUser(data: Partial<UserAccount>) {
    return request<{ status: string; message: string; data: UserAccount }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<UserAccount>) {
    return request<{ status: string; message: string; data: UserAccount }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
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

  async updateStatus(id: string, status: string, note?: string, extra?: Record<string, unknown>) {
    return request<{ status: string; message: string; data: RequestItem }>(
      `/requests/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, note, ...extra }),
      },
    );
  },

  async submitSpj(
    id: string,
    payload:
      | FormData
      | { actualSpent: number; receiptImages?: string[] | undefined; note?: string | undefined },
  ) {
    const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
    return request<{ status: string; message: string; data: RequestItem }>(`/requests/${id}/spj`, {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },

  async catatPenyelesaianKasbon(
    id: string,
    payload?: { actualSpent?: number; bukti_path?: string } | FormData,
  ) {
    const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
    return request<{ status: string; message: string; data: Record<string, unknown> }>(
      `/kasbon/${id}/penyelesaian`,
      {
        method: "POST",
        body: isFormData ? payload : JSON.stringify(payload || {}),
      },
    );
  },

  async getActivities(id: string) {
    return request<{ status: string; data: ProcurementActivityLog[] }>(
      `/requests/${id}/activities`,
    );
  },

  async deleteRequest(id: string) {
    return request<{ status: string; message: string }>(`/requests/${id}`, {
      method: "DELETE",
    });
  },

  async getKpis() {
    return request<{ status: string; data: Record<string, unknown> }>("/requests/kpis");
  },

  // Stocks
  async getStocks() {
    return request<{ status: string; data: Record<string, unknown>[] }>("/stocks");
  },

  async getStockMap() {
    return request<{ status: string; data: Record<string, { stock: number; unit: string }> }>(
      "/stocks/map",
    );
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

  // Curriculums
  async getCurriculums(format?: string) {
    const qs = format ? `?format=${format}` : "";
    return request<{ status: string; data: unknown }>(`/curriculums${qs}`);
  },

  // Keputusan Keuangan (Faktor f)
  async keputusanKeuangan(
    id: string,
    data:
      | FormData
      | {
          faktor_f: number;
          catatan_keuangan: string;
          nominal_transfer?: number | undefined;
        },
  ) {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    return request<{ status: string; message: string; data: RequestItem }>(
      `/requests/${id}/keputusan-keuangan`,
      {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
      },
    );
  },

  // Katalog Barang (Alur B)
  async getKatalogBarang(aktifOnly = true) {
    const qs = aktifOnly ? "?aktif=1" : "";
    return request<{ status: string; data: Record<string, unknown>[] }>(`/katalog-barang${qs}`);
  },

  async createKatalogBarang(data: {
    nama: string;
    satuan: string;
    harga_acuan: number;
    aktif?: boolean;
  }) {
    return request<{ status: string; message: string; data: Record<string, unknown> }>(
      "/katalog-barang",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  async updateKatalogBarang(
    id: number | string,
    data: Partial<{ nama: string; satuan: string; harga_acuan: number; aktif: boolean }>,
  ) {
    return request<{ status: string; message: string; data: Record<string, unknown> }>(
      `/katalog-barang/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },

  // AI Forecasting (Alur B Random Forest & Baselines)
  async getForecastModelInfo() {
    return request<{ status: string; data: ForecastModelInfo }>("/forecasting/model-info");
  },

  async predictAlurB(targetPeriod?: string, unitId?: string, force = false) {
    return request<AlurBPredictionResponse>("/forecasting/predict-alur-b", {
      method: "POST",
      body: JSON.stringify({
        target_period: targetPeriod,
        unit_id: unitId,
        force,
      }),
    });
  },

  async trainAlurB() {
    return request<{ status: string; message: string; data: Record<string, unknown> }>(
      "/forecasting/train-alur-b",
      {
        method: "POST",
      },
    );
  },
};
