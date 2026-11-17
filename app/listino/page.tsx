import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ListinoConfigurator } from "@/components/ListinoConfigurator";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Listino detailing interni",
  description:
    "Pacchetti e add-on di detailing interni a Ravenna, con prezzo e durata calcolati in tempo reale.",
  alternates: { canonical: "/listino" },
};

export const revalidate = 300;

export default async function ListinoPage() {
  const { services, addons } = await getCatalog();

  return (
    <>
      <Navbar />
      <main id="main" className="px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="stretch-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Listino
          </h1>
          <p className="mt-4 max-w-2xl text-testo/70">
            Scegli la categoria della tua auto, il pacchetto base e gli add-on. Prezzo e durata si
            aggiornano mentre configuri.
          </p>

          {services.length === 0 ? (
            <p className="mt-16 rounded-lg border border-dashed border-testo/15 px-6 py-16 text-center text-testo/60">
              Listino in aggiornamento.
            </p>
          ) : (
            <ListinoConfigurator services={services} addons={addons} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}