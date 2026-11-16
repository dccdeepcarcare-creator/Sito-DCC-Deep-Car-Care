// Dati dell'attività: unica fonte per footer, SEO e Schema Markup.
// DA SOSTITUIRE con i dati reali prima della pubblicazione.
export const site = {
  name: "DCC — Deep Car Care",
  title: "DCC Detailing — Deep Car Care | Detailing Interni ed Esterni a Ravenna",
  description:
    "Detailing interni a Ravenna: pulizia profonda, sanificazione e protezione di sedili, pelle e plastiche. Prenota il tuo appuntamento da DCC — Deep Car Care.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "it_IT",
  phone: "+39 000 000 0000",
  email: "info@example.it",
  address: {
    street: "Via Esempio 1",
    city: "Ravenna",
    region: "RA",
    postalCode: "48121",
    country: "IT",
  },
  geo: { latitude: 44.4184, longitude: 12.2035 },
  openingHours: [
    {
      label: "Lun–Ven",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ] as { label: string; days: string[]; opens: string; closes: string }[],
  social: [] as string[],
  services: ["Interior Refresh", "Interior Deep Clean", "Interior Signature"],
};