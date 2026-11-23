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
};

type PriceRow = {
  service_id: string;
  vehicle_size: VehicleSize;
  price_cents: number;
  is_from: boolean;
};

type LinkRow = { service_id: string; addon_id: string };

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/60";
const btn =
  "rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/60 disabled:opacity-50";
const card = "space-y-4 rounded-2xl border border-white/10 p-5";

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

function ServiceRow({
  s,
  prices,
  onChanged,
}: {
  s: Svc;
  prices: PriceRow[];
  onChanged: () => void;
}) {
  const [name, setName] = useState(s.name);
  const [tagline, setTagline] = useState(s.tagline ?? "");
  const [duration, setDuration] = useState(String(s.duration_min));
  const [sort, setSort] = useState(String(s.sort_order));
  const [featured, setFeatured] = useState(s.is_featured);
  const [features, setFeatures] = useState((s.features ?? []).join("\n"));
  const [euro, setEuro] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const v of VEHICLE_SIZES) {
      const p = prices.find((x) => x.service_id === s.id && x.vehicle_size === v.value);
      out[v.value] = p ? String(p.price_cents / 100) : "";
    }
    return out;
  });
  const [from, setFrom] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const v of VEHICLE_SIZES) {
      const p = prices.find((x) => x.service_id === s.id && x.vehicle_size === v.value);
      out[v.value] = p?.is_from ?? false;
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Se un altro pacchetto diventa "il più scelto", questo viene aggiornato
  useEffect(() => {
    setFeatured(s.is_featured);
  }, [s.is_featured]);

  async function save() {
    setMsg(null);
    const dur = Number(duration);
    const ord = Number(sort);
    if (!name.trim() || !Number.isInteger(dur) || dur <= 0) {
      setMsg("Controlla nome e durata (in minuti).");
      return;
    }
    const cents: Record<string, number | null> = {};
    for (const v of VEHICLE_SIZES) {
      const c = toCents(euro[v.value] ?? "");
      if (c !== null && Number.isNaN(c)) {
        setMsg(`Prezzo non valido per ${v.label}.`);
        return;
      }
      cents[v.value] = c;
    }

    setBusy(true);
    if (featured) {
      const { error } = await supabase.from("services").update({ is_featured: false }).neq("id", s.id);
      if (error) {
        setBusy(false);
        setMsg(error.message);
        return;
      }
    }

    const { error } = await supabase
      .from("services")
      .update({
        name: name.trim(),
        tagline: tagline.trim() || null,
        duration_min: dur,
        sort_order: Number.isFinite(ord) ? ord : 100,
        is_featured: featured,
        features: features
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      })
      .eq("id", s.id);
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }

    for (const v of VEHICLE_SIZES) {
      const c = cents[v.value];
      const res =
        c === null
          ? await supabase
              .from("service_prices")
              .delete()
              .eq("service_id", s.id)
              .eq("vehicle_size", v.value)
          : await supabase.from("service_prices").upsert(
              {
                service_id: s.id,
                vehicle_size: v.value,
                price_cents: c,
                is_from: from[v.value] ?? false,
              },
              { onConflict: "service_id,vehicle_size" }
            );
      if (res.error) {
        setBusy(false);
        setMsg(`Prezzo ${v.label}: ${res.error.message}`);
        return;
      }
    }

    setBusy(false);
    setMsg("Salvato.");
    onChanged();
  }

  async function toggleActive() {
    setBusy(true);
    const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  return (
    <article className={card}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {s.name} {!s.is_active && <span className="text-sm text-amber-300">(disattivato)</span>}
        </p>
        <button type="button" onClick={toggleActive} disabled={busy} className={btn}>
          {s.is_active ? "Disattiva" : "Attiva"}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Descrizione breve</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Durata (minuti)</span>
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Ordine nel listino (numero più basso = prima)</span>
          <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Etichetta "Il più scelto"
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-white/70">Cosa include (una voce per riga)</span>
        <textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} className={input} />
      </label>

      <div className="space-y-2">
        <p className="text-sm text-white/70">Prezzi per categoria (lascia vuoto per "Su richiesta")</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VEHICLE_SIZES.map((v) => (
            <div key={v.value} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0">{v.label}</span>
              <input
                inputMode="decimal"
                placeholder="€"
                value={euro[v.value] ?? ""}
                onChange={(e) => setEuro({ ...euro, [v.value]: e.target.value })}
                className={input}
              />
              <label className="flex shrink-0 items-center gap-1 text-white/70">
                <input
                  type="checkbox"
                  checked={from[v.value] ?? false}
                  onChange={(e) => setFrom({ ...from, [v.value]: e.target.checked })}
                />
                da
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
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
  const [name, setName] = useState(a.name);
  const [description, setDescription] = useState(a.description ?? "");
  const [euro, setEuro] = useState(String(a.price_cents / 100));
  const [duration, setDuration] = useState(String(a.duration_min));
  const [sort, setSort] = useState(String(a.sort_order));
  const [picked, setPicked] = useState<string[]>(linked);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function togglePicked(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setMsg(null);
    const cents = toCents(euro);
    const dur = Number(duration);
    if (!name.trim()) {
      setMsg("Inserisci il nome.");
      return;
    }
    if (cents === null || Number.isNaN(cents)) {
      setMsg("Prezzo non valido.");
      return;
    }
    if (!Number.isInteger(dur) || dur < 0) {
      setMsg("Durata non valida.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("addons")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        price_cents: cents,
        duration_min: dur,
        sort_order: Number(sort) || 100,
      })
      .eq("id", a.id);
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }

    const { error: delErr } = await supabase.from("service_addons").delete().eq("addon_id", a.id);
    if (delErr) {
      setBusy(false);
      setMsg(delErr.message);
      return;
    }
    if (picked.length > 0) {
      const { error: insErr } = await supabase
        .from("service_addons")
        .insert(picked.map((sid) => ({ service_id: sid, addon_id: a.id })));
      if (insErr) {
        setBusy(false);
        setMsg(insErr.message);
        return;
      }
    }

    setBusy(false);
    setMsg("Salvato.");
    onChanged();
  }

  async function toggleActive() {
    setBusy(true);
    const { error } = await supabase.from("addons").update({ is_active: !a.is_active }).eq("id", a.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else onChanged();
  }

  return (
    <article className={card}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {a.name} {!a.is_active && <span className="text-sm text-amber-300">(disattivato)</span>}
        </p>
        <button type="button" onClick={toggleActive} disabled={busy} className={btn}>
          {a.is_active ? "Disattiva" : "Attiva"}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Descrizione</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Prezzo (€)</span>
          <input inputMode="decimal" value={euro} onChange={(e) => setEuro(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Minuti aggiunti</span>
          <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Ordine nel listino</span>
          <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className={input} />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/70">Disponibile per questi pacchetti:</p>
          <button type="button" onClick={() => setPicked(services.map((s) => s.id))} className="text-xs text-white/70 underline">
            Tutti
          </button>
          <button type="button" onClick={() => setPicked([])} className="text-xs text-white/70 underline">
            Nessuno
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={picked.includes(s.id)} onChange={() => togglePicked(s.id)} />
              {s.name} {!s.is_active && <span className="text-amber-300">(disattivato)</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? "Salvataggio…" : "Salva extra"}
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
  const [newService, setNewService] = useState("");
  const [newAddon, setNewAddon] = useState({ name: "", euro: "", duration: "0" });

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

  async function addService() {
    if (!newService.trim()) return;
    const { error } = await supabase.from("services").insert({
      slug: slugify(newService),
      name: newService.trim(),
      tagline: null,
      description: null,
      features: [],
      duration_min: 60,
      is_featured: false,
      is_active: true,
      category: "interior",
      sort_order: 100,
    });
    if (error) setError(error.message);
    else {
      setNewService("");
      load();
    }
  }

  async function addAddon() {
    const cents = toCents(newAddon.euro);
    if (!newAddon.name.trim() || cents === null || Number.isNaN(cents)) {
      setError("Per un nuovo extra servono nome e prezzo.");
      return;
    }
    const { data, error } = await supabase
      .from("addons")
      .insert({
        slug: slugify(newAddon.name),
        name: newAddon.name.trim(),
        description: null,
        price_cents: cents,
        duration_min: Number(newAddon.duration) || 0,
        is_active: true,
        category: "interior",
        sort_order: 100,
      })
      .select("id")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Extra non creato.");
      return;
    }
    // Nuovo extra: disponibile per tutti i pacchetti; puoi cambiarlo nella sua scheda
    if (services.length > 0) {
      const { error: linkErr } = await supabase
        .from("service_addons")
        .insert(services.map((s) => ({ service_id: s.id, addon_id: data.id })));
      if (linkErr) {
        setError(linkErr.message);
        return;
      }
    }
    setNewAddon({ name: "", euro: "", duration: "0" });
    load();
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-semibold">Listino</h2>
        <p className="text-sm text-white/60">
          Le modifiche vanno subito sul sito. Per i prezzi già prenotati non cambia nulla.
        </p>
      </div>

      {error && <p className="text-amber-300">{error}</p>}

      <section className="space-y-6">
        <h3 className="text-xl font-semibold">Pacchetti</h3>
        {services.map((s) => (
          <ServiceRow key={s.id} s={s} prices={prices} onChanged={load} />
        ))}
        <div className={`${card} flex flex-wrap items-end gap-3`}>
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-white/70">Nuovo pacchetto</span>
            <input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Nome del pacchetto" className={input} />
          </label>
          <button type="button" onClick={addService} className={btn}>
            Aggiungi pacchetto
          </button>
        </div>
        <p className="text-sm text-white/50">
          Un pacchetto nuovo non ha extra finché non li selezioni nella scheda di ciascun extra.
        </p>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-semibold">Extra</h3>
        {addons.map((a) => (
          <AddonRow
            key={a.id}
            a={a}
            services={services}
            linked={links.filter((l) => l.addon_id === a.id).map((l) => l.service_id)}
            onChanged={load}
          />
        ))}
        <div className={`${card} grid gap-3 sm:grid-cols-4 sm:items-end`}>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-white/70">Nuovo extra</span>
            <input value={newAddon.name} onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })} placeholder="Nome dell'extra" className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Prezzo (€)</span>
            <input inputMode="decimal" value={newAddon.euro} onChange={(e) => setNewAddon({ ...newAddon, euro: e.target.value })} className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Minuti aggiunti</span>
            <input type="number" min={0} value={newAddon.duration} onChange={(e) => setNewAddon({ ...newAddon, duration: e.target.value })} className={input} />
          </label>
          <button type="button" onClick={addAddon} className={`${btn} sm:col-span-4 sm:justify-self-start`}>
            Aggiungi extra
          </button>
        </div>
      </section>
    </div>
  );
}