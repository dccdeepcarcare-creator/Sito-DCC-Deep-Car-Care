"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import type { BeforeAfter } from "@/lib/portfolio";

export function PortfolioBeforeAfter({ items }: { items: BeforeAfter[] }) {
  const [index, setIndex] = useState(0);
  const current = items[index];

  return (
    <section id="prima-dopo" className="scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="stretch-display max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Prima e dopo
        </h2>
        <p className="mt-4 max-w-xl text-testo/70">
          Trascina il cursore per confrontare l&apos;abitacolo prima e dopo l&apos;intervento.
        </p>

        {!current ? (
          <div className="mt-10 rounded-lg border border-dashed border-testo/15 px-6 py-16 text-center text-testo/60">
            I primi lavori verranno pubblicati a breve.
          </div>
        ) : (
          <div className="mt-10">
            <BeforeAfterSlider
              key={current.id}
              before={current.before}
              after={current.after}
              beforeAlt={`Prima: ${current.title}`}
              afterAlt={`Dopo: ${current.title}`}
            />

            <div className="mt-5 max-w-2xl">
              <p className="font-semibold text-testo">{current.title}</p>
              {current.vehicle && <p className="text-sm text-testo/60">{current.vehicle}</p>}
              {current.description && <p className="mt-2 text-testo/70">{current.description}</p>}
            </div>

            {items.length > 1 && (
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3" role="group" aria-label="Scegli un lavoro">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-pressed={i === index}
                    className={`border-b-2 pb-2 text-left text-sm transition-colors ${
                      i === index
                        ? "border-oro text-testo"
                        : "border-transparent text-testo/55 hover:text-testo"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}