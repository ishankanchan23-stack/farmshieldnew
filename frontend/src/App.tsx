import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "./app/auth-context";
import { LanguageProvider } from "./app/i18n";
import { useLanguage } from "./app/i18n-context";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { Landing } from "./pages/Landing";
import { apiClient } from "./lib/api";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Analytics = lazy(() => import("./pages/Analytics").then((module) => ({ default: module.Analytics })));
const Diseases = lazy(() => import("./pages/Diseases").then((module) => ({ default: module.Diseases })));
const Farms = lazy(() => import("./pages/Farms").then((module) => ({ default: module.Farms })));
const Help = lazy(() => import("./pages/Help").then((module) => ({ default: module.Help })));
const History = lazy(() => import("./pages/History").then((module) => ({ default: module.History })));
const Notifications = lazy(() => import("./pages/Notifications").then((module) => ({ default: module.Notifications })));
const Scanner = lazy(() => import("./pages/Scanner").then((module) => ({ default: module.Scanner })));
const Settings = lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));
const Weather = lazy(() => import("./pages/Weather").then((module) => ({ default: module.Weather })));

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your secure workspace…</main>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  const { setLanguage } = useLanguage();
  useEffect(() => {
    const theme = localStorage.getItem("farmshield_theme");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    apiClient.settings().then((settings) => {
      if (active) {
        setLanguage(settings.language);
        localStorage.setItem("farmshield_language", settings.language);
        localStorage.setItem("farmshield_theme", settings.theme);
        document.documentElement.classList.toggle("dark", settings.theme === "dark");
      }
    }).catch((failure: unknown) => {
      console.error("Could not load saved FarmShield preferences.", failure);
    });
    return () => { active = false; };
  }, [setLanguage, user]);
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route element={<Protected />}>
      <Route path="/app" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoading />}><Dashboard /></Suspense>} />
        <Route path="farms" element={<Suspense fallback={<PageLoading />}><Farms /></Suspense>} />
        <Route path="scanner" element={<Suspense fallback={<PageLoading />}><Scanner /></Suspense>} />
        <Route path="history" element={<Suspense fallback={<PageLoading />}><History /></Suspense>} />
        <Route path="diseases" element={<Suspense fallback={<PageLoading />}><Diseases /></Suspense>} />
        <Route path="weather" element={<Suspense fallback={<PageLoading />}><Weather /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageLoading />}><Analytics /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageLoading />}><Notifications /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoading />}><Settings /></Suspense>} />
        <Route path="help" element={<Suspense fallback={<PageLoading />}><Help /></Suspense>} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function PageLoading() {
  return <div role="status" className="grid min-h-64 place-items-center text-sm text-slate-500">Loading workspace page…</div>;
}

export default function App() {
  return <LanguageProvider><AppRoutes /></LanguageProvider>;
}
