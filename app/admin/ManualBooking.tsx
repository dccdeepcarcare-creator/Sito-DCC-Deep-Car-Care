"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { VEHICLE_SIZES, type VehicleSize } from "../../lib/catalog";

type Service = { id: string; name: string; category: string; is_active: boolean };
type Addon = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  duration_min: number;
  is_active: boolean;
};

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";

export default function ManualBooking({ onCreated }: { onCreated: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState<VehicleSize>("sedan");
  const [serviceId, setServiceId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("services")
        .select("id,name,category,is_active")
        .eq("is_active", true)
        .order("name");
      const { data: a } = await supabase
        .from("addons")
        .select("id,name,category,price_cents,duration_min,is_active")
        .eq("is_active", true)
        .order("name");
      setServices((s ?? []) as Service[]);
      setAddons((a ?? []) as Addon[]);
    })();
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);
  const availableAddons = addons.filter(
    (a) => selectedService !== undefined && a.category === selectedService.category
  );

  function toggleAddon(id: string) {
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (!serviceId || !startsAt) {
      setMsg("Scegli pacchetto e data.");
      return;
    }
    setBusy(true);
    const { data: bookingId, error } = await supabase.rpc("admin_create_manual_booking", {
      p_full_name: fullName,
      p_email: email || null,
      p_phone: phone,
      p_service_id: serviceId,
      p_addon_ids: addonIds,
      p_starts_at: new Date(startsAt).toISOString(),
      p_vehicle_brand: brand,
      p_vehicle_model: model || null,
      p_vehicle_size: size,
      p_address: address,
      p_notes: notes || null,
    });
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const cal = await fetch("/api/admin/calendar-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ bookingId }),
    });
    setBusy(false);
    if (!cal.ok) {
      alert("Prenotazione salvata, ma l'evento nel calendario non è stato creato. Controlla i log di Vercel.");
    }
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-white/10 p-5">
      <div>
        <h2 className="text-xl font-semibold">Nuova prenotazione</h2>
        <p className="text-sm text-white/60">
          Viene salvata già confermata, senza passare dalla conferma. Il pagamento è previsto in sede.
        </p>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-white/80">Cliente</legend>
        <input required placeholder="Nome e cognome" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        <input required placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
        <input type="email" placeholder="Email (facoltativa)" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-white/80">Auto</legend>
        <input required placeholder="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} className={input} />
        <input placeholder="Modello" value={model} onChange={(e) => setModel(e.target.value)} className={input} />
        <select value={size} onChange={(e) => setSize(e.target.value as VehicleSize)} className={input}>
          {VEHICLE_SIZES.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-white/80">Servizio</legend>
        <select
          required
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setAddonIds([]);
          }}
          className={input}
        >
          <option value="">Scegli il pacchetto</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {availableAddons.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableAddons.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                {a.name} ({formatEuro(a.price_cents)})
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-white/80">Data e luogo</legend>
        <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
        <input required placeholder="Indirizzo dell'intervento" value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        <textarea placeholder="Note (facoltative)" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input} sm:col-span-2`} rows={3} />
      </fieldset>

      {msg && <p className="text-sm text-amber-300">{msg}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
      >
        {busy ? "Salvataggio…" : "Salva prenotazione confermata"}
      </button>
    </form>
  );
}

function formatEuro(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}