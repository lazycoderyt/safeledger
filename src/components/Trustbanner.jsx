"use client";

import {
  ShieldCheck,
  Landmark,
  Lock,
  BadgeCheck,
  Fingerprint,
  Radar,
} from "lucide-react";

const TRUST_ITEMS = [
  { label: "FDIC-Insured Partner Bank", icon: Landmark },
  { label: "SOC 2 Type II Certified", icon: BadgeCheck },
  { label: "256-bit AES Encryption", icon: Lock },
  { label: "Biometric Account Access", icon: Fingerprint },
  { label: "24/7 Fraud Monitoring", icon: Radar },
  { label: "Bank-Grade Custody", icon: ShieldCheck },
];

/**
 * TrustCarousel — clean, auto-scrolling trust-badge marquee.
 * Sits directly beneath the fixed Navbar, above the Hero.
 * Stack: Next.js + Tailwind CSS + lucide-react
 *
 * Note: the seamless-loop keyframes can't be expressed with stock
 * Tailwind utilities, so a small <style> block defines `@keyframes
 * marquee` and honors prefers-reduced-motion.
 */
export default function TrustCarousel() {
  // Render the item list twice back-to-back so the track can loop
  // seamlessly from -50% back to 0.
  const track = [...TRUST_ITEMS, ...TRUST_ITEMS];

  return (
    <section
      aria-label="Trust and security credentials"
      className="relative bg-white pt-24 pb-8 sm:pt-28 sm:pb-10"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-widest text-slate-400 shrink-0">
            Trusted Foundation
          </span>
          <span className="hidden sm:block h-px flex-1 bg-slate-200" />
        </div>

        {/* Fading-edge viewport */}
        <div className="group relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <ul className="flex w-max animate-marquee items-center gap-3 group-hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {track.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={`${item.label}-${i}`} className="shrink-0">
                  <div
                    tabIndex={0}
                    className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/70 px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                  >
                    <Icon
                      className="h-4 w-4 text-blue-600 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="whitespace-nowrap text-sm font-medium text-slate-600">
                      {item.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 32s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}
