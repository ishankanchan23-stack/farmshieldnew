import { useEffect, useState } from "react";
import { Check, Globe2, Moon, Ruler } from "lucide-react";
import { useLanguage } from "../app/i18n-context";
import type { Language } from "../i18n/translations";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";

export function Settings() {
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [language, setLanguageState] = useState<Language>("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const { setLanguage } = useLanguage();
  useEffect(() => {
    apiClient.settings().then((data) => {
      setProfile(data); setLanguageState(data.language); setTheme(data.theme); setUnits(data.units);
      setLanguage(data.language);
      document.documentElement.classList.toggle("dark", data.theme === "dark");
    }).catch((failure) => setError(errorMessage(failure))).finally(() => setLoading(false));
  }, [setLanguage]);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await apiClient.updateSettings({ language, theme, units });
      localStorage.setItem("farmshield_language", language);
      setLanguage(language);
      document.documentElement.classList.toggle("dark", theme === "dark");
      setSaved(true);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  }
  if (loading) return <LoadingState />;
  return <>
    <PageHeading eyebrow="Your preferences" title="Settings" description="Manage your language, display theme, measurement units, and account profile." />
    {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
      <section className="card p-5 sm:p-6"><h2 className="font-bold">Experience</h2><p className="mt-1 text-sm text-slate-500">Preferences are saved to your account.</p>
        <label className="mt-6 flex items-start gap-3"><Globe2 className="mt-2 text-leaf" size={19} /><span className="flex-1 text-sm font-semibold">Language<select className="field mt-2" value={language} onChange={(event) => setLanguageState(event.target.value as Language)}><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="mr">मराठी (Marathi)</option></select></span></label>
        <label className="mt-5 flex items-start gap-3"><Moon className="mt-2 text-leaf" size={19} /><span className="flex-1 text-sm font-semibold">Theme<select className="field mt-2" value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")}><option value="light">Light</option><option value="dark">Dark</option></select></span></label>
        <label className="mt-5 flex items-start gap-3"><Ruler className="mt-2 text-leaf" size={19} /><span className="flex-1 text-sm font-semibold">Measurement units<select className="field mt-2" value={units} onChange={(event) => setUnits(event.target.value as "metric" | "imperial")}><option value="metric">Metric (°C, mm)</option><option value="imperial">Imperial (°F, in)</option></select></span></label>
        <button disabled={saving} className="btn-primary mt-6" onClick={() => void save()}>{saving ? "Saving…" : "Save preferences"}{saved && <Check size={16} />}</button>
        {saved && <span role="status" className="ml-3 text-sm font-semibold text-emerald-700">Preferences saved.</span>}
      </section>
      <section className="card p-5 sm:p-6"><h2 className="font-bold">Account profile</h2><p className="mt-1 text-sm text-slate-500">Your account identity is used to isolate private farm records.</p><label className="mt-6 block text-sm font-semibold">Name<input className="field mt-2 bg-slate-50" value={profile?.name || ""} readOnly /></label><label className="mt-4 block text-sm font-semibold">Email<input className="field mt-2 bg-slate-50" value={profile?.email || ""} readOnly /></label><p className="mt-5 text-xs leading-5 text-slate-400">Profile editing and password reset are not enabled in this development build. Never share your password or access token.</p></section>
    </div>
  </>;
}
