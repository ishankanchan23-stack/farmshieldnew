import { useCallback, useEffect, useState } from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";
import type { Disease } from "../types";
import { scanCropOptions } from "../types/crops";

export function Diseases() {
  const [records, setRecords] = useState<Disease[]>([]);
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState<string>("Tomato");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecords = useCallback(async (query: string, selectedCrop: string) => {
    try { setRecords(await apiClient.diseases(query || undefined, selectedCrop)); setError(""); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, []);
  const load = useCallback((query: string, selectedCrop = crop) => { setLoading(true); void fetchRecords(query, selectedCrop); }, [crop, fetchRecords]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchRecords("", crop); }, [crop, fetchRecords]);

  return <>
    <PageHeading eyebrow="Educational reference" title="Crop health library" description="Explore crop-specific symptoms and prevention information. These pages are not a confirmed diagnosis." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><span className="flex items-center gap-2"><ShieldCheck size={18} />Use this library to guide observation—not to diagnose or select a chemical treatment.</span><span className="text-xs">Sources listed on each entry</span></div>
    <form className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]" onSubmit={(event) => { event.preventDefault(); void load(search); }}><label className="relative"><span className="sr-only">Search disease library</span><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field pl-10" placeholder="Search by name or symptom…" /></label><label><span className="sr-only">Filter by crop</span><select className="field" value={crop} onChange={(event) => setCrop(event.target.value)}>{scanCropOptions.map((option) => <option key={option}>{option}</option>)}</select></label><button className="btn-primary">Search</button></form>
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load(search)} /></div>}
    {loading ? <LoadingState /> : records.length ? <div className="grid gap-4 xl:grid-cols-2">{records.map((record) => <article key={record.id} className="card p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime/60 text-forest"><BookOpen size={19} /></span><div><span className="text-xs font-bold uppercase tracking-wider text-leaf">{record.crop} · Educational</span><h2 className="mt-1 text-lg font-extrabold">{record.name}</h2>{record.scientific_name && <p className="text-xs italic text-slate-400">{record.scientific_name}</p>}</div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><Info title="Symptoms to look for" text={record.symptoms} /><Info title="Associated conditions" text={record.associated_conditions} /><Info title="Prevention" text={record.prevention} /><Info title="Next steps" text={record.next_steps} /></div>
      <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Information source: {record.source}. Similar symptoms can have different causes.</p>
    </article>)}</div> : <div className="card p-12 text-center"><BookOpen className="mx-auto text-leaf" /><h2 className="mt-3 font-bold">No matching entries</h2><p className="mt-1 text-sm text-slate-500">Try another disease or symptom search.</p></div>}
  </>;
}

function Info({ title, text }: { title: string; text: string }) {
  return <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-700">{text}</p></div>;
}
