import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAccessToken } from "../../../../lib/googleCalendar";

type GoogleEvent = {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: { bookingId?: string } };
};

export async function GET(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ ok: false, error: "Intervallo mancante" }, { status: 400 });

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!raw || !calendarId) return NextResponse.json({ ok: false, error: "Configurazione mancante" }, { status: 500 });

  try {
    const creds = JSON.parse(raw) as { client_email: string; private_key: string };
    const accessToken = await getAccessToken(creds);

    const params = new URLSearchParams({
      timeMin: from,
      timeMax: to,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Calendar: ${res.status} ${await res.text()}`);

    const json = (await res.json()) as { items?: GoogleEvent[] };
    const events = (json.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? "(senza titolo)",
      location: e.location ?? "",
      description: e.description ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      bookingId: e.extendedProperties?.private?.bookingId ?? null,
    }));
    return NextResponse.json({ ok: true, events });
  } catch (err) {
    console.error("[calendar-events] errore:", err);
    return NextResponse.json({ ok: false, error: "Calendario non disponibile" }, { status: 500 });
  }
}