export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Disease {
  id: string;
  crop: string;
  name: string;
  scientific_name: string;
  symptoms: string;
  associated_conditions: string;
  prevention: string;
  next_steps: string;
  source: string;
  educational_only: boolean;
}

export interface Scan {
  id: string;
  farm_id: string | null;
  crop: string;
  predicted_class: string | null;
  confidence: number | null;
  status: "classified" | "uncertain" | "unavailable" | "error";
  model_name: string;
  warning: string;
  image_url: string;
  created_at: string;
  disease: Disease | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Overview {
  total_scans: number;
  healthy: number;
  disease_detections: number;
  uncertain: number;
  unavailable: number;
  crop_distribution: { name: string; count: number }[];
  disease_distribution: { name: string; count: number }[];
  recent_scans: Scan[];
}

export { cropOptions, scanCropOptions } from "./crops";
