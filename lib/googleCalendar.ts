import { createSign } from "crypto";

type Creds = { client_email: string; private_key: string };

export type CalendarEventInput = {
  summary: string;
  description: string;
  location: string;
  startISO: string;
  endISO: string;
  bookingId: string;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(creds: Creds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(creds.private_key);
  const assertion = `${header}.${claim}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Token Google: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

export async function createCalendarEvent(ev: CalendarEventInput): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!raw || !calendarId) throw new Error("Variabili Google Calendar mancanti su Vercel");

  const creds = JSON.parse(raw) as Creds;
  const token = await getAccessToken(creds);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description,
        location: ev.location,
        start: { dateTime: ev.startISO, timeZone: "Europe/Rome" },
        end: { dateTime: ev.endISO, timeZone: "Europe/Rome" },
        extendedProperties: { private: { bookingId: ev.bookingId } },
      }),
    }
  );
  if (!res.ok) throw new Error(`Calendar: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { id: string };
  return json.id;
}