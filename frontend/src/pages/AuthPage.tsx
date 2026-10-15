import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Leaf, LoaderCircle } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth-context";
import { errorMessage } from "../lib/api";
import { Brand } from "../components/Layout";

const schema = z.object({
  name: z.string().min(2, "Enter your name.").max(100).optional(),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
});
type FormValues = z.infer<typeof schema>;

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register: field, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  if (user) return <Navigate to="/app/dashboard" replace />;

  async function submit(values: FormValues) {
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await register(values.name || "", values.email, values.password);
      else await login(values.email, values.password);
      navigate("/app/dashboard");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen bg-white lg:grid-cols-[.85fr_1.15fr]">
    <section className="hidden flex-col justify-between bg-forest p-12 text-white lg:flex">
      <Brand />
      <div className="max-w-lg"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-lime"><Leaf size={29} /></span><h1 className="mt-8 text-4xl font-extrabold leading-tight">A thoughtful partner for every growing season.</h1><p className="mt-5 max-w-md leading-7 text-emerald-100">Organize field observations, review crop guidance, and keep your farm records close at hand.</p><p className="mt-8 text-sm font-semibold text-lime">Detect Today, Healthier Crops Tomorrow.</p></div>
      <p className="text-xs text-emerald-200">Private farm data · Transparent AI · Practical crop context</p>
    </section>
    <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-24">
      <div className="mb-10 lg:hidden"><Brand /></div>
      <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-forest"><ArrowLeft size={16} /> Back to home</Link>
      <div className="max-w-md"><p className="eyebrow">{mode === "register" ? "Create your account" : "Welcome back"}</p><h2 className="mt-2 text-3xl font-extrabold">{mode === "register" ? "Start with your farm" : "Sign in to FarmShield"}</h2><p className="mt-2 text-sm text-slate-500">{mode === "register" ? "Your farm records are private to your account." : "Continue to your crop health workspace."}</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-4">
          {mode === "register" && <label className="block text-sm font-semibold">Full name<input className="field mt-2" autoComplete="name" {...field("name")} />{errors.name && <span className="mt-1 block text-xs text-rose-700">{errors.name.message}</span>}</label>}
          <label className="block text-sm font-semibold">Email address<input type="email" className="field mt-2" autoComplete="email" {...field("email")} />{errors.email && <span className="mt-1 block text-xs text-rose-700">{errors.email.message}</span>}</label>
          <label className="block text-sm font-semibold">Password<input type="password" className="field mt-2" autoComplete={mode === "register" ? "new-password" : "current-password"} {...field("password")} />{errors.password && <span className="mt-1 block text-xs text-rose-700">{errors.password.message}</span>}{mode === "register" && <span className="mt-1 block text-xs text-slate-500">At least 10 characters.</span>}</label>
          <button disabled={busy} className="btn-primary mt-2 w-full py-3">{busy && <LoaderCircle className="animate-spin" size={17} />}{mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{mode === "register" ? "Already have an account?" : "New to FarmShield?"} <Link className="font-bold text-forest hover:underline" to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create an account"}</Link></p>
        <p className="mt-8 text-center text-xs leading-5 text-slate-400">This project provides educational decision support, not a professional diagnosis or treatment recommendation.</p>
      </div>
    </section>
  </main>;
}
