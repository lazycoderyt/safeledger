"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Lock,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  FileText,
} from "lucide-react";

// Corporate Treasury Ledger Dataset
const LEDGER_ROWS = [
  {
    label: "Treasury ACH Settlement (Incoming)",
    icon: Building2,
    amount: "+$148,500.00",
    type: "credit",
    time: "Today, 9:41 AM",
  },
  {
    label: "Commercial Vendor Outbound Wire",
    icon: FileText,
    amount: "-$12,410.85",
    type: "debit",
    time: "Today, 8:12 AM",
  },
];

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate);
      }
    };
    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

function LedgerRow({ row }) {
  const Icon = row.icon;
  const isCredit = row.type === "credit";
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isCredit ? "bg-emerald-500/10" : "bg-slate-800"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              isCredit ? "text-emerald-400" : "text-slate-400"
            }`}
            strokeWidth={2}
          />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-200 leading-tight">
            {row.label}
          </p>
          <p className="text-xs text-slate-500 mt-1">{row.time}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isCredit ? (
          <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
        ) : (
          <ArrowDownCircle className="h-4 w-4 text-slate-400" />
        )}
        <span
          className={`text-sm font-semibold tabular-nums ${
            isCredit ? "text-emerald-400" : "text-white"
          }`}
        >
          {row.amount}
        </span>
      </div>
    </div>
  );
}

function LedgerCard() {
  const balance = useCountUp(2485900.5); // Multi-million dollar institutional scale balance

  return (
    <div className="relative">
      {/* Subtle refined ambient corporate glow */}
      <div className="absolute -inset-4 rounded-[2rem] bg-blue-600/5 blur-3xl -z-10" />

      <div className="rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl p-6 sm:p-8">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Corporate Clearing Vault
            </span>
          </div>
          <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-400">
            SECURE NODE
          </span>
        </div>

        {/* Balance */}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Audited Liquid Assets
          </p>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
            $
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Ledger Feed */}
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Real-Time Settlement Log
          </p>
          {LEDGER_ROWS.map((row) => (
            <LedgerRow key={row.label} row={row} />
          ))}
        </div>

        {/* Compliance Footnote */}
        <div className="mt-7 flex items-center justify-between border-t border-slate-800 pt-5 text-[10px] font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-blue-500" />
            256-bit Hardware Encrypted
          </span>
          <span>Routing: 021000021</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-40 sm:pb-28 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          {/* Left Column (Copy Layout) */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Institutional Liquidity Infrastructure
              </span>
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.1]">
              Commercial banking,{" "}
              <em className="font-serif italic font-normal text-blue-600">
                precision engineered.
              </em>
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-500 leading-relaxed">
              SafeLedger provides enterprise-tier custody, absolute real-time
              clearing rails, and programmatic treasury execution. Deploy
              capital across global markets with unyielding structural
              compliance.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href="#open-account"
                className="group inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-6 py-4 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all w-full sm:w-auto"
              >
                Establish Corporate Account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#treasury-services"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-6 py-4 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors w-full sm:w-auto"
              >
                Review Treasury Solutions
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            {/* Strict Financial Metrics */}
            <div className="mt-14 flex items-center gap-8 border-t border-slate-100 pt-8">
              <div>
                <p className="text-2xl font-black tracking-tight text-[#0F172A]">
                  $14.2B
                </p>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mt-1">
                  Assets Under Custody
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-2xl font-black tracking-tight text-[#0F172A]">
                  0.00ms
                </p>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mt-1">
                  Settlement Latency
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-2xl font-black tracking-tight text-[#0F172A]">
                  FDIC
                </p>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mt-1">
                  Insured Institution
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Visual Dashboard Card) */}
          <div className="lg:pl-6">
            <LedgerCard />
          </div>
        </div>
      </div>
    </section>
  );
}
