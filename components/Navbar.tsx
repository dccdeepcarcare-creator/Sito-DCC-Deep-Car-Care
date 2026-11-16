"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/listino", label: "Listino" },
  { href: "/#prima-dopo", label: "Lavori" },
  { href: "/#video", label: "Video" },
  { href: "/#contatti", label: "Contatti" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open
          ? "border-testo/10 bg-carbon/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link href="/" aria-label="DCC Deep Car Care, home" className="flex items-center gap-2.5 sm:gap-3.5">
          <span
            aria-hidden
            className="stretch-wide grid h-10 w-10 place-items-center rounded-md border border-oro/70 text-[0.8rem] font-bold tracking-tight text-oro sm:h-11 sm:w-11"
          >
            DCC
          </span>
          <span className="stretch-normal text-[0.68rem] font-semibold tracking-[0.28em] text-testo sm:text-sm sm:tracking-[0.34em]">
            DEEP CAR CARE
          </span>
        </Link>

        <nav aria-label="Principale" className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-testo/75 transition-colors hover:text-testo">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/prenota"
            className="inline-flex items-center rounded-md bg-oro px-4 py-2 text-sm font-semibold text-carbon transition-colors hover:bg-oro-light sm:px-5 sm:py-2.5"
          >
            Prenota Ora
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-testo md:hidden"
            aria-label={open ? "Chiudi il menu" : "Apri il menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            aria-label="Menu mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-testo/10 bg-carbon/95 px-4 pb-6 pt-2 md:hidden"
          >
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-b border-testo/10 last:border-0">
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="stretch-display block py-4 text-xl font-semibold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}