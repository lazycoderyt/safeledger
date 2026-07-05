"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Menu,
  X,
  Bell,
  LogOut,
  Clock,
  HandCoins,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";

/**
 * components/admin/AdminNavbar.jsx
 * Comprehensive navigation for the admin console — mirrors the
 * structure of components/user/Navbar.jsx (fixed desktop sidebar,
 * sliding mobile drawer with backdrop) but scoped to admin actions:
 * reviewing all users, adjusting balances, and managing transactions.
 *
 * Visual note: active links use an indigo accent (vs. the user side's
 * blue) and the brand carries a small "Admin" badge — a deliberate,
 * always-visible cue that you're in the elevated-privilege console,
 * since this is the surface that can directly edit balances and
 * transaction records.
 */

const NAV_BLOCKS = [
  {
    label: "Overview",
    items: [
      {
        label: "Admin Dashboard",
        href: "/dashboard/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "User Management",
    items: [
      { label: "All Users", href: "/dashboard/admin/users", icon: Users },
      {
        label: "Balance Adjustments",
        href: "/dashboard/admin/balance",
        icon: Wallet,
      },
    ],
  },
  {
    label: "Transaction Oversight",
    items: [
      {
        label: "All Transactions",
        href: "/dashboard/admin/transactions",
        icon: Receipt,
      },
    ],
  },
  {
    label: "Lending",
    items: [
      {
        label: "Loan Applications",
        href: "/dashboard/admin/loans",
        icon: HandCoins,
      },
    ],
  },
];

function getInitials(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "AD";
}

/* ------------------------------------------------------------------ */
/* Brand lockup                                                        */
/* ------------------------------------------------------------------ */
function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/icon.png"
        alt="SafeLedger"
        width={32}
        height={32}
        className="h-8 w-8 rounded-md"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tracking-tight text-slate-900">
          SafeLedger
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          Admin
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav link — indigo active accent to distinguish from the user side  */
/* ------------------------------------------------------------------ */
function NavLink({ item, pathname, onNavigate }) {
  const Icon = item.icon;
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-r-md border-l-2 py-2.5 pl-[10px] pr-3 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function NavContent({ pathname, onNavigate }) {
  return (
    <nav
      className="flex-1 overflow-y-auto px-4 py-6 space-y-7"
      aria-label="Admin navigation"
    >
      {NAV_BLOCKS.map((block) => (
        <div key={block.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {block.label}
          </p>
          <div className="mt-2 space-y-1">
            {block.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Identity widget — fixed to the bottom of the desktop sidebar       */
/* ------------------------------------------------------------------ */
function IdentityWidget({ profile, onLogout, loggingOut }) {
  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex items-center gap-3">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile?.name ? `${profile.name}'s avatar` : "Admin avatar"}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 border border-indigo-200"
          >
            {getInitials(profile?.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {profile?.name || "Administrator"}
          </p>
          <p className="truncate text-xs text-slate-500">Administrator</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {loggingOut ? "Signing out…" : "Log Out"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notification bell — real, live counts of items needing admin      */
/* action (pending transactions + pending loan/mortgage applications) */
/* ------------------------------------------------------------------ */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [pendingLoans, setPendingLoans] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const txnQuery = query(
      collection(db, "transactions"),
      where("status", "==", "Pending"),
    );
    const unsubscribeTxns = onSnapshot(
      txnQuery,
      (snap) => setPendingTransactions(snap.size),
      (err) => console.error("Failed to stream pending transactions:", err),
    );

    const loanQuery = query(
      collection(db, "loans"),
      where("status", "==", "Pending Review"),
    );
    const unsubscribeLoans = onSnapshot(
      loanQuery,
      (snap) => setPendingLoans(snap.size),
      (err) => console.error("Failed to stream pending loans:", err),
    );

    return () => {
      unsubscribeTxns();
      unsubscribeLoans();
    };
  }, []);

  const totalPending = pendingTransactions + pendingLoans;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="View items needing review"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
        {totalPending > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
          >
            {totalPending}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Items needing review"
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Needs Review</p>
          </div>
          <div className="divide-y divide-slate-100">
            <Link
              href="/dashboard/admin/transactions"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Pending Transactions
              </span>
              <span className="text-sm font-bold text-slate-900">
                {pendingTransactions}
              </span>
            </Link>
            <Link
              href="/dashboard/admin/users"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <HandCoins
                  className="h-4 w-4 text-amber-500"
                  aria-hidden="true"
                />
                Pending Loan Applications
              </span>
              <span className="text-sm font-bold text-slate-900">
                {pendingLoans}
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main export                                                        */
/* ------------------------------------------------------------------ */
export default function AdminNavbar() {
  const { profile, logoutUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
      router.push("/auth/sign-in");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* ---------------- Mobile top utility bar ---------------- */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <BrandMark />
        </div>
        <NotificationBell />
      </header>

      {/* ---------------- Mobile drawer + backdrop ---------------- */}
      <div
        aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation menu"
        className={`md:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <BrandMark />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <NavContent
          pathname={pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
        <IdentityWidget
          profile={profile}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>

      {/* ---------------- Desktop fixed sidebar ---------------- */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:flex-col bg-white border-r border-slate-200">
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200">
          <BrandMark />
          <NotificationBell />
        </div>

        <NavContent pathname={pathname} onNavigate={undefined} />
        <IdentityWidget
          profile={profile}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>
    </>
  );
}
