"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { VEHICLE_SIZES, type VehicleSize } from "../../lib/catalog";

type Svc = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  duration_min: number;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[] | null;
  deleted_at: string | null;
};

type Ad = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_min: number;
  is_active: boolean;
  sort_order: number;
  deleted_at: string | null;
};

type PriceRow = { service_id: string; vehicle_size: VehicleSize; price_cents: number; is_from: boolean };
type LinkRow = { service_id: string; addon_id: string };
type Filter = "attivi" | "disattivati" | "eliminati" | "tutti";

type SvcDraft = {
  name: string;
  tagline: string;
  duration: string;
  sort: string;
  featured: boolean;
  features: string;
  euro: Record<string, string>;
  from: Record<string, boolean>;
};

type AddDraft = {
  name: string;
  description: string;
  euro: string;
  duration: string;
  sort: string;
  picked: string[];
};

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/60";
const btn = "rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/60 disabled:opacity-50";
const btnSolid =
  "rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50";
const card = "space-y-4 rounded-2xl border border-white/10 p-5";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "attivi", label: "Attivi" },
  { value: "disattivati", label: "Disattivati" },
  { value: "eliminati", label: "Eliminati" },
  { value: "tutti", label: "Tutti" },
];

function matches(item: { is_active: boolean; deleted_at: string | null }, f: Filter) {
  if (f === "tutti") return true;
  if (f === "eliminati") return item.deleted_at !== null;
  if (item.deleted_at !== null) return false;
  return f === "attivi" ? item.is_active : !item.is_active;
}

function slugify(text: string) {
  const base =
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "voce";
  return `${base}-${Date.now().toString(36)}`;
}

