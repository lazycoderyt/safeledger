"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Cpu, Wifi, Lock } from "lucide-react";

/**
 * components/user/cards/VirtualCard.jsx
 * Skeuomorphic physical-card component with a real 3D CSS flip
 * (perspective + backface-visibility, no JS animation library) and a
 * frozen-state blur overlay.
 * Stack: Next.js + Tailwind CSS + lucide-react
 */
export default function VirtualCard({
  name,
  last4 = "4892",
  fullNumber = "4592 8831 0026 4892",
  cvv = "384",
  expiry = "09/29",
  frozen = false,
  cardLabel = "DEBIT CARD",
}) {
  const [revealed, setRevealed] = useState(false);

  // Freezing the card should never leave sensitive details exposed —
  // force it back to the masked front face the moment it freezes.
  useEffect(() => {
    if (frozen) setRevealed(false);
  }, [frozen]);

  const displayName = (name || "Account Holder").toUpperCase();

  return (
    <div className="flex flex-col items-center sm:items-start gap-4">
      <div className="relative w-full max-w-md">
        {/* 3D flip stage */}
        <div className="[perspective:1600px]">
          <div
            className={`relative h-56 w-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] ${
              revealed ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            {/* ---------------- Front face ---------------- */}
            <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl shadow-slate-900/20 flex flex-col justify-between overflow-hidden">
              {/* subtle sheen */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

              <div className="flex items-start justify-between">
                <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent text-lg font-bold tracking-tight">
                  Apex Global
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {cardLabel}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner">
                  <Cpu
                    className="h-5 w-5 text-yellow-900/70 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]"
                    aria-hidden="true"
                  />
                </div>
                <Wifi
                  className="h-5 w-5 rotate-90 text-white/60"
                  aria-hidden="true"
                />
              </div>

              <div>
                <p className="font-mono text-xl tracking-[0.2em] text-slate-100">
                  •••• •••• •••• {last4}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-sm font-semibold tracking-wide text-slate-200">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-400">
                    VALID THRU <span className="text-slate-200">{expiry}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ---------------- Back face ---------------- */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl shadow-slate-900/20 flex flex-col overflow-hidden">
              <div className="mt-6 h-10 w-full bg-slate-950" />
              <div className="flex-1 px-6 py-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Full Card Number
                  </p>
                  <p className="mt-1 font-mono text-lg tracking-widest text-slate-100">
                    {fullNumber}
                  </p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      CVV
                    </p>
                    <p className="mt-1 font-mono text-lg tracking-widest text-slate-100">
                      {cvv}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Expires
                    </p>
                    <p className="mt-1 font-mono text-lg tracking-widest text-slate-100">
                      {expiry}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status badge — sits above the frozen overlay regardless of flip state */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              frozen ? "bg-amber-400" : "bg-emerald-400"
            }`}
            aria-hidden="true"
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-200">
            {frozen ? "Frozen" : "Active"}
          </span>
        </div>

        {/* Frozen overlay — outside the 3D transform tree so it covers both faces */}
        {frozen && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-100/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm">
              <Lock className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700">
                Card authorizations locked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reveal toggle */}
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        disabled={frozen}
        title={frozen ? "Unfreeze the card to view details" : undefined}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {revealed ? (
          <>
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Hide Details
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Reveal Details
          </>
        )}
      </button>
    </div>
  );
}
