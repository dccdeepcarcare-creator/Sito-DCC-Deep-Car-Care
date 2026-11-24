"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { publicUrl, youtubeId } from "../../lib/portfolio";

type ItemType = "before_after" | "video";

type Item = {
  id: string;
  type: ItemType;
  title: string;
  description: string | null;
  vehicle_label: string | null;
  before_image_path: string | null;
  after_image_path: string | null;
  video_url: string | null;
  video_source: "youtube" | "mp4" | null;
  thumbnail_path: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

const BUCKET = "portfolio";
const MAX_VIDEO_MB = 50;

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60";
const btn = "rounded-full border border-white/20 px-4 py-1.5 text-sm hover:border-white/60 disabled:opacity-50";
const btnPrimary = "rounded-full bg-white px-5 py-2 font-semibold text-black disabled:opacity-50";

const emptyDraft = { title: "", vehicle_label: "", description: "" };

const GROUPS: { type: ItemType; title: string; hint: string }[] = [
  {
    type: "before_after",
    title: "Prima e dopo",
    hint: "Due foto per ogni lavoro. Per cambiare una foto, elimina la voce e aggiungila di nuovo.",
  },
  {
    type: "video",
    title: "Video",
    hint: "File MP4 fino a 50 MB. Consigliata un'anteprima (immagine) per la card.",
  },
];

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Errore imprevisto.";
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Caricamento di "${file.name}" non riuscito: ${error.message}`);
  return path;
}

function NewItemForm({
  type,
  nextOrder,
  onDone,
  onCancel,
}: {
  type: ItemType;
  nextOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [description, setDescription] = useState("");
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr("Inserisci un titolo.");
    if (type === "before_after" && (!before || !after)) return setErr("Carica la foto prima e la foto dopo.");
    if (type === "video" && !video) return setErr("Scegli un file video.");
    if (video && video.size > MAX_VIDEO_MB * 1024 * 1024) {
      return setErr(`Il video supera ${MAX_VIDEO_MB} MB. Comprimilo e riprova.`);
    }

    setBusy(true);
    const uploaded: string[] = [];
    try {
      const row: Record<string, unknown> = {
        type,
        title: title.trim(),
        vehicle_label: vehicle.trim() || null,
        description: description.trim() || null,
        is_published: true,
        sort_order: nextOrder,
      };

      if (type === "before_after" && before && after) {
        const b = await uploadFile(before, "before-after");
        uploaded.push(b);
        const a = await uploadFile(after, "before-after");
        uploaded.push(a);
        row.before_image_path = b;
        row.after_image_path = a;
      } else if (video) {
        const v = await uploadFile(video, "videos");
        uploaded.push(v);
        row.video_url = v;
        row.video_source = "mp4";
        if (thumb) {
          const t = await uploadFile(thumb, "thumbnails");
          uploaded.push(t);
          row.thumbnail_path = t;
        }
      }

      const { error } = await supabase.from("portfolio_items").insert(row);
      if (error) throw new Error(error.message);
      onDone();
    } catch (e) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/15 p-5">
      <p className="font-semibold">{type === "before_after" ? "Nuovo lavoro prima/dopo" : "Nuovo video"}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Titolo *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Sedili in pelle" className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/70">Veicolo</span>
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="es. Fiat 500" className={input} />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-white/70">Didascalia</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
      </label>

      {type === "before_after" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Foto prima *</span>
            <input type="file" accept="image/*" onChange={(e) => setBefore(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Foto dopo *</span>
            <input type="file" accept="image/*" onChange={(e) => setAfter(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Video MP4 (max {MAX_VIDEO_MB} MB) *</span>
            <input type="file" accept="video/mp4" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-white/70">Anteprima (facoltativa, immagine)</span>
            <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </label>
        </div>
      )}

      {err && <p className="text-sm text-amber-300">{err}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Caricamento in corso…" : "Salva"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={btn}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export default function PortfolioManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<ItemType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems((data ?? []) as Item[]);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
    setBusy(false);
  }

  async function togglePublish(item: Item) {
    await run(async () => {
      const { error } = await supabase
        .from("portfolio_items")
        .update({ is_published: !item.is_published })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    });
  }

  async function move(type: ItemType, index: number, dir: -1 | 1) {
    const list = items.filter((i) => i.type === type);
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
    await run(async () => {
      const results = await Promise.all(
        reordered.map((it, k) =>
          supabase.from("portfolio_items").update({ sort_order: (k + 1) * 10 }).eq("id", it.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    });
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`Eliminare "${item.title}"? L'operazione non si può annullare.`)) return;
    await run(async () => {
      const paths = [item.before_image_path, item.after_image_path, item.video_url, item.thumbnail_path].filter(
        (p): p is string => !!p && !/^https?:\/\//i.test(p)
      );
      const { error } = await supabase.from("portfolio_items").delete().eq("id", item.id);
      if (error) throw new Error(error.message);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    });
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      vehicle_label: item.vehicle_label ?? "",
      description: item.description ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!draft.title.trim()) {
      setError("Il titolo non può essere vuoto.");
      return;
    }
    await run(async () => {
      const { error } = await supabase
        .from("portfolio_items")
        .update({
          title: draft.title.trim(),
          vehicle_label: draft.vehicle_label.trim() || null,
          description: draft.description.trim() || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setEditingId(null);
    });
  }

  function preview(item: Item) {
    if (item.type === "before_after") {
      return (
        <div className="flex gap-2">
          {[item.before_image_path, item.after_image_path].map((p, k) => {
            const url = publicUrl(p);
            return url ? (
              <img key={k} src={url} alt={k === 0 ? "Prima" : "Dopo"} className="h-28 w-40 rounded-lg object-cover" />
            ) : (
              <div key={k} className="grid h-28 w-40 place-items-center rounded-lg bg-white/5 text-xs text-white/50">
                Foto mancante
              </div>
            );
          })}
        </div>
      );
    }
    const ytId = item.video_source === "youtube" && item.video_url ? youtubeId(item.video_url) : null;
    const poster = publicUrl(item.thumbnail_path) ?? (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
    const src = item.video_source === "mp4" ? publicUrl(item.video_url) : null;
    if (poster) {
      return <img src={poster} alt="" className="h-28 w-16 rounded-lg object-cover" />;
    }
    if (src) {
      return <video src={src} muted preload="metadata" className="h-28 w-16 rounded-lg bg-black object-cover" />;
    }
    return <div className="grid h-28 w-16 place-items-center rounded-lg bg-white/5 text-xs text-white/50">Video</div>;
  }

  function renderRow(type: ItemType, item: Item, index: number, list: Item[]) {
    const editing = editingId === item.id;
    return (
      <li
        key={item.id}
        className={`rounded-2xl border border-white/10 p-4 ${item.is_published ? "" : "opacity-60"}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="shrink-0">{preview(item)}</div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold">{item.title}</p>
            {item.vehicle_label && <p className="text-sm text-white/60">{item.vehicle_label}</p>}
            {item.description && <p className="text-sm text-white/70">{item.description}</p>}
            <p className="text-xs text-white/50">
              {item.is_published ? "Visibile sul sito" : "Nascosto"} · posizione {index + 1}
            </p>
          </div>
        </div>

        {editing ? (
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Titolo"
              className={input}
            />
            <input
              value={draft.vehicle_label}
              onChange={(e) => setDraft({ ...draft, vehicle_label: e.target.value })}
              placeholder="Veicolo"
              className={input}
            />
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Didascalia"
              className={`${input} sm:col-span-2`}
            />
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" onClick={() => saveEdit(item.id)} disabled={busy} className={btnPrimary}>
                Salva
              </button>
              <button type="button" onClick={() => setEditingId(null)} className={btn}>
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => move(type, index, -1)}
              disabled={busy || index === 0}
              className={btn}
              aria-label="Sposta su"
            >
              ↑ Su
            </button>
            <button
              type="button"
              onClick={() => move(type, index, 1)}
              disabled={busy || index === list.length - 1}
              className={btn}
              aria-label="Sposta giù"
            >
              ↓ Giù
            </button>
            <button type="button" onClick={() => startEdit(item)} disabled={busy} className={btn}>
              Modifica
            </button>
            <button type="button" onClick={() => togglePublish(item)} disabled={busy} className={btn}>
              {item.is_published ? "Nascondi" : "Mostra"}
            </button>
            <button
              type="button"
              onClick={() => removeItem(item)}
              disabled={busy}
              className="rounded-full border border-red-400 px-4 py-1.5 text-sm text-red-300 disabled:opacity-50"
            >
              Elimina
            </button>
          </div>
        )}
      </li>
    );
  }

  function renderGroup(g: (typeof GROUPS)[number]) {
    const list = items.filter((i) => i.type === g.type);
    const nextOrder = list.reduce((max, i) => Math.max(max, i.sort_order), 0) + 10;
    return (
      <div key={g.type} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{g.title}</h2>
            <p className="text-sm text-white/60">{g.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => setAdding(g.type)}
            disabled={busy || adding !== null}
            className={btnPrimary}
          >
            + Aggiungi
          </button>
        </div>

        {adding === g.type && (
          <NewItemForm
            type={g.type}
            nextOrder={nextOrder}
            onDone={() => {
              setAdding(null);
              load();
            }}
            onCancel={() => setAdding(null)}
          />
        )}

        {ready && list.length === 0 && <p className="text-white/60">Nessuna voce ancora.</p>}
        <ul className="space-y-3">{list.map((item, i) => renderRow(g.type, item, i, list))}</ul>
      </div>
    );
  }

  return (
    <section className="space-y-12">
      {error && <p className="text-sm text-amber-300">{error}</p>}
      {!ready && <p className="text-white/60">Caricamento…</p>}
      {GROUPS.map(renderGroup)}
    </section>
  );
}