"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

/**
 * HeroCarousel — image-led hero carousel for Apex Global.
 * Sits directly below the fixed Navbar, above the rest of the page content.
 * Stack: Next.js + Tailwind CSS + lucide-react
 */
const SLIDES = [
  {
    id: "stewardship",
    image:
      "https://encrypted-tbn3.gstatic.com/licensed-image?q=tbn:ANd9GcREaYORjf7HPZL3jkWToH0dL5H0zxH4OtjDgFZTYxOUREkkKDucRu5PgACFgv4mIeejmnO-Gnj56HE74Tg",
    imageAlt:
      "Senior banking relationship manager smiling in a sunlit office, reviewing investment data on a tablet",
    eyebrow: "Est. 1994 \u00b7 Institutional Trust",
    headline: "Dedicated Financial Stewardship",
    subheadline:
      "For three decades, we have anchored educational institutional capital with unyielding security standards.",
    primaryCta: { label: "Meet Our Advisors", href: "#advisors" },
    secondaryCta: { label: "Our Security Protocol", href: "#security" },
  },
  {
    id: "student-capital",
    image:
      "https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQRXh4rqBs_lNaOsyRLq_ZYCvN6fCb22-rkc3s_FeR20igEe5XWUXuVs4FYWsuq4QlsOtvGCECQ6I_GHMo",
    imageAlt:
      "Banking advisor shaking hands with a student client across a conference table in a modern bank foyer",
    eyebrow: "Personalized \u00b7 Education-First",
    headline: "Building Tomorrow\u2019s Student Capital",
    subheadline:
      "Personalized checking, specialized grants, and advisory services built precisely for the modern educational ecosystem.",
    primaryCta: { label: "Student Banking Labs", href: "#labs" },
    secondaryCta: { label: "Disbursement API", href: "#api" },
  },
];
const AUTOPLAY_MS = 7000;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const count = SLIDES.length;

  const goTo = useCallback(
    (index) => {
      setActive(((index % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(active + 1), [active, goTo]);
  const goPrev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Autoplay with pause on hover/focus and prefers-reduced-motion respect
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (paused || prefersReducedMotion) return undefined;

    timerRef.current = setInterval(goNext, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, goNext]);

  return (
    <section
      aria-label="Featured highlights"
      className="relative w-full overflow-hidden bg-[#0F172A]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Fixed-height viewport that scales down smoothly on mobile sizes */}
      <div className="relative h-[600px] sm:h-[640px] lg:h-[700px]">
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
                isActive
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Layout Container holding both Image and Text Absolute Base Layer */}
              <div className="relative w-full h-full flex items-center">
                {/* Photograph — Pushed to layout background */}
                <div className="absolute inset-0 w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    className="h-full w-full object-cover object-center lg:object-[85%_center]"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  {/* Deep Scrim Layer: Enhances contrast dramatically over real photography */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/95 via-[#0F172A]/70 to-[#0F172A]/30 sm:bg-gradient-to-r sm:from-[#0F172A]/95 sm:via-[#0F172A]/75 sm:to-[#0F172A]/20" />
                </div>

                {/* Text Content Grid Overlay */}
                <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                  <div className="max-w-2xl text-left">
                    {/* Institutional Micro Eyebrow */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/40 backdrop-blur-md px-4 py-1.5 shadow-inner">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-200">
                        {slide.eyebrow}
                      </span>
                    </div>

                    {/* Main Trust Headline */}
                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight text-white drop-shadow-sm">
                      {slide.headline}
                    </h2>

                    {/* Description Copy */}
                    <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-300 max-w-xl drop-shadow-md">
                      {slide.subheadline}
                    </p>

                    {/* Action Callouts */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                      <a
                        href={slide.primaryCta.href}
                        tabIndex={isActive ? 0 : -1}
                        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all duration-200"
                      >
                        {slide.primaryCta.label}
                      </a>
                      <a
                        href={slide.secondaryCta.href}
                        tabIndex={isActive ? 0 : -1}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-400/60 bg-slate-900/20 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white transition-all duration-200"
                      >
                        {slide.secondaryCta.label}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* --- Navigation Arrows --- */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous slide"
          className="hidden sm:flex absolute left-4 lg:left-8 top-1/2 z-30 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-900/40 text-white backdrop-blur-md hover:bg-slate-900/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next slide"
          className="hidden sm:flex absolute right-4 lg:right-8 top-1/2 z-30 -translate-y-1/2 h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-slate-900/40 text-white backdrop-blur-md hover:bg-slate-900/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* --- Slide Indicators --- */}
        <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}: ${slide.headline}`}
              aria-current={index === active}
              className="group relative h-3 w-3 rounded-full focus:outline-none"
            >
              <span
                className={`absolute inset-0 rounded-full border border-white/50 transition-all ${
                  index === active
                    ? "bg-blue-500 border-blue-400 scale-110 shadow-md shadow-blue-500/50"
                    : "bg-transparent group-hover:bg-white/40"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
