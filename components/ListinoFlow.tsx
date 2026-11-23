"use client";

import { useMemo, useState } from "react";
import { ListinoConfigurator } from "./ListinoConfigurator";
import PrenotaForm from "./PrenotaForm";
import type { Addon, Service, VehicleSize } from "../lib/catalog";

// Add-on già compresi nel pacchetto: non vengono mostrati come extra
const INCLUDED_ADDONS: Record<string, string[]> = {
  "showroom-reborn": ["upgrade-lava-aspira"],
};

export function ListinoFlow({ services, addons }: { services: Service[]; addons: Addon[] }) {
  const [size, setSize] = useState<VehicleSize>("sedan");
  const [serviceId, setServiceId] = useState<string>(
    (services.find((s) => s.is_featured) ?? services[0]).id
  );
  const [selected, setSelected] = useState<string[]>([]);

  const service = services.find((s) => s.id === serviceId) ?? services[0];

  // Solo gli extra compatibili con il pacchetto scelto, esclusi quelli già inclusi
  const visibleAddons = useMemo(() => {
    const included = INCLUDED_ADDONS[service?.slug ?? ""] ?? [];
    const allowed = service?.addonIds ?? [];
    return addons.filter((a) => !included.includes(a.slug) && allowed.includes(a.id));
  }, [addons, service]);

  const selectedIds = selected.filter((id) => visibleAddons.some((a) => a.id === id));

  function toggleAddon(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <>
      <div id="listino">
        <ListinoConfigurator
          services={services}
          addons={visibleAddons}
          size={size}
          onSizeChange={setSize}
          serviceId={serviceId}
          onServiceChange={setServiceId}
          selectedIds={selectedIds}
          onToggleAddon={toggleAddon}
        />
      </div>

      <section id="prenota" className="mt-24 scroll-mt-28 border-t border-white/10 pt-12">
        <h2 className="text-3xl font-semibold">Scegli data e orario</h2>
        <p className="mt-3 text-white/70">
          Gli orari disponibili dipendono dalla durata della tua selezione. Poi compila i dati e invia la richiesta.
        </p>
        <div className="mt-10">
          <PrenotaForm
            services={services}
            addons={visibleAddons}
            serviceId={serviceId}
            size={size}
            addonIds={selectedIds}
          />
        </div>
      </section>
    </>
  );
}