// null = campo vuoto, NaN = valore non valido
function toCents(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

function FilterBar({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`rounded-full border px-4 py-2 text-sm ${
            value === f.value ? "border-white bg-white/10" : "border-white/15"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function svcDraftFrom(s: Svc | null, prices: PriceRow[]): SvcDraft {
  const euro: Record<string, string> = {};
  const from: Record<string, boolean> = {};
  for (const v of VEHICLE_SIZES) {
    const p = s ? prices.find((x) => x.service_id === s.id && x.vehicle_size === v.value) : undefined;
    euro[v.value] = p ? String(p.price_cents / 100) : "";
    from[v.value] = p?.is_from ?? false;
  }
  return {
    name: s?.name ?? "",
    tagline: s?.tagline ?? "",
    duration: s ? String(s.duration_min) : "60",
    sort: s ? String(s.sort_order) : "100",
    featured: s?.is_featured ?? false,
    features: (s?.features ?? []).join("\n"),
    euro,
    from,
  };
}

function addDraftFrom(a: Ad | null, linked: string[]): AddDraft {
  return {
    name: a?.name ?? "",
    description: a?.description ?? "",
    euro: a ? String(a.price_cents / 100) : "",
    duration: a ? String(a.duration_min) : "0",
    sort: a ? String(a.sort_order) : "100",
    picked: linked,
  };
}

// Salva un pacchetto (nuovo se id è null). Restituisce un messaggio di errore oppure null.
async function persistService(id: string | null, d: SvcDraft): Promise<string | null> {
  const dur = Number(d.duration);
  if (!d.name.trim() || !Number.isInteger(dur) || dur <= 0) {
    return "Controlla nome e durata (in minuti).";
  }
  for (const v of VEHICLE_SIZES) {
    const c = toCents(d.euro[v.value] ?? "");
    if (c !== null && Number.isNaN(c)) return `Prezzo non valido per ${v.label}.`;
  }

  if (d.featured) {
    const { error } = await supabase.from("services").update({ is_featured: false }).eq("is_featured", true);
    if (error) return error.message;
  }

  const payload = {
    name: d.name.trim(),
    tagline: d.tagline.trim() || null,
    duration_min: dur,
    sort_order: Number(d.sort) || 100,
    is_featured: d.featured,
    features: d.features
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
  };

  let serviceId = id;
  if (id) {
    const { error } = await supabase.from("services").update(payload).eq("id", id);
    if (error) return error.message;
  } else {
    const { data, error } = await supabase
      .from("services")
      .insert({
        ...payload,
        slug: slugify(d.name),
        description: null,
        is_active: true,
        category: "interior",
        deleted_at: null,
      })
      .select("id")
      .single();
    if (error || !data) return error?.message ?? "Pacchetto non creato.";
    serviceId = data.id;
  }

  for (const v of VEHICLE_SIZES) {
    const c = toCents(d.euro[v.value] ?? "");
    const res =
      c === null
        ? await supabase.from("service_prices").delete().eq("service_id", serviceId).eq("vehicle_size", v.value)
        : await supabase.from("service_prices").upsert(
            {
              service_id: serviceId,
              vehicle_size: v.value,
              price_cents: c,
              is_from: d.from[v.value] ?? false,
            },
            { onConflict: "service_id,vehicle_size" }
          );
    if (res.error) return `Prezzo ${v.label}: ${res.error.message}`;
  }
  return null;
}

// Salva un extra (nuovo se id è null) e i pacchetti compatibili.
async function persistAddon(id: string | null, d: AddDraft): Promise<string | null> {
  const cents = toCents(d.euro);
  const dur = Number(d.duration);
  if (!d.name.trim()) return "Inserisci il nome.";
  if (cents === null || Number.isNaN(cents)) return "Prezzo non valido.";
  if (!Number.isInteger(dur) || dur < 0) return "Durata non valida.";

  const payload = {
    name: d.name.trim(),
    description: d.description.trim() || null,
    price_cents: cents,
    duration_min: dur,
    sort_order: Number(d.sort) || 100,
  };

  let addonId = id;
  if (id) {
    const { error } = await supabase.from("addons").update(payload).eq("id", id);
    if (error) return error.message;
  } else {
    const { data, error } = await supabase
      .from("addons")
      .insert({
        ...payload,
        slug: slugify(d.name),
        is_active: true,
        category: "interior",
        deleted_at: null,
      })
      .select("id")
      .single();
    if (error || !data) return error?.message ?? "Extra non creato.";
    addonId = data.id;
  }

  const { error: delErr } = await supabase.from("service_addons").delete().eq("addon_id", addonId);
  if (delErr) return delErr.message;
  if (d.picked.length > 0) {
    const { error: insErr } = await supabase
      .from("service_addons")
      .insert(d.picked.map((sid) => ({ service_id: sid, addon_id: addonId })));
    if (insErr) return insErr.message;
  }
  return null;
}

function ServiceFields({ d, set }: { d: SvcDraft; set: (p: Partial<SvcDraft>) => void }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Nome</span>
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Descrizione breve</span>
          <input value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Durata (minuti)</span>
          <input type="number" min={1} value={d.duration} onChange={(e) => set({ duration: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Ordine nel listino (numero più basso = prima)</span>
          <input type="number" value={d.sort} onChange={(e) => set({ sort: e.target.value })} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.featured} onChange={(e) => set({ featured: e.target.checked })} />
          Etichetta &quot;Il più scelto&quot;
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-white/70">Cosa include (una voce per riga)</span>
        <textarea rows={4} value={d.features} onChange={(e) => set({ features: e.target.value })} className={input} />
      </label>

      <div className="space-y-2">
        <p className="text-sm text-white/70">Prezzi per categoria (lascia vuoto per &quot;Su richiesta&quot;)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VEHICLE_SIZES.map((v) => (
            <div key={v.value} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0">{v.label}</span>
              <input
                inputMode="decimal"
                placeholder="€"
                value={d.euro[v.value] ?? ""}
                onChange={(e) => set({ euro: { ...d.euro, [v.value]: e.target.value } })}
                className={input}
              />
              <label className="flex shrink-0 items-center gap-1 text-white/70">
                <input
                  type="checkbox"
                  checked={d.from[v.value] ?? false}
                  onChange={(e) => set({ from: { ...d.from, [v.value]: e.target.checked } })}
                />
                da
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AddonFields({
  d,
  set,
  services,
}: {
  d: AddDraft;
  set: (p: Partial<AddDraft>) => void;
  services: Svc[];
}) {
  function toggle(id: string) {
    set({ picked: d.picked.includes(id) ? d.picked.filter((x) => x !== id) : [...d.picked, id] });
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Nome</span>
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Descrizione</span>
          <input value={d.description} onChange={(e) => set({ description: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Prezzo (€)</span>
          <input inputMode="decimal" value={d.euro} onChange={(e) => set({ euro: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Minuti aggiunti</span>
          <input type="number" min={0} value={d.duration} onChange={(e) => set({ duration: e.target.value })} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Ordine nel listino</span>
          <input type="number" value={d.sort} onChange={(e) => set({ sort: e.target.value })} className={input} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/70">Disponibile per questi pacchetti:</p>
          <button type="button" onClick={() => set({ picked: services.map((s) => s.id) })} className="text-xs text-white/70 underline">
            Tutti
          </button>
          <button type="button" onClick={() => set({ picked: [] })} className="text-xs text-white/70 underline">
            Nessuno
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.picked.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.name} {s.deleted_at ? <span className="text-amber-300">(eliminato)</span> : !s.is_active && <span className="text-amber-300">(disattivato)</span>}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function ServiceRow({ s, prices, onChanged }: { s: Svc; prices: PriceRow[]; onChanged: () => void }) {
  const [d, setD] = useState<SvcDraft>(() => svcDraftFrom(s, prices));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setD((prev) => ({ ...prev, featured: s.is_featured }));
  }, [s.is_featured]);

  function set(p: Partial<SvcDraft>) {
    setD((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const err = await persistService(s.id, d);
    setBusy(false);
    if (err) setMsg(err);
    else {
      setMsg("Salvato.");
      onChanged();
    }
  }

  async function setActive(active: boolean) {
    setBusy(true);
    const { error } = await supabase.from("services").update({ is_active: active }).eq("id", s.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  async function setDeleted(deleted: boolean) {
    if (deleted && !window.confirm(`Eliminare "${s.name}"? Potrai ripristinarlo dal filtro Eliminati.`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("services")
      .update({ deleted_at: deleted ? new Date().toISOString() : null, is_active: false })
      .eq("id", s.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  const label = s.deleted_at ? "(eliminato)" : !s.is_active ? "(disattivato)" : "";

  return (
    <article className={card}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {s.name} {label && <span className="text-sm text-amber-300">{label}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {s.deleted_at ? (
            <button type="button" onClick={() => setDeleted(false)} disabled={busy} className={btn}>
              Ripristina
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setActive(!s.is_active)} disabled={busy} className={btn}>
                {s.is_active ? "Disattiva" : "Attiva"}
              </button>
              <button type="button" onClick={() => setDeleted(true)} disabled={busy} className={btn}>
                Elimina
              </button>
            </>
          )}
        </div>
      </header>

      <ServiceFields d={d} set={set} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className={btnSolid}>
          {busy ? "Salvataggio…" : "Salva pacchetto"}
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
    </article>
  );
}

function AddonRow({
  a,
  services,
  linked,
  onChanged,
}: {
  a: Ad;
  services: Svc[];
  linked: string[];
  onChanged: () => void;
}) {
  const [d, setD] = useState<AddDraft>(() => addDraftFrom(a, linked));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(p: Partial<AddDraft>) {
    setD((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const err = await persistAddon(a.id, d);
    setBusy(false);
    if (err) setMsg(err);
    else {
      setMsg("Salvato.");
      onChanged();
    }
  }

  async function setActive(active: boolean) {
    setBusy(true);
    const { error } = await supabase.from("addons").update({ is_active: active }).eq("id", a.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  async function setDeleted(deleted: boolean) {
    if (deleted && !window.confirm(`Eliminare "${a.name}"? Potrai ripristinarlo dal filtro Eliminati.`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("addons")
      .update({ deleted_at: deleted ? new Date().toISOString() : null, is_active: false })
      .eq("id", a.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  const label = a.deleted_at ? "(eliminato)" : !a.is_active ? "(disattivato)" : "";

  return (
    <article className={card}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {a.name} {label && <span className="text-sm text-amber-300">{label}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {a.deleted_at ? (
            <button type="button" onClick={() => setDeleted(false)} disabled={busy} className={btn}>
              Ripristina
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setActive(!a.is_active)} disabled={busy} className={btn}>
                {a.is_active ? "Disattiva" : "Attiva"}
              </button>
              <button type="button" onClick={() => setDeleted(true)} disabled={busy} className={btn}>
                Elimina
              </button>
            </>
          )}
        </div>
      </header>

      <AddonFields d={d} set={set} services={services} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className={btnSolid}>
          {busy ? "Salvataggio…" : "Salva extra"}
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
    </article>
  );
}

function NewServiceForm({ onCreated }: { onCreated: () => void }) {
  const [d, setD] = useState<SvcDraft>(() => svcDraftFrom(null, []));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(p: Partial<SvcDraft>) {
    setD((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const err = await persistService(null, d);
    setBusy(false);
    if (err) setMsg(err);
    else onCreated();
  }

  return (
    <article className={`${card} border-white/30`}>
      <p className="font-semibold">Nuovo pacchetto</p>
      <ServiceFields d={d} set={set} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className={btnSolid}>
          {busy ? "Creazione…" : "Crea e pubblica pacchetto"}
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
    </article>
  );
}

function NewAddonForm({ services, onCreated }: { services: Svc[]; onCreated: () => void }) {
  const [d, setD] = useState<AddDraft>(() => ({
    ...addDraftFrom(null, []),
    picked: services.map((s) => s.id),
  }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(p: Partial<AddDraft>) {
    setD((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const err = await persistAddon(null, d);
    setBusy(false);
    if (err) setMsg(err);
    else onCreated();
  }

  return (
    <article className={`${card} border-white/30`}>
      <p className="font-semibold">Nuovo extra</p>
      <AddonFields d={d} set={set} services={services} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className={btnSolid}>
          {busy ? "Creazione…" : "Crea e pubblica extra"}
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
    </article>
  );
}

export default function CatalogEditor() {
  const [services, setServices] = useState<Svc[]>([]);
  const [addons, setAddons] = useState<Ad[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [svcFilter, setSvcFilter] = useState<Filter>("attivi");
  const [addFilter, setAddFilter] = useState<Filter>("attivi");
  const [showNewSvc, setShowNewSvc] = useState(false);
  const [showNewAdd, setShowNewAdd] = useState(false);

  const load = useCallback(async () => {
    const [s, a, p, l] = await Promise.all([
      supabase.from("services").select("*").eq("category", "interior").order("sort_order"),
      supabase.from("addons").select("*").eq("category", "interior").order("sort_order"),
      supabase.from("service_prices").select("*"),
      supabase.from("service_addons").select("service_id,addon_id"),
    ]);
    const err = s.error?.message ?? a.error?.message ?? p.error?.message ?? l.error?.message;
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setServices((s.data ?? []) as Svc[]);
    setAddons((a.data ?? []) as Ad[]);
    setPrices((p.data ?? []) as PriceRow[]);
    setLinks((l.data ?? []) as LinkRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleServices = services.filter((s) => matches(s, svcFilter));
  const visibleAddons = addons.filter((a) => matches(a, addFilter));

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-semibold">Listino</h2>
        <p className="text-sm text-white/60">
          Le modifiche vanno subito sul sito. I prezzi già prenotati non cambiano. Gli elementi eliminati
          restano nello storico e si possono ripristinare.
        </p>
      </div>

      {error && <p className="text-amber-300">{error}</p>}

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Pacchetti</h3>
          <button type="button" onClick={() => setShowNewSvc((v) => !v)} className={btnSolid}>
            {showNewSvc ? "Chiudi" : "+ Nuovo pacchetto"}
          </button>
        </div>
        <FilterBar value={svcFilter} onChange={setSvcFilter} />

        {showNewSvc && (
          <NewServiceForm
            onCreated={() => {
              setShowNewSvc(false);
              load();
            }}
          />
        )}

        {visibleServices.length === 0 && <p className="text-white/60">Nessun pacchetto in questo filtro.</p>}
        {visibleServices.map((s) => (
          <ServiceRow key={s.id} s={s} prices={prices} onChanged={load} />
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Extra</h3>
          <button type="button" onClick={() => setShowNewAdd((v) => !v)} className={btnSolid}>
            {showNewAdd ? "Chiudi" : "+ Nuovo extra"}
          </button>
        </div>
        <FilterBar value={addFilter} onChange={setAddFilter} />

        {showNewAdd && (
          <NewAddonForm
            services={services}
            onCreated={() => {
              setShowNewAdd(false);
              load();
            }}
          />
        )}

        {visibleAddons.length === 0 && <p className="text-white/60">Nessun extra in questo filtro.</p>}
        {visibleAddons.map((a) => (
          <AddonRow
            key={a.id}
            a={a}
            services={services}
            linked={links.filter((l) => l.addon_id === a.id).map((l) => l.service_id)}
            onChanged={load}
          />
        ))}
      </section>
    </div>
  );
}