"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { ReelVideo } from "@/lib/portfolio";

export function VideoReel({ videos }: { videos: ReelVideo[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollByCards = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-reel-card]");
    const step = (card?.offsetWidth ?? 280) + 16;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section id="video" className="scroll-mt-20 border-t border-testo/5 py-24 lg:py-32">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 sm:px-6">
        <div>
          <h2 className="stretch-display max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Video dei lavori
          </h2>
          <p className="mt-4 max-w-xl text-testo/70">
            Gli interventi sugli interni, ripresi mentre li eseguiamo. Tocca un video per avviarlo.
          </p>
        </div>

        {videos.length > 1 && (
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label="Video precedenti"
              className="grid h-11 w-11 place-items-center rounded-full border border-testo/20 transition-colors hover:border-oro hover:text-oro"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label="Video successivi"
              className="grid h-11 w-11 place-items-center rounded-full border border-testo/20 transition-colors hover:border-oro hover:text-oro"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
          <div className="rounded-lg border border-dashed border-testo/15 px-6 py-16 text-center text-testo/60">
            I primi video verranno pubblicati a breve.
          </div>
        </div>
      ) : (
        <div
          ref={scroller}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-2 [--gutter:1rem] scroll-pl-[var(--gutter)] sm:[--gutter:1.5rem] lg:[--gutter:max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {videos.map((v) => {
            const isActive = activeId === v.id;
            return (
              <motion.article
                key={v.id}
                data-reel-card
                whileTap={{ scale: 0.985 }}
                className="relative aspect-[9/16] w-[64vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-lg border border-testo/10 bg-anthracite sm:w-[260px] lg:w-[280px]"
              >
                {isActive ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 bg-carbon"
                  >
                    {v.source === "youtube" && v.youtubeId ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${v.youtubeId}&playsinline=1&rel=0&modestbranding=1`}
                        title={v.title}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    ) : (
                      <video
                        src={v.src}
                        poster={v.poster ?? undefined}
                        autoPlay
                        loop
                        playsInline
                        controls
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      aria-label="Chiudi il video"
                      className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-carbon/75 text-testo backdrop-blur transition-colors hover:text-oro"
                    >
                      <X size={18} />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveId(v.id)}
                    aria-label={`Riproduci il video: ${v.title}`}
                    className="group absolute inset-0 text-left"
                  >
                    {v.poster && (
                      <Image
                        src={v.poster}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 280px, (min-width: 640px) 260px, 64vw"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/10 to-transparent" />
                    <motion.span
                      whileHover={{ scale: 1.08 }}
                      className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-oro bg-carbon/60 text-oro backdrop-blur"
                    >
                      <Play size={22} className="translate-x-px" fill="currentColor" />
                    </motion.span>
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span className="block font-semibold leading-snug text-testo">{v.title}</span>
                      {v.vehicle && <span className="block text-sm text-testo/70">{v.vehicle}</span>}
                    </span>
                  </button>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}