import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, Check, Info } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";

interface Notification {
  id: string; title: string; body: string; read: boolean; created_at: string;
}

export function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchNotifications = useCallback(async () => {
    try {
      setItems(await apiClient.notifications()); setError("");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, []);
  const load = useCallback(() => { setLoading(true); void fetchNotifications(); }, [fetchNotifications]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);
  async function markRead(id: string) {
    try {
      await apiClient.markNotificationRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (failure) { setError(errorMessage(failure)); }
  }
  return <>
    <PageHeading eyebrow="Risk and system messages" title="Notifications" description="Uncertain model outputs and weather-related advisories are informational—not confirmed disease diagnoses." />
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}
    {loading ? <LoadingState /> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className={`card flex gap-4 p-5 ${item.read ? "opacity-70" : ""}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><AlertTriangle size={19} /></span><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{item.title}</h2><span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p></div>{!item.read && <button aria-label={`Mark ${item.title} as read`} title="Mark as read" onClick={() => void markRead(item.id)} className="h-9 rounded-lg p-2 text-leaf hover:bg-emerald-50"><Check size={17} /></button>}</article>)}</div> : <div className="grid gap-4 lg:grid-cols-2"><div className="card p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/50 text-forest"><Bell size={20} /></span><h2 className="mt-4 font-bold">You’re all caught up</h2><p className="mt-2 text-sm leading-6 text-slate-500">System notifications appear here when a scan needs attention. Review individual scan warnings in your history.</p></div><div className="card p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-800"><Info size={20} /></span><h2 className="mt-4 font-bold">Weather risk indicators</h2><p className="mt-2 text-sm leading-6 text-slate-500">Live conditions and any configured, sourced crop-specific rules appear in Weather Intelligence. With no validated rule configured, FarmShield makes no disease-risk claim.</p></div></div>}
  </>;
}
