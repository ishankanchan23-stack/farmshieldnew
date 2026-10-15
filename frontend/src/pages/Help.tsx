import { AlertTriangle, Camera, CircleHelp, Eye, Leaf, ShieldCheck } from "lucide-react";
import { PageHeading } from "../components/ui";
import { useTranslation } from "../app/i18n-context";

const sections = [
  { icon: Camera, title: "How image classification works", body: "If compatible model weights and labels are configured, FarmShield preprocesses the uploaded image and runs a classifier. The model's top class and softmax score are stored with model metadata. If no model is configured, no prediction is created." },
  { icon: Leaf, title: "Supported crops and classes", body: "The initial configuration targets tomato and includes the common PlantVillage tomato class names. A class mapping file is provided as an example. The class labels must exactly match the output order of your own trained weights." },
  { icon: AlertTriangle, title: "Limitations and uncertainty", body: "Images may not contain a leaf, classes may be out of scope, and a model may not generalize to local varieties or field conditions. Softmax confidence is not diagnostic accuracy. Low-confidence predictions should be checked by an agricultural expert." },
  { icon: Eye, title: "Photo quality", body: "Take a close, in-focus image in even natural light. Include one leaf, avoid glare and harsh shadows, and capture both sides if the symptom is unclear. Basic dimension checks do not prove that a leaf is present." },
  { icon: ShieldCheck, title: "Weather alerts", body: "Weather observations are supplied by the configured provider. Risk rules are disabled unless crop-specific thresholds with a documented source are configured. Weather is context—not proof of disease." },
  { icon: CircleHelp, title: "Incorrect predictions", body: "Keep the scan timestamp, crop, and model version when reporting a problem to your project team. Do not use an app output alone to decide pesticide selection, dose, or application." },
];

export function Help() {
  const t = useTranslation();
  return <>
    <PageHeading eyebrow="Learn how FarmShield works" title="Help & about" description="A transparent guide to the model, image quality, weather indicators, and limitations." />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>{t.safety}</strong> FarmShield AI is an educational decision-support prototype. Consult a qualified local agricultural expert.</div>
    <div className="grid gap-4 md:grid-cols-2">{sections.map(({ icon: Icon, title, body }) => <article key={title} className="card p-5 sm:p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/50 text-forest"><Icon size={19} /></span><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}</div>
    <div className="mt-6 rounded-2xl bg-forest p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.15em] text-lime">Project identity</p><h2 className="mt-2 text-xl font-bold">FarmShield AI</h2><p className="mt-1 text-sm text-emerald-100">Detect Today, Healthier Crops Tomorrow.</p><p className="mt-4 text-xs leading-5 text-emerald-200">Built as an open-source learning project. Model outputs and guidance must be validated for real-world use.</p></div>
  </>;
}
