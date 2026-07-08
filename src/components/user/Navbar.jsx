"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Wallet,
  Landmark,
  HandCoins,
  Home,
  Send,
  Receipt,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";
import { useChatThreadMeta } from "@/utils/useChatThreadMeta";

/**
 * components/user/Navbar.jsx
 * Responsive dashboard sidebar for SafeLedger — clean, trustworthy
 * corporate white theme.
 * Desktop (md+): fixed left column, w-64, full height.
 * Mobile (<md): top utility bar + sliding drawer with backdrop.
 * Stack: Next.js + Tailwind CSS + lucide-react
 *
 * Usage: rendered inside src/app/dashboard/user/layout.js, alongside
 * page content offset by `md:pl-64` (and `pt-14` on mobile to clear
 * the top bar).
 */

const NAV_BLOCKS = [
  {
    type: "group",
    label: "Core Ledger",
    items: [
      {
        label: "Overview Dashboard",
        href: "/dashboard/user",
        icon: LayoutDashboard,
      },
      {
        label: "Account Analytics",
        href: "/dashboard/user/accounts",
        icon: BarChart3,
      },
    ],
  },
  {
    type: "dropdown",
    id: "cards",
    label: "Card Management",
    icon: CreditCard,
    items: [
      {
        label: "Corporate Debit",
        href: "/dashboard/user/cards/debit",
        icon: Wallet,
      },
      {
        label: "Credit Lines",
        href: "/dashboard/user/cards/credit",
        icon: CreditCard,
      },
    ],
  },
  {
    type: "dropdown",
    id: "credit",
    label: "Credit & Funding",
    icon: Landmark,
    items: [
      {
        label: "Institutional Loans",
        href: "/dashboard/user/loans/apply",
        icon: HandCoins,
      },
      {
        label: "Active Mortgages",
        href: "/dashboard/user/loans/mortages",
        icon: Home,
      },
    ],
  },
  {
    type: "group",
    label: "Move Capital",
    items: [
      { label: "Wire Transfers", href: "/dashboard/user/transfer", icon: Send },
      {
        label: "Bill Pay & Settlement",
        href: "/dashboard/user/billpay",
        icon: Receipt,
      },
    ],
  },
  {
    type: "group",
    label: "Support",
    items: [
      {
        label: "Support Chat",
        href: "/dashboard/user/support",
        icon: MessageCircle,
      },
    ],
  },
  {
    type: "group",
    label: "System Control",
    items: [
      {
        label: "Settings & Security",
        href: "/dashboard/user/settings",
        icon: Settings,
      },
    ],
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    title: "Tuition Grant Disbursement",
    detail: "+$3,120.00 credited to Ledger Checking",
    time: "9:41 AM",
  },
  {
    id: "n2",
    title: "Campus Bookstore Terminal",
    detail: "-$84.32 debited from Ledger Checking",
    time: "8:12 AM",
  },
  {
    id: "n3",
    title: "Security Alert",
    detail: "New device sign-in detected",
    time: "Yesterday",
  },
];

function getInitials(name) {
  if (!name) return "SL";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "SL";
}

/* ------------------------------------------------------------------ */
/* Shared nav link — active state gets the left-border accent treatment */
/* ------------------------------------------------------------------ */
function NavLink({
  item,
  pathname,
  onNavigate,
  indent = false,
  badgeCount = 0,
}) {
  const Icon = item.icon;
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-r-md border-l-2 py-2.5 text-sm font-medium transition-colors ${
        indent ? "pl-[18px] pr-3" : "pl-[10px] pr-3"
      } ${
        active
          ? "border-blue-600 bg-blue-50/50 text-blue-700"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {badgeCount > 0 && (
        <span
          aria-label={`${badgeCount} unread`}
          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white"
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible dropdown group (Card Management / Credit & Funding)    */
/* ------------------------------------------------------------------ */
function NavDropdown({ block, pathname, onNavigate }) {
  const isActive = block.items.some((item) => item.href === pathname);
  const [open, setOpen] = useState(isActive);
  const Icon = block.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {block.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          open
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 space-y-1">
          {block.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared nav content — rendered inside both the desktop sidebar and  */
/* the mobile drawer so the two never drift out of sync.              */
/* ------------------------------------------------------------------ */
function NavContent({ pathname, onNavigate, badgeCounts = {} }) {
  return (
    <nav
      className="flex-1 overflow-y-auto px-4 py-6 space-y-7"
      aria-label="Dashboard navigation"
    >
      {NAV_BLOCKS.map((block, index) => {
        if (block.type === "dropdown") {
          return (
            <NavDropdown
              key={block.id}
              block={block}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        }
        return (
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
                  badgeCount={badgeCounts[item.href] || 0}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* User identity widget — fixed to the bottom of the desktop sidebar  */
/* ------------------------------------------------------------------ */
function IdentityWidget({ profile, onLogout, loggingOut }) {
  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex items-center gap-3">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile?.name ? `${profile.name}'s avatar` : "User avatar"}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 border border-blue-200"
          >
            {getInitials(profile?.name)}
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {profile?.name || "Account holder"}
          </p>
          <p className="truncate font-mono text-xs text-slate-500">
            {profile?.accountNumber
              ? formatAccountNumberDisplay(profile.accountNumber)
              : "—"}
          </p>
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
/* Notification bell + popover                                        */
/* ------------------------------------------------------------------ */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const pendingCount = MOCK_NOTIFICATIONS.length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="View notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
        {pendingCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
          >
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Recent ledger activity"
          className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              Recent Activity
            </p>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
              {pendingCount} new
            </span>
          </div>
          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {MOCK_NOTIFICATIONS.map((note) => (
              <li key={note.id} className="px-4 py-3">
                <p className="text-sm font-medium text-slate-900">
                  {note.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{note.detail}</p>
                <p className="mt-1 text-[11px] text-slate-400">{note.time}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand lockup — logo asset + logotype, shared by all three surfaces */
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
      <span className="text-sm font-bold tracking-tight text-slate-900">
        SafeLedger
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main export                                                        */
/* ------------------------------------------------------------------ */
export default function Navbar() {
  const { user, profile, logoutUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { thread: supportThread } = useChatThreadMeta(user?.uid);
  const badgeCounts = {
    "/dashboard/user/support": supportThread?.unreadByUser || 0,
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Lock body scroll while the mobile drawer is open
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
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* ---------------- Mobile top utility bar ---------------- */}
      <header className="print:hidden md:hidden fixed top-0 inset-x-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
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
        className={`print:hidden md:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation menu"
        className={`print:hidden md:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out ${
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
          badgeCounts={badgeCounts}
        />
        <IdentityWidget
          profile={profile}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>

      {/* ---------------- Desktop fixed sidebar ---------------- */}
      <aside className="print:hidden hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:flex-col bg-white border-r border-slate-200">
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200">
          <BrandMark />
          <NotificationBell />
        </div>

        <NavContent
          pathname={pathname}
          onNavigate={undefined}
          badgeCounts={badgeCounts}
        />
        <IdentityWidget
          profile={profile}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>
    </>
  );
}
