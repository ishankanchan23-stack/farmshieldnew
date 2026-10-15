import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowUpRight, Camera, CheckCircle2, Leaf, ScanLine } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "../app/i18n-context";
import { ErrorNotice, LoadingState, PageHeading, StatusBadge } from "../components/ui";
import { ScanThumbnail } from "../components/ScanThumbnail";
import { apiClient, errorMessage } from "../lib/api";
import type { Overview } from "../types";

const colors = ["#2e8056", "#91b96e", "#d2a45d", "#7e9caf", "#c87a63", "#8e9a62"];

export function Dashboard() {
  const t = useTranslation();
  const [data, setData] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<{ date: string; scans: number }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [overview, trendData] = await Promise.all([apiClient.overview(), apiClient.trends("weekly")]);
      setData(overview);
      setTrends(trendData);
      setError("");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, []);
  const load = useCallback(() => { setLoading(true); void fetchData(); }, [fetchData]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorNotice message={error} retry={() => void load()} />;
  if (!data) return null;

  const stats = [
    { label: t.scans, value: data.total_scans, icon: ScanLine, tint: "bg-emerald-50 text-leaf", note: `${data.unavailable} without a configured model` },
    { label: t.healthy, value: data.healthy, icon: CheckCircle2, tint: "bg-lime/50 text-forest", note: "From stored scan results" },
    { label: t.disease, value: data.disease_detections, icon: Activity, tint: "bg-orange-50 text-orange-700", note: "Classifier outputs only" },
    { label: t.uncertain, value: data.uncertain, icon: AlertTriangle, tint: "bg-amber-50 text-amber-800", note: "Expert verification advised" },
  ];

  return <>
    <PageHeading eyebrow="Farm health workspace" title={`${t.greeting}, ready to check your crops?`} description="A clear view of your observations and crop health records." action={<Link to="/app/scanner" className="btn-primary"><Camera size={17} />{t.scanNow}</Link>} />
    {data.unavailable > 0 && <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><span className="font-bold text-ink">Transparency note:</span> {data.unavailable} scan(s) are recorded without a genuine prediction because model weights are not configured.</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, tint, note }) => <article key={label} className="card p-5">
      <div className="flex items-start justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}><Icon size={19} /></span></div>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p>
    </article>)}</section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <article className="card p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-bold">Scan activity</h2><p className="mt-1 text-xs text-slate-500">Recorded scans over the last 7 days</p></div><span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">Weekly</span></div>
        <div className="mt-5 h-64">{trends.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trends} margin={{ left: -20, right: 8, top: 12, bottom: 0 }}><CartesianGrid stroke="#edf1eb" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#87928b" }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#87928b" }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="scans" fill="#2e8056" radius={[6, 6, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-400">Scan data will appear here as you use the app.</div>}</div>
      </article>
      <article className="card p-5 sm:p-6"><h2 className="font-bold">Observed outcomes</h2><p className="mt-1 text-xs text-slate-500">Stored classifier output only—no scan is counted as a diagnosis when model weights are missing.</p>
        <div className="relative mt-3 h-52">{data.disease_distribution.length ? <><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.disease_distribution} dataKey="count" nameKey="name" innerRadius={53} outerRadius={80} paddingAngle={3}>{data.disease_distribution.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="text-2xl font-extrabold">{data.disease_distribution.reduce((sum, item) => sum + item.count, 0)}</p><p className="text-[10px] text-slate-400">classified</p></div></div></> : <div className="grid h-full place-items-center text-sm text-slate-400">No classified scans to chart yet.</div>}</div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">{data.disease_distribution.slice(0, 5).map((item, index) => <span key={item.name} className="flex items-center gap-1.5 text-[11px] text-slate-500"><i className="h-2 w-2 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />{item.name.replace("Tomato___", "").replaceAll("_", " ")}</span>)}</div>
      </article>
    </section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <article className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">Recent scan activity</h2><p className="mt-1 text-xs text-slate-500">Your latest saved observations</p></div><Link to="/app/history" className="inline-flex items-center gap-1 text-xs font-bold text-leaf">View history <ArrowUpRight size={14} /></Link></div>
        {data.recent_scans.length ? <div className="divide-y divide-slate-100">{data.recent_scans.map((scan) => <div key={scan.id} className="flex items-center gap-3 px-5 py-3.5"><ScanThumbnail path={scan.image_url} alt={`Leaf image for ${scan.crop} scan`} className="h-11 w-11 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{scan.disease?.name || scan.predicted_class?.replace("Tomato___", "").replaceAll("_", " ") || scan.crop}</p><p className="mt-1 text-xs text-slate-400">{new Date(scan.created_at).toLocaleString()}</p></div><StatusBadge status={scan.status} /></div>)}</div> : <div className="px-5 py-10 text-center"><Leaf className="mx-auto text-lime" /><p className="mt-2 text-sm font-semibold">{t.noScans}</p><p className="mt-1 text-xs text-slate-500">Your scans will be stored here. No sample metrics are being shown.</p><Link to="/app/scanner" className="mt-4 inline-flex text-sm font-bold text-leaf">Start a scan <ArrowUpRight size={15} /></Link></div>}
      </article>
      <article className="rounded-2xl bg-forest p-6 text-white"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-lime"><SproutIcon /></span><p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-200">Field-ready workflow</p><h2 className="mt-2 text-xl font-bold leading-7">Good observations begin with a good image.</h2><p className="mt-3 text-sm leading-6 text-emerald-100">Frame one leaf in natural light, focus on the visible symptom, and avoid backgrounds that distract from the plant.</p><Link to="/app/scanner" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-forest">Open scanner <ArrowUpRight size={16} /></Link></article>
    </section>
  </>;
}

function SproutIcon() { return <Leaf size={21} />; }
