import { supabase } from "./supabase";

export type BeforeAfter = {
  id: string;
  title: string;
  vehicle: string | null;
  description: string | null;
  before: string;
  after: string;
};

export type SingleImage = {
  id: string;
  title: string;
  vehicle: string | null;
  description: string | null;
  src: string;
};

export type ReelVideo = {
  id: string;
  title: string;
  vehicle: string | null;
  source: "youtube" | "mp4";
  src: string;
  youtubeId: string | null;
  poster: string | null;
};

type Row = {
  id: string;
  type: "before_after" | "video" | "single_image";
  title: string;
  description: string | null;
  vehicle_label: string | null;
  before_image_path: string | null;
  after_image_path: string | null;
  video_url: string | null;
  video_source: "youtube" | "mp4" | null;
  thumbnail_path: string | null;
};

const BUCKET = "portfolio";
const COLUMNS =
  "id,type,title,description,vehicle_label,before_image_path,after_image_path,video_url,video_source,thumbnail_path";

/** Path nel bucket → URL pubblico. Se è già un URL completo, lo lascia com'è. */
export function publicUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Estrae l'ID da youtube.com/shorts/ID, watch?v=ID, embed/ID, youtu.be/ID. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export async function getPortfolio(): Promise<{
  beforeAfter: BeforeAfter[];
  singles: SingleImage[];
  videos: ReelVideo[];
}> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[portfolio] lettura fallita:", error?.message);
    return { beforeAfter: [], singles: [], videos: [] };
  }

  const beforeAfter: BeforeAfter[] = [];
  const singles: SingleImage[] = [];
  const videos: ReelVideo[] = [];

  for (const row of data as unknown as Row[]) {
    if (row.type === "before_after") {
      const before = publicUrl(row.before_image_path);
      const after = publicUrl(row.after_image_path);
      if (before && after) {
        beforeAfter.push({
          id: row.id,
          title: row.title,
          vehicle: row.vehicle_label,
          description: row.description,
          before,
          after,
        });
      }
    } else if (row.type === "single_image") {
      const src = publicUrl(row.before_image_path);
      if (src) {
        singles.push({
          id: row.id,
          title: row.title,
          vehicle: row.vehicle_label,
          description: row.description,
          src,
        });
      }
    } else if (row.type === "video" && row.video_url) {
      const isYoutube = row.video_source === "youtube";
      const ytId = isYoutube ? youtubeId(row.video_url) : null;
      if (isYoutube && !ytId) continue;
      const src = isYoutube ? row.video_url : publicUrl(row.video_url);
      if (!src) continue;
      videos.push({
        id: row.id,
        title: row.title,
        vehicle: row.vehicle_label,
        source: isYoutube ? "youtube" : "mp4",
        src,
        youtubeId: ytId,
        poster: publicUrl(row.thumbnail_path) ?? (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null),
      });
    }
  }

  return { beforeAfter, singles, videos };
}