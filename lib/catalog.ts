import { supabase } from "./supabase";

export type VehicleSize = "city" | "sedan" | "suv" | "luxury";

export const VEHICLE_SIZES: { value: VehicleSize; label: string; example: string }[] = [
  { value: "city", label: "City / Compact", example: "Panda, 500, Yaris, Clio" },
  { value: "sedan", label: "Berlina / SW", example: "Golf, Serie 3, A4 Avant" },
  { value: "suv", label: "SUV / Monovolume", example: "Qashqai, Tiguan, X5, 7 posti" },
  { value: "luxury", label: "Supercar / Luxury", example: "Porsche 911, Ferrari, AMG" },
];

export type PriceInfo = { cents: number; from: boolean };

export type Service = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  features: string[];
  duration_min: number;
  is_featured: boolean;
  prices: Partial<Record<VehicleSize, PriceInfo>>;
  addonIds: string[];
};

export type Addon = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_min: number;
};

type PriceRow = {
  service_id: string;
  vehicle_size: VehicleSize;
  price_cents: number;
  is_from: boolean;
};

type LinkRow = { service_id: string; addon_id: string };

export async function getCatalog(): Promise<{ services: Service[]; addons: Addon[] }> {
  const [s, a, p, l] = await Promise.all([
    supabase
      .from("services")
      .select("id,slug,name,tagline,description,features,duration_min,is_featured")
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("category", "interior")
      .order("sort_order", { ascending: true }),
    supabase
      .from("addons")
      .select("id,slug,name,description,price_cents,duration_min")
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("category", "interior")
      .order("sort_order", { ascending: true }),
    supabase.from("service_prices").select("service_id,vehicle_size,price_cents,is_from"),
    supabase.from("service_addons").select("service_id,addon_id"),
  ]);

  const err = s.error?.message ?? a.error?.message ?? p.error?.message ?? l.error?.message;
  if (err) {
    console.error("[catalogo] lettura fallita:", err);
  }

  const prices = (p.data ?? []) as PriceRow[];
  const links = (l.data ?? []) as LinkRow[];
  const services: Service[] = ((s.data ?? []) as Omit<Service, "prices" | "addonIds">[]).map((svc) => {
    const map: Service["prices"] = {};
    for (const row of prices) {
      if (row.service_id === svc.id) {
        map[row.vehicle_size] = { cents: row.price_cents, from: row.is_from };
      }
    }
    const addonIds = links.filter((x) => x.service_id === svc.id).map((x) => x.addon_id);
    return { ...svc, prices: map, addonIds };
  });

  return { services, addons: (a.data ?? []) as Addon[] };
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}