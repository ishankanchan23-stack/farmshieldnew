import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, BookOpen, ChevronDown, CircleHelp, CloudSun, FileClock, LayoutDashboard, Leaf,
  LogOut, Menu, Search, Settings, Sprout, X, BarChart3,
} from "lucide-react";
import { useAuth } from "../app/auth-context";
import { useTranslation } from "../app/i18n-context";

const links = [
  { to: "/app/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/app/farms", key: "farms", icon: Sprout },
  { to: "/app/scanner", key: "scanner", icon: Leaf },
  { to: "/app/history", key: "history", icon: FileClock },
  { to: "/app/diseases", key: "diseases", icon: BookOpen },
  { to: "/app/weather", key: "weather", icon: CloudSun },
  { to: "/app/analytics", key: "analytics", icon: BarChart3 },
];
const secondary = [
  { to: "/app/notifications", key: "notifications", icon: Bell },
  { to: "/app/settings", key: "settings", icon: Settings },
  { to: "/app/help", key: "help", icon: CircleHelp },
];

function NavItems({ close }: { close?: () => void }) {
  const t = useTranslation();
  return <nav className="space-y-1">
    {links.map(({ to, key, icon: Icon }) => <NavLink onClick={close} key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
      <Icon size={18} strokeWidth={1.8} /><span>{t[key as keyof typeof t]}</span>
    </NavLink>)}
    <p className="px-3 pb-1 pt-6 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Workspace</p>
    {secondary.map(({ to, key, icon: Icon }) => <NavLink onClick={close} key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
      <Icon size={18} strokeWidth={1.8} /><span>{t[key as keyof typeof t]}</span>
    </NavLink>)}
  </nav>;
}

export function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslation();
  const selected = [...links, ...secondary].find((item) => location.pathname === item.to);
  const title = selected ? t[selected.key as keyof typeof t] : "FarmShield";

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return <div className="min-h-screen bg-cream lg:flex">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[254px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:flex">
      <Brand />
      <div className="mt-8 flex-1 overflow-y-auto"><NavItems /></div>
      <div className="mt-5 rounded-2xl bg-forest p-4 text-white">
        <span className="text-xs font-semibold text-emerald-100">Field note</span>
        <p className="mt-2 text-sm font-semibold leading-5">A clear photo helps your expert make a better decision.</p>
        <NavLink to="/app/help" className="mt-3 inline-block text-xs font-bold text-lime">Photo tips <span aria-hidden>→</span></NavLink>
      </div>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setMobileOpen(false)}>
      <aside onClick={(event) => event.stopPropagation()} className="h-full w-[280px] bg-white p-4 shadow-xl">
        <div className="mb-7 flex items-center justify-between"><Brand /><button aria-label="Close menu" onClick={() => setMobileOpen(false)}><X /></button></div>
        <NavItems close={() => setMobileOpen(false)} />
      </aside>
    </div>}
    <main className="min-h-screen min-w-0 flex-1 pb-24 lg:ml-[254px] lg:pb-8">
      <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-slate-200/80 bg-cream/95 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <button aria-label="Open navigation" className="rounded-lg p-2 hover:bg-white lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="hidden text-xs text-slate-400 sm:block">Workspace <span className="mx-1">/</span> <span className="font-semibold text-slate-700">{title}</span></div>
          <div className="font-bold lg:hidden">{title}</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <NavLink aria-label="Search scan history" to="/app/history" className="rounded-xl p-2 text-slate-500 hover:bg-white"><Search size={19} /></NavLink>
          <NavLink aria-label="Notifications" to="/app/notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-white">
            <Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
          </NavLink>
          <div className="relative border-l border-slate-200 pl-3 sm:pl-4">
            <button className="flex items-center gap-2" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lime font-bold text-forest">{user?.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-left sm:block"><span className="block text-sm font-bold">{user?.name}</span><span className="block text-xs text-slate-500">Farmer account</span></span>
              <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
            </button>
            {profileOpen && <div className="absolute right-0 top-12 w-52 rounded-xl border border-slate-100 bg-white p-2 shadow-card">
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><LogOut size={16} /> Sign out</button>
            </div>}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 lg:px-10"><Outlet /></div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
        {[...links.slice(0, 4), { to: "/app/analytics", key: "analytics", icon: BarChart3 }].map(({ to, key, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[10px] font-semibold ${isActive ? "text-leaf" : "text-slate-400"}`}>
          <Icon size={19} /><span>{t[key as keyof typeof t]}</span>
        </NavLink>)}
      </nav>
    </main>
  </div>;
}

export function Brand() {
  return <NavLink to="/" className="flex items-center gap-3">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-lime"><Leaf size={22} /></span>
    <span><span className="block font-extrabold tracking-tight text-forest">FarmShield <span className="text-leaf">AI</span></span><span className="block text-[10px] font-semibold uppercase tracking-[.15em] text-slate-400">Crop health intelligence</span></span>
  </NavLink>;
}
