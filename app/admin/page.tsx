"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { VEHICLE_SIZES, formatEuro, type VehicleSize } from "../../lib/catalog";

type Booking = {
  id: string;
  starts_at: string;
  status: string;
  vehicle_size: VehicleSize;
  service_price_cents: number;
  admin_surcharge_cents: number;
  surcharge_reason: string | null;
  total_cents: number;
  location_address: string | null;
  customer_notes: string | null;
  travel_fee_cents: number;
  service: { name: string } | null;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null;
};

const SELECT = `
  id, starts_at, status, vehicle_size, service_price_cents, admin_surcharge_cents,
  surcharge_reason, total_cents, location_address, customer_notes, travel_fee_cents,
  service:services(name),
  profile:profiles(full_name,email,phone),
  vehicle:vehicles(brand,model,plate)
`;

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BookingCard({ b, onDone }: { b: Booking; onDone: () => void }) {
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

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/calendar-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ bookingId: b.id }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Prenotazione confermata, ma l'evento nel calendario non è stato creato. Controlla i log di Vercel.");
    }
    onDone();
  }

  async function reject() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_reject_booking", {
      p_booking_id: b.id,
      p_reason: rejectReason || null,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else onDone();
  }

  const pending = b.status === "pending";

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
          <p className="text-white/70">Indirizzo: {b.location_address}</p>
          {b.customer_notes && <p className="text-white/70">Note: {b.customer_notes}</p>}
        </div>
        <div className="text-right text-sm">
          <p>
            Totale: <strong>{formatEuro(b.total_cents)}</strong>
          </p>
          <p className="text-white/60">Trasferta: {formatEuro(b.travel_fee_cents)}</p>
          <p className="text-white/60">Stato: {b.status}</p>
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

      {pending && (
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
      {msg && <p className="text-sm text-amber-300">{msg}</p>}
    </article>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"pending" | "confirmed">("pending");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .in("status", ["pending", "confirmed"])
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

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const list = bookings.filter((b) => b.status === tab);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 pb-20 pt-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <button type="button" onClick={logout} className="text-sm text-white/70 underline">
          Esci
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-full border px-4 py-2 text-sm ${
            tab === "pending" ? "border-white bg-white/10" : "border-white/15"
          }`}
        >
          Da confermare ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setTab("confirmed")}
          className={`rounded-full border px-4 py-2 text-sm ${
            tab === "confirmed" ? "border-white bg-white/10" : "border-white/15"
          }`}
        >
          Confermate ({confirmedCount})
        </button>
      </div>

      {list.length === 0 && <p className="text-white/60">Nessuna prenotazione.</p>}
      <div className="space-y-4">
        {list.map((b) => (
          <BookingCard key={b.id} b={b} onDone={load} />
        ))}
      </div>
    </main>
  );
}