import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCalendarEvent } from "../../../../lib/googleCalendar";

type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  calendar_event_id: string | null;
  location_address: string | null;
  customer_notes: string | null;
  total_cents: number;
  vehicle_size: string;
  service: { name: string } | null;
  profile: { full_name: string | null; phone: string | null; email: string | null } | null;
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null;
};

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });

  // Il client usa il token dell'admin: le regole di sicurezza del database restano attive
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 403 });

  const { bookingId } = (await req.json()) as { bookingId: string };
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,starts_at,ends_at,status,calendar_event_id,location_address,customer_notes,total_cents,vehicle_size,service:services(name),profile:profiles(full_name,phone,email),vehicle:vehicles(brand,model,plate)"
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: "Prenotazione non trovata" }, { status: 404 });
  const b = data as unknown as BookingRow;

  if (b.status !== "confirmed") return NextResponse.json({ ok: false, error: "Non confermata" }, { status: 400 });
  if (b.calendar_event_id) return NextResponse.json({ ok: true, alreadyDone: true });

  const car = [b.vehicle?.brand, b.vehicle?.model, b.vehicle?.plate].filter(Boolean).join(" ");
  const who = b.profile?.full_name ?? "Cliente";

  try {
    const eventId = await createCalendarEvent({
      summary: `${b.service?.name ?? "Servizio"} · ${who}`,
      description: [
        `Cliente: ${who}`,
        `Telefono: ${b.profile?.phone ?? "-"}`,
        `Email: ${b.profile?.email ?? "-"}`,
        `Auto: ${car || "-"} (${b.vehicle_size})`,
        `Totale: ${(b.total_cents / 100).toFixed(2)} €`,
        `Note: ${b.customer_notes ?? "-"}`,
      ].join("\n"),
      location: b.location_address ?? "",
      startISO: b.starts_at,
      endISO: b.ends_at,
      bookingId: b.id,
    });

    const { error: saveError } = await supabase.rpc("admin_set_calendar_event", {
      p_booking_id: b.id,
      p_event_id: eventId,
    });
    if (saveError) throw new Error(saveError.message);

    return NextResponse.json({ ok: true, eventId });
  } catch (err) {
    console.error("[calendar-sync] errore:", err);
    return NextResponse.json({ ok: false, error: "Evento non creato nel calendario" }, { status: 500 });
  }
}