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
            Detailing interni professionale: l’eccellenza del lavaggio al dettaglio a domicilio.
Sono un professionista del settore, guidato da una grande passione per la cura dell16:21:46.176 Running build in Washington, D.C., USA (East) – iad1
16:21:46.177 Build machine configuration: 2 cores, 8 GB
16:21:46.310 Cloning github.com/dccdeepcarcare-creator/Sito-DCC-Deep-Car-Care (Branch: main, Commit: 89e9cd7)
16:21:46.626 Cloning completed: 315.000ms
16:21:47.418 Restored build cache from previous deployment (Hz2RZzyxUNfPD5wdorB8TwPTzECZ)
16:21:48.015 Running "vercel build"
16:21:48.028 Vercel CLI 66.6.0
16:21:48.386 Warning: Detected "engines": { "node": ">=18.18.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: https://vercel.link/node-version
16:21:48.404 Installing dependencies...
16:21:49.141 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
16:21:49.579 
16:21:49.579 up to date in 930ms
16:21:49.579 
16:21:49.579 158 packages are looking for funding
16:21:49.579   run `npm fund` for details
16:21:49.617 Detected Next.js version: 14.2.35
16:21:49.624 Running "npm run build"
16:21:49.748 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
16:21:49.772 
16:21:49.773 > dcc-deep-car-care@0.1.0 build
16:21:49.773 > next build
16:21:49.773 
16:21:50.622   ▲ Next.js 14.2.35
16:21:50.623 
16:21:50.644    Creating an optimized production build ...
16:21:59.547  ✓ Compiled successfully
16:21:59.549    Linting and checking validity of types ...
16:22:05.005 
16:22:05.006 Failed to compile.
16:22:05.006 
16:22:05.007 ./app/admin/ManualBooking.tsx
16:22:05.007 128:24  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
16:22:05.007 
16:22:05.007 ./app/admin/page.tsx
16:22:05.007 254:13  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
16:22:05.007 
16:22:05.008 ./components/Hero.tsx
16:22:05.008 61:84  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
16:22:05.008 
16:22:05.008 ./components/PrenotaForm.tsx
16:22:05.008 124:24  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
16:22:05.009 
16:22:05.009 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/basic-features/eslint#disabling-rules
16:22:05.055 Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1auto. Eseguo rigorosamente a mano pulizia profonda di sedili, pelle e plastiche, sanificazione e protezione dei materiali, per restituirti un abitacolo pari al nuovo — o persino migliore.
Opero su appuntamento a domicilio per privati e concessionarie,preparazione pre-vendita, nelle province di Ravenna, Forlì-Cesena, Rimini e nella Repubblica di San Marino. Prenota ora il tuo intervento.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/listino#prenota"
              className="inline-flex items-center justify-center rounded-md bg-oro px-7 py-3.5 text-base font-semibold shadow-glow transition-colors hover:bg-oro-light"
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