import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { ListinoFlow } from "../../components/ListinoFlow";
import { getCatalog } from "../../lib/catalog";

export const revalidate = 300;

export const metadata = {
  title: "Listino e prenotazione | DCC Deep Car Care",
};

export default async function ListinoPage() {
  const { services, addons } = await getCatalog();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-32">
        <h1 className="text-4xl font-semibold">Listino e prenotazione</h1>
        <p className="mt-3 text-white/70">
          Scegli categoria, pacchetto ed extra: il riepilogo si aggiorna in tempo reale. Poi scegli
          data e orario e invia la richiesta.
        </p>
        <ListinoFlow services={services} addons={addons} />
      </main>
      <Footer />
    </>
  );
}