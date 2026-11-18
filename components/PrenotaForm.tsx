"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import {
  VEHICLE_SIZES,
  formatDuration,
  formatEuro,
  type Addon,
  type Service,
  type VehicleSize,
} from "../lib/catalog";

type Busy = { starts_at: string; ends_at: string };
type Props = {
  services: Service[];
  addons: Addon[];
  initial: { servizio?: string; categoria?: string; addon?: string };
};

const SLOT_STEP_MIN = 30;
const DAYS_AHEAD = 21;
const MAX_PHOTOS = 10;
const MAX_PHOTO_MB = 10;

// Add-on già compresi nel pacchetto: non vengono mostrati come extra
const INCLUDED_ADDONS: Record<string, string[]> = {
  "showroom-reborn": ["upgrade-lava-aspira"],
};

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

// Accetta cellulari italiani (3xx...) e fissi (0...), con o senza +39
function isValidPhone(value: string) {
  const digits = value.replace(/[\s.\-()]/g, "").replace(/^(\+39|0039)/, "");
  return /^(3\d{8,9}|0\d{5,10})$/.test(digits);
}

// Lun-Ven 8-18, Sab 14-18, Dom chiuso
function workingHours(d: Date): [number, number] | null {
  const day = d.getDay();
  if (day === 0) return null;
  if (day === 6) return [14, 18];
  return [8, 18];
}

type BusyRow = { starts_at: string; ends_at: string };

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

