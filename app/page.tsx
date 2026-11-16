import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { PortfolioBeforeAfter } from "@/components/PortfolioBeforeAfter";
import { VideoReel } from "@/components/VideoReel";
import { Footer } from "@/components/Footer";
import { getPortfolio } from "@/lib/portfolio";

// I nuovi lavori caricati dalla dashboard compaiono entro 60 secondi.
export const revalidate = 60;

export default async function HomePage() {
  const { beforeAfter, videos } = await getPortfolio();

  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <PortfolioBeforeAfter items={beforeAfter} />
        <VideoReel videos={videos} />
      </main>
      <Footer />
    </>
  );
}