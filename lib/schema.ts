import { site } from "./site";

// Schema.org: AutoRepair è un sottotipo di LocalBusiness.
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["AutoRepair", "LocalBusiness"],
    "@id": `${site.url}/#business`,
    name: site.name,
    alternateName: ["DCC Detailing", "Deep Car Care"],
    description: site.description,
    url: site.url,
    image: `${site.url}/og.jpg`,
    logo: `${site.url}/logo.png`,
    telephone: site.phone,
    email: site.email,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    areaServed: { "@type": "City", name: "Ravenna" },
    openingHoursSpecification: site.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Detailing interni",
      itemListElement: site.services.map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name, serviceType: "Detailing interni auto" },
      })),
    },
    ...(site.social.length > 0 ? { sameAs: site.social } : {}),
  };
}