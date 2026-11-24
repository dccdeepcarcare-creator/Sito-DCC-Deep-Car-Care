"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const LINES = ["Interni puliti", "come il primo", "giorno."];
const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-carbon">
      {/* Video di sfondo: public/video/hero.mp4 (muto, in loop). Se manca, resta il nero carbonio. */}
      {!videoFailed && (
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          autoPlay={!reduce}
          muted
          loop
          playsInline
          preload="metadata"
          poster="/video/hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/video/hero.mp4" type="video/mp4" onError={() => setVideoFailed(true)} />
        </video>
      )}

      {/* Velature per la leggibilità del testo */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(9,10,15,0.65)_0%,rgba(9,10,15,0.25)_35%,rgba(9,10,15,0.94)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-carbon/60 via-transparent to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-36 sm:px-6 sm:pb-24">
        <h1 className="stretch-display text-[clamp(1.9rem,7.6vw,5.5rem)] font-bold leading-[1.04] tracking-tight text-testo">
          {LINES.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                className="block"
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <span className="mt-8 block h-0.5 w-20 bg-oro" />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease }}
        >
          <p className="mt-6 max-w-xl text-base leading-relaxed text-testo/80 sm:text-lg">
            Detailing interni a Ravenna, su appuntamento. Pulizia profonda di sedili, pelle e plastiche,
            sanificazione e protezione dei materiali: tutto eseguito a mano.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listino#prenota"
              className="inline-flex items-center justify-center rounded-md bg-oro px-7 py-3.5 text-base font-semibold text-carbon transition-colors hover:bg-oro-light"
            >
              Prenota ora
            </Link>
            <Link
              href="#prima-dopo"
              className="inline-flex items-center justify-center rounded-md border border-testo/25 px-7 py-3.5 text-base font-medium text-testo transition-colors hover:border-oro hover:text-oro"
            >
              Guarda i lavori
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}