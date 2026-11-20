"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { VEHICLE_SIZES, formatEuro, type VehicleSize } from "../../lib/catalog";

type Tab = "pending" | "confirmed" | "cancelled";

type Booking = {
  id: string;
  starts_at: string;
  status: string;
  vehicle_size: VehicleSize;
  service_price_cents: number;
  admin_surcharge_cents: number;
  surcharge_reason: string | null;
  admin_note: string | null;
  total_cents: number;
  location_address: string | null;
  customer_notes: string | null;
  travel_fee_cents: number;
  service: { name: string } | null;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null;
};

type CalEvent = {
  id: string;
  summary: string;
  location: string;
  description: string;
  start: string;
  end: string;
};

const SELECT = `
  id, starts_at, status, vehicle_size, service_price_cents, admin_surcharge_cents,
  surcharge_reason, admin_note, total_cents, location_address, customer_notes, travel_fee_cents,
  service:services(name),
  profile:profiles(full_name,email,phone),
  vehicle:vehicles(brand,model,plate)
`;

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";

const btnTab = (active: boolean) =>
  `rounded-full border px-4 py-2 text-sm ${active ? "border-white bg-white/10" : "border-white/15"}`;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function whatsappUrl(b: Booking) {
  const digits = (b.profile?.phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("39") ? digits : `39${digits}`;
  const category = VEHICLE_SIZES.find((v) => v.value === b.vehicle_size)?.label ?? b.vehicle_size;
  const surcharge =
    b.admin_surcharge_cents > 0
      ? ` Il totale include un sovrapprezzo di ${formatEuro(b.admin_surcharge_cents)}${
          b.surcharge_reason ? ` (${b.surcharge_reason})` : ""
        }.`
      : "";
  const text =
    `Ciao ${b.profile?.full_name ?? ""}, la tua prenotazione presso DCC Deep Car Care è confermata per il ${fmt(b.starts_at)}. ` +
    `Servizio: ${b.service?.name ?? ""}. Categoria: ${category}. Totale finale: ${formatEuro(b.total_cents)}.${surcharge} ` +
    `Indirizzo: ${b.location_address ?? ""}. A presto!`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function startOfWeek(d: Date) {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function BookingCard({ b, onDone }: { b: Booking; onDone: (next: Tab) => void }) {
  const [size, setSize] = useState<VehicleSize>(b.vehicle_size);
  const [surchargeEuro, setSurchargeEuro] = useState(0);
  const [reason, setReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("booking_photos")
        .select("storage_path")
        .eq("booking_id", b.id);
      const urls: string[] = [];
      for (const p of data ?? []) {
        const { data: signed } = await supabase.storage
          .from("booking-photos")
          .createSignedUrl(p.storage_path, 3600);
        if (signed?.signedUrl) urls.push(signed.signedUrl);
      }
      if (!cancelled) setPhotos(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [b.id]);

  async function confirm() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_confirm_booking", {
      p_booking_id: b.id,
      p_vehicle_size: size,
      p_surcharge_cents: Math.round(surchargeEuro * 100),
      p_surcharge_reason: reason || null,
    });
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }

    const headers = await authHeaders();
    const cal = await fetch("/api/admin/calendar-sync", {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId: b.id }),
    });
    const mail = await fetch("/api/admin/notify-booking", {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId: b.id }),
    });
    setBusy(false);
    if (!cal.ok) {
      alert("Prenotazione confermata, ma l'evento nel calendario non è stato creato. Controlla i log di Vercel.");
    }
    if (!mail.ok) {
      alert("Prenotazione confermata, ma l'email al cliente non è stata inviata.");
    }
    onDone("confirmed");
  }

  async function reject() {
    if (!window.confirm("Sei sicuro di voler rifiutare questa prenotazione?")) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_reject_booking", {
      p_booking_id: b.id,
      p_reason: rejectReason || null,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else onDone("cancelled");
  }

  const addressLink = b.location_address ? (
    <a
      href={mapsUrl(b.location_address)}
      target="_blank"
      rel="noreferrer"
      className="text-sky-300 underline"
    >
      {b.location_address}
    </a>
  ) : (
    <span>-</span>
  );

  const wa = whatsappUrl(b);

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 text-sm">
          <p className="font-semibold">
            {b.service?.name} · {fmt(b.starts_at)}
          </p>
          <p className="text-white/70">
            {b.profile?.full_name} · {b.profile?.phone} · {b.profile?.email}
          </p>
          <p className="text-white/70">
            {b.vehicle?.brand} {b.vehicle?.model} {b.vehicle?.plate ? `· ${b.vehicle.plate}` : ""}
          </p>
          <p className="text-white/70">Indirizzo: {addressLink}</p>
          {b.customer_notes && <p className="text-white/70">Note: {b.customer_notes}</p>}
        </div>
        <div className="text-right text-sm">
          <p>
            Totale: <strong>{formatEuro(b.total_cents)}</strong>
          </p>
          <p className="text-white/60">Trasferta: {formatEuro(b.travel_fee_cents)}</p>
          {b.admin_surcharge_cents > 0 && (
            <p className="text-white/60">
              Sovrapprezzo: {formatEuro(b.admin_surcharge_cents)}
              {b.surcharge_reason ? ` (${b.surcharge_reason})` : ""}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.length === 0 && (
          <p className="col-span-full text-sm text-white/60">Nessuna foto caricata.</p>
        )}
        {photos.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Foto interni" className="h-32 w-full rounded-lg object-cover" />
          </a>
        ))}
      </div>

      {b.status === "pending" && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Categoria reale</span>
              <select value={size} onChange={(e) => setSize(e.target.value as VehicleSize)} className={input}>
                {VEHICLE_SIZES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Sovrapprezzo (€)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={surchargeEuro}
                onChange={(e) => setSurchargeEuro(Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/70">Motivo sovrapprezzo</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="es. sporco severo"
                className={input}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="rounded-full bg-white px-5 py-2 font-semibold text-black disabled:opacity-50"
          >
            Conferma
          </button>
          <div className="flex flex-wrap gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rifiuto (facoltativo)"
              className={`${input} flex-1`}
            />
            <button
              type="button"
              onClick={reject}
              disabled={busy}
              className="rounded-full border border-red-400 px-5 py-2 text-red-300 disabled:opacity-50"
            >
              Rifiuta
            </button>
          </div>
        </div>
      )}

      {b.status === "confirmed" && (
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-400 px-5 py-2 font-semibold text-black"
            >
              Invia WhatsApp di conferma
            </a>
          ) : (
            <p className="text-sm text-white/60">Telefono mancante: impossibile aprire WhatsApp.</p>
          )}
        </div>
      )}

      {b.status === "cancelled" && (
        <p className="border-t border-white/10 pt-4 text-sm text-white/70">
          Motivo del rifiuto: {b.admin_note || "non indicato"}
        </p>
      )}

      {msg && <p className="text-sm text-amber-300">{msg}</p>}
    </article>
  );
}

