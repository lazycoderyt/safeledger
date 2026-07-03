"use client";

import { Landmark, Ship, ShieldCheck } from "lucide-react";

/**
 * AboutServices — institutional narrative + infrastructure imagery +
 * core solutions grid, combined into one cohesive section.
 * Stack: Next.js + Tailwind CSS + lucide-react
 */
const INFRASTRUCTURE_IMAGES = [
  {
    id: "banking",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    alt: "Modern architectural glass skyscraper representing institutional financial power and banking headquarters",
    caption: "Global Banking Operations",
  },
  {
    id: "logistics",
    image:
      "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&w=1200&q=80",
    alt: "Large modern commercial freight container ship transporting assets across global maritime supply chains",
    caption: "Maritime Logistics Network",
  },
];

const SERVICES = [
  {
    id: "capital",
    icon: Landmark,
    title: "Cross-Border Trade Finance",
    description:
      "Letters of credit, automated multi-currency escrow accounts, and lines of credit optimized for international distribution.",
  },
  {
    id: "logistics",
    icon: Ship,
    title: "End-to-End Freight Custody",
    description:
      "Programmatic tracking, secure maritime freight coordination, and verified asset protection from origin to delivery.",
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    title: "Institutional Risk Mitigation",
    description:
      "256-bit automated compliance auditing, real-time customs ledger clearings, and comprehensive cargo indemnification.",
  },
];

export default function AboutServices() {
  return (
    <section
      aria-label="About SafeLedger and core solutions"
      className="bg-white border-t border-[#E2E8F0]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 sm:py-24">
        {/* ---------- Layer 1: Institutional Narrative ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-8 gap-x-16 items-start">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Integrated Capital &amp; Logistics
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#0F172A] leading-[1.1]">
              The financial engine behind global supply chains.
            </h2>
          </div>

          <div className="space-y-5 lg:pt-2">
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              SafeLedger anchors cross-border trade at institutional scale,
              combining multi-billion dollar banking liquidity with the
              operational precision of frictionless asset movement. Capital and
              cargo move on a single, unified ledger.
            </p>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              From letter-of-credit issuance to customs clearance, every stage
              is underwritten by the same institutional-grade security standards
              our banking partners have relied on for three decades of
              continuous execution.
            </p>
          </div>
        </div>

        {/* ---------- Layer 2: Dual Split-Image Showcase ---------- */}
        <div
          aria-label="Banking and logistics infrastructure"
          className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm"
        >
          {INFRASTRUCTURE_IMAGES.map((item) => (
            <figure
              key={item.id}
              className="relative bg-white group overflow-hidden"
            >
              <div className="aspect-[4/3] sm:aspect-[16/11] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.alt}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />
              </div>
              <figcaption className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/30 to-transparent flex items-end px-6 py-5">
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  {item.caption}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* ---------- Layer 3: Core Solutions Grid ---------- */}
        <div
          aria-label="Core solutions"
          className="mt-14 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 border-t border-[#E2E8F0]"
        >
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className={`px-0 sm:px-8 py-10 first:pl-0 last:pr-0 ${
                  index !== 0 ? "sm:border-l border-[#E2E8F0]" : ""
                } ${index !== 0 ? "border-t sm:border-t-0" : ""}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <Icon
                    className="h-5 w-5 text-blue-600"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-5 text-lg font-bold text-[#0F172A]">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
