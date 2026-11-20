"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ListinoConfigurator } from "../../components/ListinoConfigurator";
import {
  VEHICLE_SIZES,
  formatDuration,
  type Addon,
  type Service,
  type VehicleSize,
} from "../../lib/catalog";

type Busy = { starts_at: string; ends_at: string };

const SLOT_STEP_MIN = 30;
const DAYS_AHEAD = 60;

// Stessi add-on nascosti della pagina pubblica
const INCLUDED_ADDONS: Record<string, string[]> = {
  "showroom-reborn": ["upgrade-lava-aspira"],
};

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lun-Ven 8-18, Sab 14-18, Dom chiuso (come la pagina pubblica)
function workingHours(d: Date): [number, number] | null {
  const day = d.getDay();
  if (day === 0) return null;
  if (day === 6) return [14, 18];
  return [8, 18];
}

function freeSlots(day: Date, durationMin: number, busy: Busy[], now: Date): Date[] {
  const hours = workingHours(day);
  if (!hours) return [];
  const open = new Date(day);
  open.setHours(hours[0], 0, 0, 0);
  const close = new Date(day);
  close.setHours(hours[1], 0, 0, 0);

  const slots: Date[] = [];
  for (
    let t = open.getTime();
    t + durationMin * 60000 <= close.getTime();
    t += SLOT_STEP_MIN * 60000
  ) {
    const start = new Date(t);
    const end = new Date(t + durationMin * 60000);
    if (start.getTime() <= now.getTime()) continue;
    const occupied = busy.some(
      (b) => start < new Date(b.ends_at) && end > new Date(b.starts_at)
    );
    if (!occupied) slots.push(start);
  }
  return slots;
}

export default function ManualBooking({ onCreated }: { onCreated: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [size, setSize] = useState<VehicleSize>("sedan");
  const [serviceId, setServiceId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dayKey, setDayKey] = useState("");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState<Busy[]>([]);
  const [busyError, setBusyError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/catalog");
        const json = (await res.json()) as { services: Service[]; addons: Addon[] };
        setServices(json.services);
        setAddons(json.addons);
        const first = json.services.find((s) => s.is_featured) ?? json.services[0];
        setServiceId(first?.id ?? "");
      } catch {
        setCatalogError("Impossibile caricare il listino.");
      }
    })();

    (async () => {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + DAYS_AHEAD + 1);
      const { data, error } = await supabase.rpc("get_busy_slots", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) setBusyError(true);
      else setBusy((data ?? []) as Busy[]);
    })();
  }, []);

  const service = services.find((s) => s.id === serviceId);

  const visibleAddons = useMemo(() => {
    const included = INCLUDED_ADDONS[service?.slug ?? ""] ?? [];
    return addons.filter((a) => !included.includes(a.slug));
  }, [addons, service?.slug]);

  const selectedIds = selected.filter((id) => visibleAddons.some((a) => a.id === id));
  const duration =
    (service?.duration_min ?? 0) +
    visibleAddons
      .filter((a) => selectedIds.includes(a.id))
      .reduce((sum, a) => sum + a.duration_min, 0);

  // Cambiando pacchetto o extra la durata cambia: l'orario scelto non vale più
  useEffect(() => {
    setSlot("");
  }, [serviceId, size, selectedIds.join(",")]);

  function toggleAddon(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  const openDays = days.filter((d) => workingHours(d) !== null);
  const selectedDay = days.find((d) => toKey(d) === dayKey);
  const slots =
    selectedDay && duration > 0 && !busyError ? freeSlots(selectedDay, duration, busy, new Date()) : [];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (!serviceId || !slot) {
      setMsg("Scegli pacchetto, data e orario.");
      return;
    }
    setSaving(true);
    const { data: bookingId, error } = await supabase.rpc("admin_create_manual_booking", {
      p_full_name: fullName,
      p_email: email || null,
      p_phone: phone,
      p_service_id: serviceId,
      p_addon_ids: selectedIds,
      p_starts_at: slot,
      p_vehicle_brand: brand,
      p_vehicle_model: model || null,
      p_vehicle_size: size,
      p_address: address,
      p_notes: notes || null,
    });
    if (error || !bookingId) {
      setSaving(false);
      setMsg(error?.message ?? "Salvataggio non riuscito.");
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
    setSaving(false);
    if (!cal.ok) {
      alert("Prenotazione salvata, ma l'evento nel calendario non è stato creato. Controlla i log di Vercel.");
    }
    onCreated();
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-semibold">Nuova prenotazione</h2>
        <p className="text-sm text-white/60">
          Stesso flusso del listino pubblico. Al salvataggio la prenotazione risulta già confermata.
        </p>
      </div>

      {catalogError && <p className="text-amber-300">{catalogError}</p>}

      {services.length > 0 && (
        <ListinoConfigurator
          services={services}
          addons={visibleAddons}
          size={size}
          onSizeChange={setSize}
          serviceId={serviceId}
          onServiceChange={setServiceId}
          selectedIds={selectedIds}
          onToggleAddon={toggleAddon}
        />
      )}

      <form onSubmit={onSubmit} className="space-y-10">
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Data e orario</h3>
          {busyError && (
            <p className="text-amber-300">Non riesco a leggere il calendario: ricarica la pagina.</p>
          )}
          {!dayKey ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {openDays.map((d) => {
                const key = toKey(d);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDayKey(key);
                      setSlot("");
                    }}
                    className="rounded-lg border border-white/15 px-2 py-3 text-sm hover:border-white/60"
                  >
                    {d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold capitalize">
                  {selectedDay?.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDayKey("");
                    setSlot("");
                  }}
                  className="text-sm text-white/70 underline"
                >
                  Cambia data
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.length === 0 && (
                  <p className="col-span-full text-white/60">
                    Nessun orario libero per questo giorno con la durata scelta ({formatDuration(duration)}).
                  </p>
                )}
                {slots.map((s) => {
                  const iso = s.toISOString();
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSlot(iso)}
                      className={`rounded-lg border px-2 py-2 text-sm ${
                        slot === iso ? "border-white bg-white/10" : "border-white/15"
                      }`}
                    >
                      {s.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <h3 className="text-xl font-semibold sm:col-span-2">Cliente e auto</h3>
          <input required placeholder="Nome e cognome" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          <input required placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          <input type="email" placeholder="Email (facoltativa)" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} sm:col-span-2`} />
          <input required placeholder="Marca auto" value={brand} onChange={(e) => setBrand(e.target.value)} className={input} />
          <input placeholder="Modello auto" value={model} onChange={(e) => setModel(e.target.value)} className={input} />
          <input required placeholder="Indirizzo del servizio (via, numero, città)" value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} sm:col-span-2`} />
          <textarea placeholder="Note (facoltative)" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input} sm:col-span-2`} rows={3} />
        </section>

        {msg && <p className="text-sm text-amber-300">{msg}</p>}

        <button
          type="submit"
          disabled={saving || !slot}
          className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva prenotazione confermata"}
        </button>
      </form>
    </div>
  );
}