import axios from "axios";
import type { Disease, Farm, Overview, Page, Scan, User } from "../types";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl
  ? /^https?:\/\//i.test(configuredApiUrl)
    ? configuredApiUrl
    : `https://${configuredApiUrl.replace(/^\/+/, "")}`
  : import.meta.env.DEV
    ? "http://127.0.0.1:8000"
    : "";

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("farmshield_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (data && typeof data === "object" && "detail" in data) {
      const detail = data.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        const messages = detail.flatMap((issue: unknown) => {
          if (!issue || typeof issue !== "object" || !("msg" in issue) || typeof issue.msg !== "string") return [];
          const location = "loc" in issue && Array.isArray(issue.loc)
            ? issue.loc.filter((part): part is string => typeof part === "string" && part !== "body").join(".")
            : "";
          return [location ? `${location}: ${issue.msg}` : issue.msg];
        });
        if (messages.length) return messages.join(" ");
      }
    }
    if (!error.response) return "Cannot connect to the FarmShield API. Start the backend and check VITE_API_URL.";
    return error.message || "Unable to complete the request.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export const apiClient = {
  async register(name: string, email: string, password: string) {
    const { data } = await api.post<{ access_token: string; user: User }>("/api/v1/auth/register", { name, email, password });
    return data;
  },
  async login(email: string, password: string) {
    const { data } = await api.post<{ access_token: string; user: User }>("/api/v1/auth/login", { email, password });
    return data;
  },
  async me() {
    const { data } = await api.get<User>("/api/v1/auth/me");
    return data;
  },
  async logout() {
    await api.post("/api/v1/auth/logout");
  },
  async overview() {
    const { data } = await api.get<Overview>("/api/v1/analytics/overview");
    return data;
  },
  async trends(period = "weekly") {
    const { data } = await api.get<{ items: { date: string; scans: number }[] }>("/api/v1/analytics/trends", { params: { period } });
    return data.items;
  },
  async scans(params: Record<string, string | number | undefined> = {}) {
    const { data } = await api.get<Page<Scan>>("/api/v1/scans", { params });
    return data;
  },
  async deleteScan(id: string) {
    await api.delete(`/api/v1/scans/${id}`);
  },
  async analyze(file: File, crop: string, farmId?: string) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<Scan>("/api/v1/scans/analyze", form, {
      params: { crop, ...(farmId ? { farm_id: farmId } : {}) },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return data;
  },
  async farms() {
    const { data } = await api.get<Farm[]>("/api/v1/farms");
    return data;
  },
  async createFarm(body: Omit<Farm, "id">) {
    const { data } = await api.post<Farm>("/api/v1/farms", body);
    return data;
  },
  async updateFarm(id: string, body: Partial<Omit<Farm, "id">>) {
    const { data } = await api.patch<Farm>(`/api/v1/farms/${id}`, body);
    return data;
  },
  async deleteFarm(id: string) {
    await api.delete(`/api/v1/farms/${id}`);
  },
  async createCrop(body: { farm_id: string; name: string; variety: string }) {
    const { data } = await api.post("/api/v1/crops", body);
    return data;
  },
  async crops() {
    const { data } = await api.get<{ id: string; farm_id: string; name: string; variety: string; farm_name: string }[]>("/api/v1/crops");
    return data;
  },
  async diseases(search?: string, crop = "Tomato") {
    const { data } = await api.get<Disease[]>("/api/v1/diseases", { params: { crop, ...(search ? { search } : {}) } });
    return data;
  },
  async weather(farmId: string) {
    const { data } = await api.get("/api/v1/weather/current", { params: { farm_id: farmId } });
    return data as {
      source: string; location: string; temperature_c: number; humidity_pct: number;
      rainfall_mm: number | null; wind_mps: number; condition: string; observed_at: number;
    };
  },
  async risks(farmId: string) {
    const { data } = await api.get("/api/v1/weather/risks", { params: { farm_id: farmId } });
    return data as { alerts: { title: string; explanation: string; source: string }[]; message: string | null };
  },
  async forecast(farmId: string) {
    const { data } = await api.get<{ source: string; items: { time: string; temperature_c: number; humidity_pct: number; condition: string; rainfall_mm: number | null }[] }>("/api/v1/weather/forecast", { params: { farm_id: farmId } });
    return data;
  },
  async settings() {
    const { data } = await api.get("/api/v1/settings");
    return data as { language: "en" | "hi" | "mr"; theme: "light" | "dark"; units: "metric" | "imperial"; name: string; email: string };
  },
  async updateSettings(body: { language?: string; theme?: string; units?: string }) {
    const { data } = await api.patch("/api/v1/settings", body);
    return data;
  },
  async notifications() {
    const { data } = await api.get<{ id: string; title: string; body: string; read: boolean; created_at: string }[]>("/api/v1/notifications");
    return data;
  },
  async markNotificationRead(id: string) {
    const { data } = await api.patch(`/api/v1/notifications/${id}/read`);
    return data;
  },
  imageUrl(path: string) {
    return `${api.defaults.baseURL}${path}`;
  },
  async download(path: string, filename: string) {
    const { data } = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(data as Blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  async privateImage(path: string) {
    const { data } = await api.get<Blob>(path, { responseType: "blob" });
    return URL.createObjectURL(data);
  },
};
