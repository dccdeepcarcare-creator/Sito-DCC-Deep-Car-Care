import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer id="contatti" className="scroll-mt-20 border-t border-testo/10 bg-carbon px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-3">
        <div>
          <p className="stretch-wide text-lg font-bold text-testo">DCC</p>
          <p className="mt-1 text-sm tracking-[0.3em] text-testo/80">DEEP CAR CARE</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-testo/60">
            Detailing interni a {site.address.city}, su appuntamento.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-testo">Contatti</h3>
          <address className="mt-4 space-y-1 text-sm not-italic text-testo/70">
            <p>{site.address.street}</p>
            <p>
              {site.address.postalCode} {site.address.city} ({site.address.region})
            </p>
            <p className="pt-2">
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-oro">
                {site.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${site.email}`} className="hover:text-oro">
                {site.email}
              </a>
            </p>
          </address>
        </div>

        <div>
          <h3 className="font-semibold text-testo">Orari</h3>
          <ul className="mt-4 space-y-1 text-sm text-testo/70">
            {site.openingHours.map((h) => (
              <li key={h.label}>
                {h.label}: {h.opens}–{h.closes}
              </li>
            ))}
          </ul>
          <Link
            href="/prenota"
            className="mt-6 inline-flex rounded-md bg-oro px-5 py-2.5 text-sm font-semibold text-carbon transition-colors hover:bg-oro-light"
          >
            Prenota Ora
          </Link>
        </div>
      </div>

      <p className="mx-auto mt-14 max-w-6xl text-xs text-testo/40">
        © {new Date().getFullYear()} {site.name}. Tutti i diritti riservati.
      </p>
    </footer>
  );
}