export default function PrenotaForm({ services, addons, initial }: Props) {
  const initialService = services.find((s) => s.slug === initial.servizio) ?? services[0];
  const initialSize: VehicleSize =
    VEHICLE_SIZES.find((v) => v.value === initial.categoria)?.value ?? "sedan";
  const initialAddonIds = (initial.addon ?? "")
    .split(",")
    .map((slug) => addons.find((a) => a.slug === slug.trim())?.id)
    .filter((id): id is string => Boolean(id));

  const days = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [serviceId, setServiceId] = useState(initialService?.id ?? "");
  const [size, setSize] = useState<VehicleSize>(initialSize);
  const [addonIds, setAddonIds] = useState<string[]>(initialAddonIds);
  const [dayKey, setDayKey] = useState("");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState<Busy[]>([]);
  const [calendarError, setCalendarError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const includedSlugs = INCLUDED_ADDONS[service?.slug ?? ""] ?? [];
  const visibleAddons = addons.filter((a) => !includedSlugs.includes(a.slug));
  const selectedAddonIds = addonIds.filter((id) => visibleAddons.some((a) => a.id === id));
  const chosenAddons = visibleAddons.filter((a) => selectedAddonIds.includes(a.id));
  const duration =
    (service?.duration_min ?? 0) + chosenAddons.reduce((sum, a) => sum + a.duration_min, 0);
  const servicePrice = service?.prices[size];
  const estimate =
    (servicePrice?.cents ?? 0) + chosenAddons.reduce((sum, a) => sum + a.price_cents, 0);

  const selectedDay = days.find((d) => toKey(d) === dayKey);
  const slots = selectedDay && duration > 0 ? freeSlots(selectedDay, duration, busy, new Date()) : [];
  const openDays = days.filter((d) => workingHours(d) !== null);

  useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + DAYS_AHEAD + 1);
    supabase
      .rpc("get_busy_slots", { p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data, error }) => {
        if (error) setCalendarError(true);
        else setBusy((data ?? []) as BusyRow[]);
      });
  }, []);

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSlot("");
  }

  function onFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).slice(0, MAX_PHOTOS);
    const tooBig = picked.find((f) => f.size > MAX_PHOTO_MB * 1024 * 1024);
    if (tooBig) {
      setError(`La foto "${tooBig.name}" supera ${MAX_PHOTO_MB} MB.`);
      setFiles([]);
      return;
    }
    setError(null);
    setFiles(picked);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (calendarError) return;
    if (!serviceId || !slot) {
      setError("Scegli il servizio e un orario libero.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Controlla l'email: sembra non corretta.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Controlla il numero di telefono: serve un cellulare o un fisso italiano.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: bookingId, error: bookingError } = await supabase.rpc("create_guest_booking", {
      p_full_name: fullName,
      p_email: email,
      p_phone: phone,
      p_service_id: serviceId,
      p_addon_ids: selectedAddonIds,
      p_starts_at: slot,
      p_payment_method: "on_site",
      p_vehicle_brand: brand,
      p_vehicle_model: model,
      p_vehicle_size: size,
      p_address: address,
      p_notes: notes || null,
    });

    if (bookingError || !bookingId) {
      setError(bookingError?.message ?? "Prenotazione non riuscita, riprova.");
      setLoading(false);
      return;
    }

    let photoErrors = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${bookingId}/${Date.now()}-${i}-${safeName}`;
      const up = await supabase.storage
        .from("booking-photos")
        .upload(path, file, { contentType: file.type });
      if (up.error) {
        photoErrors++;
        continue;
      }
      const link = await supabase.rpc("add_booking_photo", {
        p_booking_id: bookingId,
        p_path: path,
      });
      if (link.error) photoErrors++;
    }

    setLoading(false);
    if (photoErrors > 0) {
      setError(
        `Richiesta inviata, ma ${photoErrors} foto non sono state caricate. Puoi mandarle a noi via email o WhatsApp.`
      );
    }

    const chosen = addons.filter((a) => selectedAddonIds.includes(a.id));
    fetch("/api/notifica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fullName,
        email,
        telefono: phone,
        marca: brand,
        modello: model,
        indirizzo: address,
        servizio: service?.name ?? "",
        categoria: VEHICLE_SIZES.find((v) => v.value === size)?.label ?? size,
        extra: chosen.map((a) => a.name),
        durataMin: duration,
        prezzo: servicePrice ? formatEuro(estimate) : "su preventivo",
        dataOra: new Date(slot).toLocaleString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: notes,
        foto: files.length,
      }),
    }).catch(() => undefined);

    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-white/10 p-8">
        <h2 className="text-2xl font-semibold">Richiesta inviata</h2>
        <p className="mt-3 text-white/70">
          Grazie, abbiamo ricevuto la tua richiesta. Il nostro team ti contatterà al più presto
          via WhatsApp, email o telefono per confermare l&apos;appuntamento e il prezzo definitivo.
        </p>
        {error && <p className="mt-4 text-amber-300">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* 1. Servizio */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Servizio</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <label
              key={s.id}
              className={`cursor-pointer rounded-xl border p-4 ${
                serviceId === s.id ? "border-white bg-white/10" : "border-white/15"
              }`}
            >
              <input
                type="radio"
                name="servizio"
                value={s.id}
                checked={serviceId === s.id}
                onChange={() => {
                  setServiceId(s.id);
                  setSlot("");
                }}
                className="sr-only"
              />
              <span className="font-semibold">{s.name}</span>
              <span className="block text-sm text-white/60">{formatDuration(s.duration_min)}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 2. Auto e add-on */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Auto e extra</h2>
        <label className="block space-y-2">
          <span className="text-sm text-white/70">Categoria auto</span>
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value as VehicleSize);
              setSlot("");
            }}
            className={input}
          >
            {VEHICLE_SIZES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} ({v.example})
              </option>
            ))}
          </select>
        </label>

        {visibleAddons.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-white/70">Extra (facoltativi)</span>
            {visibleAddons.map((a) => (
              <label key={a.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                <input
                  type="checkbox"
                  checked={selectedAddonIds.includes(a.id)}
                  onChange={() => toggleAddon(a.id)}
                />
                <span className="flex-1">{a.name}</span>
                <span className="text-sm text-white/60">
                  +{formatEuro(a.price_cents)} · {formatDuration(a.duration_min)}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-white/5 p-4 text-sm">
          <p>
            Durata stimata: <strong>{formatDuration(duration)}</strong>
          </p>
          <p>
            Prezzo indicativo:{" "}
            <strong>{servicePrice ? formatEuro(estimate) : "su preventivo"}</strong>
          </p>
          <p className="mt-2 text-white/60">
            Eventuale trasferta fuori zona e sovrapprezzo per lo stato dell&apos;auto vengono
            confermati da noi prima dell&apos;appuntamento.
          </p>
        </div>
      </section>

      {/* 3. Data e orario */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Data e orario</h2>

        {!dayKey ? (
          <>
            <p className="text-sm text-white/60">
              Lun-Ven 8:00-18:00, Sab 14:00-18:00. Domenica chiuso. Scegli un giorno.
            </p>
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
          </>
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

            {duration === 0 ? (
              <p className="text-white/60">Scegli prima un servizio.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.length === 0 && (
                  <p className="col-span-full text-white/60">Nessun orario libero per questo giorno.</p>
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
            )}
          </>
        )}
      </section>

      {/* 4. Dati */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. I tuoi dati</h2>
        <p className="text-sm text-white/60">
          Il servizio a domicilio è a Cesena, Forlì e Ravenna, entro 15 km dalla città più vicina.
          Fuori da quest&apos;area la trasferta viene confermata da noi prima dell&apos;appuntamento.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="Nome e cognome" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          <input required type="tel" placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} sm:col-span-2`} />
          <input required placeholder="Marca auto" value={brand} onChange={(e) => setBrand(e.target.value)} className={input} />
          <input required placeholder="Modello auto" value={model} onChange={(e) => setModel(e.target.value)} className={input} />
          <input required placeholder="Indirizzo del servizio a domicilio (via, numero, città)" value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} sm:col-span-2`} />
          <textarea placeholder="Note (facoltative)" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input} sm:col-span-2`} rows={3} />
        </div>
      </section>

      {/* 5. Foto */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Foto degli interni (consigliate)</h2>
        <p className="text-sm text-white/60">
          Fino a {MAX_PHOTOS} foto, ciascuna max {MAX_PHOTO_MB} MB. Servono per valutare lo stato
          dell&apos;auto e il prezzo definitivo.
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="block w-full text-sm text-white/70"
        />
        {files.length > 0 && <p className="text-sm text-white/60">{files.length} foto selezionate</p>}
      </section>

      {calendarError && (
        <p className="text-amber-300">
          Il calendario non è disponibile in questo momento. Riprova tra poco o contattaci su WhatsApp.
        </p>
      )}
      {error && <p className="text-amber-300">{error}</p>}

      <button
        type="submit"
        disabled={loading || calendarError}
        className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
      >
        {loading ? "Invio in corso…" : "Invia richiesta"}
      </button>
      <p className="text-center text-sm text-white/50">
        Nessun pagamento ora. Confermiamo la richiesta e ti indichiamo l&apos;acconto da versare.
      </p>
    </form>
  );
}