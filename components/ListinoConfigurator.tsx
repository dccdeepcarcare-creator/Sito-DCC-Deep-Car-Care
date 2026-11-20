"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { VEHICLE_SIZES, formatDuration, formatEuro } from "@/lib/catalog";
import type { Addon, PriceInfo, Service, VehicleSize } from "@/lib/catalog";

type Props = {
  services: Service[];
  addons: Addon[];
  size: VehicleSize;
  onSizeChange: (v: VehicleSize) => void;
  serviceId: string;
  onServiceChange: (id: string) => void;
  selectedIds: string[];
  onToggleAddon: (id: string) => void;
};

const cardBase =
  "relative flex cursor-pointer flex-col rounded-lg border p-5 transition-colors focus-within:ring-2 focus-within:ring-ghiaccio";
const cardOn = "border-oro bg-anthracite";
const cardOff = "border-testo/10 bg-anthracite/60 hover:border-testo/30";
const legendClass = "stretch-wide text-sm font-semibold uppercase tracking-[0.2em] text-oro";

function priceText(p?: PriceInfo) {
  return p ? `${p.from ? "da " : ""}${formatEuro(p.cents)}` : "Su richiesta";
}

export function ListinoConfigurator({
  services,
  addons,
  size,
  onSizeChange,
  serviceId,
  onServiceChange,
  selectedIds,
  onToggleAddon,
}: Props) {
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const servicePrice = service.prices[size];

  const chosenAddons = useMemo(
    () => addons.filter((a) => selectedIds.includes(a.id)),
    [addons, selectedIds]
  );
  const addonsCents = chosenAddons.reduce((sum, a) => sum + a.price_cents, 0);
  const totalCents = (servicePrice?.cents ?? 0) + addonsCents;
  const totalMin = service.duration_min + chosenAddons.reduce((sum, a) => sum + a.duration_min, 0);
  const sizeLabel = VEHICLE_SIZES.find((v) => v.value === size)?.label ?? "";

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-12">
        <fieldset>
          <legend className={legendClass}>1. Categoria auto</legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VEHICLE_SIZES.map((v) => {
              const on = v.value === size;
              return (
                <label key={v.value} className={`${cardBase} ${on ? cardOn : cardOff}`}>
                  <input
                    type="radio"
                    name="categoria"
                    value={v.value}
                    checked={on}
                    onChange={() => onSizeChange(v.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-testo">{v.label}</span>
                  <span className="mt-1 text-sm text-testo/55">{v.example}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legendClass}>2. Pacchetto base</legend>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {services.map((s) => {
              const active = s.id === serviceId;
              const p = s.prices[size];
              return (
                <label key={s.id} className={`${cardBase} ${active ? cardOn : cardOff}`}>
                  <input
                    type="radio"
                    name="servizio"
                    value={s.id}
                    checked={active}
                    onChange={() => onServiceChange(s.id)}
                    className="sr-only"
                  />
                  {s.is_featured && (
                    <span className="absolute right-4 top-4 rounded bg-oro px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-carbon">
                      Il più scelto
                    </span>
                  )}
                  <span className="font-semibold text-testo">{s.name}</span>
                  {s.tagline && <span className="mt-1 text-sm text-testo/60">{s.tagline}</span>}
                  <span className="mt-5 text-2xl font-bold text-testo">{priceText(p)}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-testo/60">
                    <Clock size={14} aria-hidden />
                    {formatDuration(s.duration_min)}
                  </span>
                </label>
              );
            })}
          </div>

          <ul className="mt-6 grid gap-2 text-sm text-testo/75 sm:grid-cols-2">
            {service.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-oro" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </fieldset>

        {addons.length > 0 && (
          <fieldset>
            <legend className={legendClass}>3. Add-on</legend>
            <div className="mt-5 grid gap-3">
              {addons.map((a) => {
                const on = selectedIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-ghiaccio ${
                      on ? cardOn : cardOff
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleAddon(a.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${
                        on ? "border-oro bg-oro text-carbon" : "border-testo/30 text-transparent"
                      }`}
                    >
                      <Check size={16} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-testo">{a.name}</span>
                      {a.description && <span className="block text-sm text-testo/60">{a.description}</span>}
                    </span>
                    <span className="text-right text-sm">
                      <span className="block font-semibold text-testo">+ {formatEuro(a.price_cents)}</span>
                      <span className="block text-testo/55">+ {formatDuration(a.duration_min)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-lg border border-testo/10 bg-anthracite p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-testo/60">Riepilogo</p>
          <p className="mt-2 text-sm text-testo/60">Categoria: {sizeLabel}</p>

          <ul className="mt-4 space-y-2 text-sm text-testo/80">
            <li className="flex justify-between gap-4">
              <span>{service.name}</span>
              <span>{priceText(servicePrice)}</span>
            </li>
            <AnimatePresence initial={false}>
              {chosenAddons.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between gap-4 overflow-hidden"
                >
                  <span>{a.name}</span>
                  <span>+ {formatEuro(a.price_cents)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-6 border-t border-testo/10 pt-5">
            <div className="flex items-end justify-between">
              <span className="text-sm text-testo/60">Totale</span>
              <motion.span
                key={totalCents}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold text-testo"
              >
                {servicePrice?.from ? "da " : ""}
                {formatEuro(totalCents)}
              </motion.span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-testo/60">
              <Clock size={14} aria-hidden />
              Durata stimata: {formatDuration(totalMin)}
            </p>
          </div>

          {servicePrice?.from && (
            <p className="mt-4 text-xs leading-relaxed text-testo/55">
              Prezzo di partenza: il preventivo definitivo viene confermato dopo la visione dell&apos;auto.
            </p>
          )}

          {servicePrice ? (
            <a
              href="#prenota"
              className="mt-6 flex w-full items-center justify-center rounded-md bg-oro px-6 py-3.5 font-semibold text-carbon shadow-glow transition-colors hover:bg-oro-light"
            >
              Scegli data e orario
            </a>
          ) : (
            <p className="mt-6 rounded-md border border-testo/15 px-6 py-3.5 text-center text-sm text-testo/60">
              Per questa categoria scrivici per un preventivo.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-testo/50">Servizio a domicilio a Cesena, Forlì e Ravenna.</p>
        </div>
      </aside>
    </div>
  );
}