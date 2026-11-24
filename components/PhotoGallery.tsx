import Image from "next/image";
import type { SingleImage } from "@/lib/portfolio";

export function PhotoGallery({ items }: { items: SingleImage[] }) {
  if (items.length === 0) return null;

  return (
    <section id="galleria" className="scroll-mt-20 border-t border-testo/5 px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="stretch-display max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Galleria
        </h2>
        <p className="mt-4 max-w-xl text-testo/70">Alcuni dei nostri lavori, in dettaglio.</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-testo/10 bg-anthracite">
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3">
                  <p className="font-semibold text-testo">{item.title}</p>
                  {item.vehicle && <p className="text-sm text-testo/60">{item.vehicle}</p>}
                  {item.description && <p className="mt-1 text-sm text-testo/70">{item.description}</p>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}