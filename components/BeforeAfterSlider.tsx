"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ChevronsLeftRight } from "lucide-react";

type Props = {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
};

export function BeforeAfterSlider({ before, after, beforeAlt, afterAlt }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touched = useRef(false);
  const hint = useRef<ReturnType<typeof animate> | null>(null);

  const x = useMotionValue(50);
  const clip = useTransform(x, (v) => `inset(0 ${100 - v}% 0 0)`);
  const left = useTransform(x, (v) => `${v}%`);
  const beforeChipOpacity = useTransform(x, [0, 16], [0, 1]);
  const afterChipOpacity = useTransform(x, [84, 100], [1, 0]);

  const [value, setValue] = useState(50);
  useMotionValueEvent(x, "change", (v) => setValue(Math.round(v)));

  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  // Piccolo movimento dimostrativo, una sola volta, per far capire che si trascina.
  useEffect(() => {
    if (!inView || reduce || touched.current) return;
    hint.current = animate(x, [50, 34, 66, 50], { duration: 2.2, ease: "easeInOut", delay: 0.3 });
    return () => hint.current?.stop();
  }, [inView, reduce, x]);

  const markTouched = () => {
    touched.current = true;
    hint.current?.stop();
  };

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      x.set(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
    },
    [x]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    markTouched();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === "mouse") setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = x.get() - step;
    else if (e.key === "ArrowRight") next = x.get() + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    markTouched();
    x.set(Math.min(100, Math.max(0, next)));
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative aspect-[4/3] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-lg border border-testo/10 bg-anthracite md:aspect-[16/10]"
    >
      {/* Dopo (base) */}
      <Image
        src={after}
        alt={afterAlt}
        fill
        sizes="(min-width: 1152px) 1100px, 100vw"
        className="object-cover"
        draggable={false}
      />

      {/* Prima (sopra, ritagliata) */}
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <Image
          src={before}
          alt={beforeAlt}
          fill
          sizes="(min-width: 1152px) 1100px, 100vw"
          className="object-cover"
          draggable={false}
        />
      </motion.div>

      <motion.span
        style={{ opacity: beforeChipOpacity }}
        className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-carbon/70 px-2.5 py-1 text-xs font-medium text-testo backdrop-blur"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-ghiaccio" />
        Prima
      </motion.span>
      <motion.span
        style={{ opacity: afterChipOpacity }}
        className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-carbon/70 px-2.5 py-1 text-xs font-medium text-testo backdrop-blur"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-oro" />
        Dopo
      </motion.span>

      {/* Maniglia */}
      <motion.div className="pointer-events-none absolute inset-y-0 w-0" style={{ left }}>
        <div className="absolute inset-y-0 left-0 flex w-11 -translate-x-1/2 items-center justify-center">
          <span aria-hidden className="absolute inset-y-0 w-0.5 bg-oro shadow-glow" />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Confronto prima e dopo"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={`Prima ${value}%, dopo ${100 - value}%`}
            onKeyDown={onKeyDown}
            className="pointer-events-auto relative grid h-11 w-11 place-items-center rounded-full border border-oro bg-carbon/85 text-oro backdrop-blur"
          >
            <ChevronsLeftRight size={20} aria-hidden />
          </div>
        </div>
      </motion.div>
    </div>
  );
}