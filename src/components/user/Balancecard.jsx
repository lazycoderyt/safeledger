"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * components/user/BalanceCard.jsx
 * Primary account balance card — wide royal-blue canvas with identity
 * header, live clock, headline balance, quick-action rails, and a
 * footer routing/status bar. Reads identity straight off AuthContext.
 * Type scale is mobile-first: every size starts small on narrow
 * viewports and steps up at sm:/md: so long balances and account
 * numbers never overflow or force horizontal scroll on a phone.
 */

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Built from native Date getters — reflects whatever local clock the
// viewing device is set to.
function formatLiveClock(date) {
  const weekday = WEEKDAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${weekday}, ${month} ${day}, ${year} at ${hours}:${minutes}:${seconds} ${meridiem}`;
}

function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function formatCurrency(amount, currency = "USD") {
  const value = typeof amount === "number" ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function getInitial(name) {
  if (!name) return "S";
  return name.trim().charAt(0).toUpperCase();
}

export default function BalanceCard({ account }) {
  const { profile } = useAuth();

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { label: "Receive", icon: ArrowDown },
    { label: "Send", icon: ArrowUp },
    { label: "Swap", icon: RefreshCw },
  ];

  return (
    <div className="rounded-2xl bg-[#1e29bb] p-5 sm:rounded-3xl sm:p-8">
      {/* ---------------- Top header row ---------------- */}
      <div className="flex items-start justify-between gap-3">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile?.name ? `${profile.name}'s avatar` : "User avatar"}
              className="h-9 w-9 shrink-0 rounded-full border border-white/30 object-cover sm:h-12 sm:w-12"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-bold text-white sm:h-12 sm:w-12 sm:text-lg"
            >
              {getInitial(profile?.name)}
            </span>
          )}

          {/* Mobile: greeting on its own row, then name below. */}
          <div className="flex min-w-0 flex-col sm:hidden">
            <span className="text-xs font-normal text-blue-200/80">
              {getGreeting(now)}
            </span>
            <span className="truncate text-sm font-bold text-white">
              {profile?.name || "Account Holder"}
            </span>
          </div>

          {/* Desktop: greeting + name, free to wrap onto its own row
              when the combined text runs long. */}
          <p className="hidden flex-wrap items-baseline gap-x-1.5 text-lg font-bold text-white sm:flex">
            <span className="font-normal text-blue-200/80">
              {getGreeting(now)},
            </span>
            <span>{profile?.name || "Account Holder"}</span>
          </p>
        </div>

        {/* Live clock — capped to ~40% of the card width on mobile so
            it wraps within its own column instead of hogging the row;
            unconstrained from sm: up. */}
        <div className="w-2/5 shrink-0 text-right text-[10px] font-normal leading-relaxed text-blue-200/80 sm:w-auto sm:text-xs">
          {formatLiveClock(now)}
        </div>
      </div>

      {/* ---------------- Middle section ---------------- */}
      <div className="mt-6 flex flex-col gap-5 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        {/* Available balance */}
        <div className="min-w-0">
          <p className="mb-1 text-xs text-blue-200/90 sm:text-sm">
            Available Balance
          </p>
          <p className="truncate text-2xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {formatCurrency(account?.availableBalance, account?.currency)}
          </p>
        </div>

        {/* Quick action rails */}
        <div className="flex gap-2 sm:gap-3">
          {quickActions.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 p-2 text-[10px] text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:h-20 sm:w-20 sm:gap-2 sm:p-3 sm:text-xs"
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Footer bar ---------------- */}
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/5 bg-blue-800/40 p-3.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-4">
        {/* Account routing */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-blue-200 sm:h-5 sm:w-5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-300 sm:text-xs">
              Your Account Number
            </p>
            <p className="truncate text-sm font-bold tracking-wide text-white sm:text-base sm:tracking-widest">
              {profile?.accountNumber || "—"}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400 sm:px-3 sm:text-xs">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            Active
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/20 sm:px-3 sm:text-xs"
          >
            Top up
            <ArrowRight
              className="h-3 w-3 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
