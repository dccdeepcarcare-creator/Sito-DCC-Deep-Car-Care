import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import PrenotaForm from '../../components/PrenotaForm';
import { getCatalog } from '../../lib/catalog';

export const revalidate = 300;

export const metadata = {
  title: 'Prenota | DCC Deep Car Care',
};

export default async function PrenotaPage({
  searchParams,
}: {
  searchParams: { servizio?: string; categoria?: string; addon?: string };
}) {
  const { services, addons } = await getCatalog();

  return (
    <>
      <Navbar />
      <main className='mx-auto max-w-3xl px-6 pb-20 pt-32'>
        <h1 className='text-4xl font-semibold'>Prenota il tuo appuntamento</h1>
        <p className='mt-3 text-white/70'>
  Scegli servizio e orario, indica l&apos;auto e l&apos;indirizzo. Ti confermiamo
  l&apos;appuntamento e il prezzo definitivo dopo aver visto le foto dell&apos;auto.
</p>
        <div className='mt-10'>
          <PrenotaForm services={services} addons={addons} initial={searchParams} />
        </div>
      </main>
      <Footer />
    </>
  );
}