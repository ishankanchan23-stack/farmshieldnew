import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MapPin, Pencil, Plus, Sprout, Trash2, X } from "lucide-react";
import { apiClient, errorMessage } from "../lib/api";
import { ErrorNotice, LoadingState, PageHeading } from "../components/ui";
import type { Farm } from "../types";

const farmSchema = z.object({
  name: z.string().min(2, "Farm name must be at least 2 characters.").max(100),
  location: z.string().max(160).default(""),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
type FarmValues = z.infer<typeof farmSchema>;

export function Farms() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<{ id: string; farm_id: string; name: string; variety: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [addingCropFor, setAddingCropFor] = useState<string | null>(null);
  const [cropName, setCropName] = useState("Tomato");
  const [cropVariety, setCropVariety] = useState("");
  const [cropSaving, setCropSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FarmValues>({ resolver: zodResolver(farmSchema), defaultValues: { name: "", location: "", latitude: "", longitude: "" } });

  const fetchFarms = useCallback(async () => {
    try {
      const [farmData, cropData] = await Promise.all([apiClient.farms(), apiClient.crops()]);
      setFarms(farmData);
      setCrops(cropData);
      setError("");
    }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }, []);
  const load = useCallback(() => { setLoading(true); void fetchFarms(); }, [fetchFarms]);
  // Fetching server data is this effect's external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchFarms(); }, [fetchFarms]);

  function edit(farm: Farm) {
    setEditing(farm.id);
    reset({ name: farm.name, location: farm.location, latitude: farm.latitude?.toString() || "", longitude: farm.longitude?.toString() || "" });
  }

  async function submit(values: FarmValues) {
    setError("");
    const payload = {
      name: values.name, location: values.location || "",
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
    };
    try {
      if (editing) await apiClient.updateFarm(editing, payload);
      else await apiClient.createFarm(payload);
      reset({ name: "", location: "", latitude: "", longitude: "" });
      setEditing(null);
      await fetchFarms();
    } catch (failure) { setError(errorMessage(failure)); }
  }

  async function remove(farm: Farm) {
    if (!window.confirm(`Delete ${farm.name}? Its scans remain in history but will no longer be linked to this farm.`)) return;
    try { await apiClient.deleteFarm(farm.id); await fetchFarms(); }
    catch (failure) { setError(errorMessage(failure)); }
  }

  async function addCrop(event: FormEvent<HTMLFormElement>, farmId: string) {
    event.preventDefault();
    setCropSaving(true);
    setError("");
    try {
      await apiClient.createCrop({ farm_id: farmId, name: cropName, variety: cropVariety });
      setCropName("Tomato");
      setCropVariety("");
      setAddingCropFor(null);
      await fetchFarms();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setCropSaving(false); }
  }

  return <>
    <PageHeading eyebrow="Farm management" title="Your farms" description="Keep your field locations and crop observations organized." />
    {error && <div className="mb-5"><ErrorNotice message={error} retry={() => void load()} /></div>}
    <div className="grid items-start gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <form onSubmit={handleSubmit(submit)} className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-forest"><Plus size={20} /></span><div><h2 className="font-bold">{editing ? "Edit farm" : "Add a farm"}</h2><p className="text-xs text-slate-500">Only your account can access these details.</p></div></div>
        <label className="mb-4 block text-sm font-semibold">Farm name<input className="field mt-2" {...register("name")} placeholder="e.g. North Field" />{errors.name && <span className="mt-1 block text-xs text-rose-700">{errors.name.message}</span>}</label>
        <label className="mb-4 block text-sm font-semibold">Location description<input className="field mt-2" {...register("location")} placeholder="Village, district" /></label>
        <p className="mb-2 text-xs font-semibold text-slate-600">Coordinates for live weather (optional)</p>
        <div className="mb-5 grid grid-cols-2 gap-3"><label className="text-xs text-slate-500">Latitude<input className="field mt-1" type="number" step="any" min="-90" max="90" {...register("latitude")} placeholder="18.5204" /></label><label className="text-xs text-slate-500">Longitude<input className="field mt-1" type="number" step="any" min="-180" max="180" {...register("longitude")} placeholder="73.8567" /></label></div>
        <button disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? "Saving…" : editing ? "Save changes" : "Add farm"}</button>
        {editing && <button type="button" className="btn-secondary mt-2 w-full" onClick={() => { setEditing(null); reset(); }}>Cancel edit</button>}
      </form>
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Farm locations</h2><span className="text-xs text-slate-500">{farms.length} {farms.length === 1 ? "farm" : "farms"}</span></div>
        {loading ? <LoadingState /> : farms.length ? <div className="space-y-3">{farms.map((farm) => <article key={farm.id} className="card p-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eff5e8] text-leaf"><Sprout size={22} /></span>
            <div className="min-w-0 flex-1"><h3 className="font-bold">{farm.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{farm.location || "Location not set"}</p><p className="mt-1 text-xs text-slate-400">{farm.latitude !== null && farm.longitude !== null ? `${farm.latitude}, ${farm.longitude}` : "Coordinates needed for live weather"}</p></div>
            <button aria-label={`Edit ${farm.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" onClick={() => edit(farm)}><Pencil size={17} /></button><button aria-label={`Delete ${farm.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => void remove(farm)}><Trash2 size={17} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">Crops</span>
            {crops.filter((crop) => crop.farm_id === farm.id).map((crop) => <span key={crop.id} className="rounded-full bg-lime/50 px-2.5 py-1 text-xs font-semibold text-forest">{crop.name}{crop.variety ? ` · ${crop.variety}` : ""}</span>)}
            <button className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline" onClick={() => setAddingCropFor(addingCropFor === farm.id ? null : farm.id)}><Plus size={14} />Add crop</button>
          </div>
          {addingCropFor === farm.id && <form onSubmit={(event) => void addCrop(event, farm.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor={`crop-${farm.id}`}>Crop type</label><select id={`crop-${farm.id}`} className="field" value={cropName} onChange={(event) => setCropName(event.target.value)}><option>Tomato</option><option>Bell Pepper</option><option>Potato</option><option>Apple</option><option>Corn</option><option>Grape</option></select>
            <label className="sr-only" htmlFor={`variety-${farm.id}`}>Crop variety</label><input id={`variety-${farm.id}`} className="field" value={cropVariety} onChange={(event) => setCropVariety(event.target.value)} placeholder="Variety (optional)" />
            <div className="flex gap-2"><button disabled={cropSaving} className="btn-primary !px-3 !py-2 text-xs">{cropSaving ? "Saving…" : "Save crop"}</button><button type="button" aria-label="Cancel adding crop" className="btn-secondary !px-3 !py-2" onClick={() => setAddingCropFor(null)}><X size={15} /></button></div>
          </form>}
        </article>)}</div> : <div className="card p-10 text-center"><Sprout className="mx-auto text-leaf" /><h3 className="mt-3 font-bold">No farms added yet</h3><p className="mt-1 text-sm text-slate-500">Add your first location to associate scans and weather.</p></div>}
      </section>
    </div>
  </>;
}