function EventItem({ e }: { e: CalEvent }) {
  const allDay = !e.start.includes("T");
  const time = allDay
    ? "Tutto il giorno"
    : new Date(e.start).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-md bg-white/5 p-2 text-xs">
      <p className="font-semibold">
        {time} · {e.summary}
      </p>
      {e.location && (
        <a
          href={mapsUrl(e.location)}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sky-300 underline"
        >
          {e.location}
        </a>
      )}
    </div>
  );
}

type View = "day" | "week" | "month";

function getRange(view: View, anchor: Date) {
  if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = startOfWeek(first);
  return { from, to: addDays(from, 42) };
}

function CalendarMirror() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const range = getRange(view, anchor);
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      const params = new URLSearchParams({
        from: new Date(fromMs).toISOString(),
        to: new Date(toMs).toISOString(),
      });
      const res = await fetch(`/api/admin/calendar-events?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const json = (await res.json()) as { ok: boolean; events?: CalEvent[]; error?: string };
      if (cancelled) return;
      setLoading(false);
      if (!json.ok) setErr(json.error ?? "Errore nel caricamento");
      else setEvents(json.events ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [fromMs, toMs]);

  function move(dir: number) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, 7 * dir));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  }

  function eventsOn(day: Date) {
    return events
      .filter((e) => e.start && sameDay(new Date(e.start), day))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  const title =
    view === "month"
      ? anchor.toLocaleDateString("it-IT", { month: "long", year: "numeric" })
      : view === "week"
      ? `${range.from.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – ${addDays(
          range.from,
          6
        ).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`
      : anchor.toLocaleDateString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const count = view === "day" ? 1 : view === "week" ? 7 : 42;
  const days = Array.from({ length: count }, (_, i) => addDays(range.from, i));
  const gridCols =
    view === "day" ? "grid-cols-1" : view === "week" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-7";
  const limit = view === "month" ? 3 : 50;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} className={btnTab(false)}>
            ←
          </button>
          <button type="button" onClick={() => setAnchor(startOfDay(new Date()))} className={btnTab(false)}>
            Oggi
          </button>
          <button type="button" onClick={() => move(1)} className={btnTab(false)}>
            →
          </button>
        </div>
        <p className="font-semibold capitalize">{title}</p>
        <div className="flex gap-2">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={btnTab(view === v)}>
              {v === "day" ? "Giorno" : v === "week" ? "Settimana" : "Mese"}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-white/60">Caricamento calendario…</p>}
      {err && <p className="text-sm text-amber-300">{err}</p>}

      <div className={`grid gap-2 ${gridCols}`}>
        {days.map((day) => {
          const dayEvents = eventsOn(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = sameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 space-y-1 rounded-lg border p-2 ${
                isToday ? "border-white/60" : "border-white/10"
              } ${view === "month" && !inMonth ? "opacity-40" : ""}`}
            >
              <p className="text-xs font-semibold text-white/70">
                {day.toLocaleDateString("it-IT", {
                  weekday: view === "day" ? "long" : "short",
                  day: "numeric",
                  month: view === "day" ? "long" : undefined,
                })}
              </p>
              {dayEvents.length === 0 && view !== "month" && (
                <p className="text-xs text-white/40">Libero</p>
              )}
              {dayEvents.slice(0, limit).map((e) => (
                <EventItem key={e.id} e={e} />
              ))}
              {dayEvents.length > limit && (
                <p className="text-xs text-white/60">+{dayEvents.length - limit} altri</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [section, setSection] = useState<"bookings" | "calendar">("bookings");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .in("status", ["pending", "confirmed", "cancelled"])
      .order("starts_at", { ascending: true });
    if (error) setError(error.message);
    else setBookings((data ?? []) as unknown as Booking[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/accedi");
        return;
      }
      const { data: admin } = await supabase.rpc("is_admin");
      if (!admin) {
        setError("Questo account non è amministratore.");
        return;
      }
      setReady(true);
      load();
    })();
  }, [router, load]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/accedi");
  }

  function handleDone(next: Tab) {
    setTab(next);
    load();
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <p className="text-amber-300">{error}</p>
      </main>
    );
  }
  if (!ready) {
    return <main className="mx-auto max-w-3xl px-6 pb-20 pt-32 text-white/70">Caricamento…</main>;
  }

  const counts = {
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };
  const list = bookings.filter((b) => b.status === tab);
  const shown = tab === "cancelled" ? [...list].reverse() : list;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 pb-20 pt-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <button type="button" onClick={logout} className="text-sm text-white/70 underline">
          Esci
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setSection("bookings")} className={btnTab(section === "bookings")}>
          Prenotazioni
        </button>
        <button type="button" onClick={() => setSection("calendar")} className={btnTab(section === "calendar")}>
          Calendario
        </button>
      </div>

      {section === "bookings" && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab("pending")} className={btnTab(tab === "pending")}>
              Da confermare ({counts.pending})
            </button>
            <button type="button" onClick={() => setTab("confirmed")} className={btnTab(tab === "confirmed")}>
              Confermate ({counts.confirmed})
            </button>
            <button type="button" onClick={() => setTab("cancelled")} className={btnTab(tab === "cancelled")}>
              Rifiutate ({counts.cancelled})
            </button>
          </div>

          {shown.length === 0 && <p className="text-white/60">Nessuna prenotazione.</p>}
          <div className="space-y-4">
            {shown.map((b) => (
              <BookingCard key={b.id} b={b} onDone={handleDone} />
            ))}
          </div>
        </>
      )}

      {section === "calendar" && <CalendarMirror />}
    </main>
  );
}