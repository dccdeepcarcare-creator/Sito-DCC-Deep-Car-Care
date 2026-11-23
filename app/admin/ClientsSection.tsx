"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { VEHICLE_SIZES } from "../../lib/catalog";

type Client = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_redeemed: number;
};

type Veh = {
  id: string;
  owner_id: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  size_category: string | null;
};

type Bk = {
  id: string;
  client_id: string;
  starts_at: string;
  status: string;
  total_cents: number;
  service: { name: string } | null;
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null;
};

const LOYALTY_STEP = 5;
const DONE_STATUSES = ["confirmed", "completed"];
const STATUS_LABEL: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermata",
  completed: "Completata",
  cancelled: "Rifiutata",
  no_show: "Non presentato",
};

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/60";
const btn = "rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white/60 disabled:opacity-50";
const btnSolid =
  "rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50";
const card = "space-y-3 rounded-2xl border border-white/10 p-5";

function normName(v: string | null) {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function normEmail(v: string | null) {
  return (v ?? "").trim().toLowerCase();
}
function normPhone(v: string | null) {
  const d = (v ?? "").replace(/\D/g, "").replace(/^(0039|39)/, "");
  return d.length >= 6 ? d.slice(-9) : "";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Person = { full_name: string | null; email: string | null; phone: string | null };

// Restituisce i motivi per cui due persone sembrano la stessa
function reasons(a: Person, b: Person): string[] {
  const out: string[] = [];
  if (normName(a.full_name) && normName(a.full_name) === normName(b.full_name)) out.push("nome e cognome");
  if (normEmail(a.email) && normEmail(a.email) === normEmail(b.email)) out.push("email");
  const pa = normPhone(a.phone);
  if (pa && pa === normPhone(b.phone)) out.push("telefono");
  return out;
}

function findDuplicates(list: Client[]) {
  const pairs: { a: Client; b: Client; why: string[] }[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const why = reasons(list[i], list[j]);
      if (why.length > 0) pairs.push({ a: list[i], b: list[j], why });
    }
  }
  return pairs;
}

function NewClientForm({
  clients,
  onCancel,
  onDone,
}: {
  clients: Client[];
  onCancel: () => void;
  onDone: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const draft = { full_name: name, phone, email };
  const matches = clients
    .map((c) => ({ c, why: reasons(draft, c) }))
    .filter((m) => m.why.length > 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) {
      setMsg("Inserisci nome e cognome.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setMsg("Inserisci almeno telefono o email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        role: "client",
        full_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) setMsg(error?.message ?? "Cliente non creato.");
    else onDone(data.id);
  }

  return (
    <form onSubmit={onSubmit} className={card}>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Nuovo cliente</p>
        <button type="button" onClick={onCancel} className="text-sm text-white/60 underline">
          Annulla
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nome e cognome" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        <input placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} sm:col-span-2`} />
      </div>

      {matches.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-300/40 p-4 text-sm">
          <p className="font-semibold text-amber-300">
            Esistono già {matches.length} clienti simili. Controlla prima di salvare:
          </p>
          {matches.map((m) => (
            <div key={m.c.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {m.c.full_name} · {m.c.phone ?? "-"} · {m.c.email ?? "-"} (stesso {m.why.join(", ")})
              </span>
              <button type="button" onClick={() => onDone(m.c.id)} className={btn}>
                Apri questo cliente
              </button>
            </div>
          ))}
          <p className="text-white/60">Se è davvero una persona nuova, puoi comunque salvarla qui sotto.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnSolid}>
          {busy ? "Salvataggio…" : matches.length > 0 ? "Crea comunque nuovo cliente" : "Salva cliente"}
        </button>
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
      </div>
    </form>
  );
}

function ClientDetail({
  client,
  allClients,
  vehicles,
  bookings,
  done,
  onReload,
}: {
  client: Client;
  allClients: Client[];
  vehicles: Veh[];
  bookings: Bk[];
  done: number;
  onReload: (keepId?: string) => void;
}) {
  const [name, setName] = useState(client.full_name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vSize, setVSize] = useState("sedan");
  const [mergeId, setMergeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(client.full_name ?? "");
    setPhone(client.phone ?? "");
    setEmail(client.email ?? "");
    setMergeId("");
    setMsg(null);
  }, [client.id, client.full_name, client.phone, client.email]);

  const earned = Math.floor(done / LOYALTY_STEP);
  const available = Math.max(0, earned - client.loyalty_redeemed);
  const progress = done % LOYALTY_STEP;

  async function saveProfile() {
    if (!name.trim()) {
      setMsg("Inserisci il nome.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
      })
      .eq("id", client.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Dati salvati.");
      onReload();
    }
  }

  async function redeem() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_redeem_loyalty", { p_profile: client.id });
    setBusy(false);
    if (error) setMsg(error.message);
    else onReload();
  }

  async function addVehicle() {
    if (!vBrand.trim()) {
      setMsg("Inserisci la marca dell'auto.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("vehicles").insert({
      owner_id: client.id,
      brand: vBrand.trim(),
      model: vModel.trim() || "-",
      plate: vPlate.trim() || null,
      size_category: vSize,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setVBrand("");
      setVModel("");
      setVPlate("");
      onReload();
    }
  }

  async function merge() {
    const other = allClients.find((c) => c.id === mergeId);
    if (!other) return;
    const ok = window.confirm(
      `Unire "${other.full_name}" dentro "${client.full_name}"? Lavori e auto passano a "${client.full_name}" e "${other.full_name}" viene eliminato.`
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_merge_clients", {
      p_keep: client.id,
      p_remove: other.id,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else onReload(client.id);
  }

  const sorted = [...bookings].sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  return (
    <div className="space-y-6">
      <div className={card}>
        <p className="font-semibold">Dati cliente</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" className={input} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefono" className={input} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={`${input} sm:col-span-2`} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveProfile} disabled={busy} className={btnSolid}>
            Salva dati
          </button>
          {msg && <p className="text-sm text-amber-300">{msg}</p>}
        </div>
      </div>

      <div className={card}>
        <p className="font-semibold">Carta fedeltà</p>
        <p className="text-sm text-white/70">
          Lavori completati: <strong>{done}</strong> · Prossimo premio tra{" "}
          <strong>{LOYALTY_STEP - progress}</strong> lavaggi
        </p>
        <div className="flex gap-2">
          {Array.from({ length: LOYALTY_STEP }, (_, i) => (
            <span
              key={i}
              className={`grid h-9 w-9 place-items-center rounded-full border text-sm ${
                i < progress ? "border-white bg-white/20" : "border-white/20 text-white/40"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Premi disponibili: <strong>{available}</strong> · Già usati: {client.loyalty_redeemed}
          </span>
          <button type="button" onClick={redeem} disabled={busy || available <= 0} className={btn}>
            Usa premio
          </button>
        </div>
      </div>

      <div className={card}>
        <p className="font-semibold">Garage</p>
        {vehicles.length === 0 && <p className="text-sm text-white/60">Nessuna auto registrata.</p>}
        {vehicles.map((v) => (
          <p key={v.id} className="text-sm text-white/80">
            {v.brand} {v.model} {v.plate ? `· ${v.plate}` : ""}{" "}
            <span className="text-white/50">({VEHICLE_SIZES.find((x) => x.value === v.size_category)?.label ?? v.size_category ?? "-"})</span>
          </p>
        ))}
        <div className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4">
          <input value={vBrand} onChange={(e) => setVBrand(e.target.value)} placeholder="Marca" className={input} />
          <input value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="Modello" className={input} />
          <input value={vPlate} onChange={(e) => setVPlate(e.target.value)} placeholder="Targa" className={input} />
          <select value={vSize} onChange={(e) => setVSize(e.target.value)} className={input}>
            {VEHICLE_SIZES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={addVehicle} disabled={busy} className={btn}>
          Aggiungi auto
        </button>
      </div>

      <div className={card}>
        <p className="font-semibold">Storico lavori ({sorted.length})</p>
        {sorted.length === 0 && <p className="text-sm text-white/60">Nessun lavoro.</p>}
        {sorted.map((b) => (
          <div key={b.id} className="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-2 text-sm">
            <span>
              {fmtDateTime(b.starts_at)} · {b.service?.name ?? "-"} ·{" "}
              {b.vehicle ? `${b.vehicle.brand ?? ""} ${b.vehicle.model ?? ""}` : "-"}
            </span>
            <span className="text-white/60">
              {STATUS_LABEL[b.status] ?? b.status} · {(b.total_cents / 100).toFixed(2)} €
            </span>
          </div>
        ))}
      </div>

      <div className={card}>
        <p className="font-semibold">Unisci un altro cliente in questo</p>
        <p className="text-sm text-white/60">
          Lavori e auto del cliente scelto passano a questo cliente, poi quello scelto viene eliminato.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={mergeId} onChange={(e) => setMergeId(e.target.value)} className={`${input} max-w-sm`}>
            <option value="">Scegli il cliente da unire</option>
            {allClients
              .filter((c) => c.id !== client.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} · {c.phone ?? "-"} · {c.email ?? "-"}
                </option>
              ))}
          </select>
          <button type="button" onClick={merge} disabled={busy || !mergeId} className={btn}>
            Unisci
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsSection() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Veh[]>([]);
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, v, b] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,user_id,full_name,email,phone,loyalty_redeemed")
        .neq("role", "admin")
        .order("full_name"),
      supabase.from("vehicles").select("id,owner_id,brand,model,plate,size_category"),
      supabase
        .from("bookings")
        .select("id,client_id,starts_at,status,total_cents,service:services(name),vehicle:vehicles(brand,model,plate)")
        .order("starts_at", { ascending: false }),
    ]);
    const err = p.error?.message ?? v.error?.message ?? b.error?.message;
    if (err) setError(err);
    else {
      setError(null);
      setClients((p.data ?? []) as Client[]);
      setVehicles((v.data ?? []) as Veh[]);
      setBookings((b.data ?? []) as unknown as Bk[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(
    async (keepId?: string) => {
      if (keepId) setSelectedId(keepId);
      await load();
    },
    [load]
  );

  const stats = useMemo(() => {
    const m: Record<string, { done: number; last: string | null }> = {};
    const now = Date.now();
    for (const b of bookings) {
      const s = m[b.client_id] ?? { done: 0, last: null };
      if (DONE_STATUSES.includes(b.status) && new Date(b.starts_at).getTime() < now) s.done++;
      if (b.status !== "cancelled" && (!s.last || b.starts_at > s.last)) s.last = b.starts_at;
      m[b.client_id] = s;
    }
    return m;
  }, [bookings]);

  const duplicates = useMemo(() => findDuplicates(clients), [clients]);

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clienti</h2>
          <p className="text-sm text-white/60">
            Si aggiorna con ogni prenotazione. Usa Aggiorna per ricaricare la lista.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className={btn}>
            Aggiorna
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
            className={btnSolid}
          >
            + Nuovo cliente
          </button>
        </div>
      </div>

      {error && <p className="text-amber-300">{error}</p>}

      {duplicates.length > 0 && (
        <section className={card}>
          <p className="font-semibold text-amber-300">Possibili duplicati da verificare ({duplicates.length})</p>
          {duplicates.map((p) => (
            <div key={`${p.a.id}-${p.b.id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {p.a.full_name} e {p.b.full_name}: stesso {p.why.join(", ")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(p.a.id);
                  }}
                  className={btn}
                >
                  Apri il primo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(p.b.id);
                  }}
                  className={btn}
                >
                  Apri il secondo
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <input
            placeholder="Cerca nome, telefono o email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={input}
          />
          {loading && <p className="text-sm text-white/60">Caricamento…</p>}
          {!loading && filtered.length === 0 && <p className="text-sm text-white/60">Nessun cliente.</p>}
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {filtered.map((c) => {
              const st = stats[c.id];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(c.id);
                  }}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    selectedId === c.id ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <p className="font-semibold">{c.full_name ?? "Senza nome"}</p>
                  <p className="text-white/60">
                    {c.phone ?? "-"} · {c.email ?? "-"}
                  </p>
                  <p className="text-xs text-white/50">
                    {st?.done ?? 0} lavori
                    {st?.last ? ` · ultimo ${fmtDate(st.last)}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {creating ? (
            <NewClientForm
              clients={clients}
              onCancel={() => setCreating(false)}
              onDone={(id) => {
                setCreating(false);
                reload(id);
              }}
            />
          ) : selected ? (
            <ClientDetail
              key={selected.id}
              client={selected}
              allClients={clients}
              vehicles={vehicles.filter((v) => v.owner_id === selected.id)}
              bookings={bookings.filter((b) => b.client_id === selected.id)}
              done={stats[selected.id]?.done ?? 0}
              onReload={reload}
            />
          ) : (
            <p className="text-white/60">Seleziona un cliente dalla lista, oppure creane uno nuovo.</p>
          )}
        </section>
      </div>
    </div>
  );
}