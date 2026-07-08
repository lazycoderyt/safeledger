"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, Send, CreditCard, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * components/user/BottomNav.jsx
 * Mobile-only bottom tab bar (Home / Activity / Transfer / Cards /
 * Account), styled after common banking-app patterns: four plain
 * icon+label tabs plus an elevated, always-colored "Transfer" button
 * in the middle as the primary call-to-action.
 *
 * Desktop keeps the existing left sidebar (components/user/Navbar.jsx)
 * entirely as-is — this renders nothing at md and above.
 *
 * Rendered once from app/dashboard/user/layout.js, alongside the
 * existing top bar, so it appears on every user dashboard page.
 *
 * iOS/Android notes:
 * - Fixed to the bottom in normal position (not inside a scrolling
 *   container) so it never gets clipped or double-scrolls.
 * - Padding includes `env(safe-area-inset-bottom)` so it clears the
 *   iPhone home-indicator on notched devices; resolves to 0 and is a
 *   no-op everywhere else, including Android.
 * - Touch targets are all ≥44px tall (Apple HIG / Material minimum)
 *   and use `active:` press states instead of `hover:`, since hover
 *   has no meaning on a touchscreen and can otherwise leave a tab
 *   looking "stuck" highlighted after a tap.
 * - `WebkitTapHighlightColor: transparent` removes the gray flash
 *   Android/iOS Chrome/Safari apply to tapped links by default, which
 *   otherwise looks broken against these rounded custom tap states.
 */

const TAP_STYLE = { WebkitTapHighlightColor: "transparent" };

const TABS = [
  {
    key: "home",
    label: "Home",
    href: "/dashboard/user",
    icon: Home,
    isActive: (path) => path === "/dashboard/user",
  },
  {
    key: "activity",
    label: "Activity",
    href: "/dashboard/user/accounts",
    icon: ArrowLeftRight,
    isActive: (path) => path.startsWith("/dashboard/user/accounts"),
  },
  {
    key: "transfer",
    label: "Transfer",
    href: "/dashboard/user/transfer",
    icon: Send,
    primary: true,
    isActive: (path) => path.startsWith("/dashboard/user/transfer"),
  },
  {
    key: "cards",
    label: "Cards",
    href: "/dashboard/user/cards/debit",
    icon: CreditCard,
    isActive: (path) => path.startsWith("/dashboard/user/cards"),
  },
  {
    key: "account",
    label: "Account",
    href: "/dashboard/user/settings",
    icon: User,
    isAccount: true,
    isActive: (path) => path.startsWith("/dashboard/user/settings"),
  },
];

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function StandardTab({ tab, active }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      style={TAP_STYLE}
      className="flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 py-1.5 active:opacity-60 transition-opacity"
    >
      <Icon
        className={`h-5.5 w-5.5 ${active ? "text-blue-600" : "text-slate-400"}`}
        strokeWidth={active ? 2.25 : 2}
        aria-hidden="true"
      />
      <span
        className={`text-[11px] leading-none ${
          active ? "font-semibold text-blue-600" : "font-medium text-slate-500"
        }`}
      >
        {tab.label}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-600"
        />
      )}
    </Link>
  );
}

function AccountTab({ tab, active, avatarUrl, name }) {
  const initials = getInitials(name);
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      style={TAP_STYLE}
      className="flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 py-1.5 active:opacity-60 transition-opacity"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className={`h-5.5 w-5.5 rounded-full object-cover ring-2 ${
            active ? "ring-blue-600" : "ring-transparent"
          }`}
        />
      ) : initials ? (
        <span
          className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[9px] font-bold ring-2 ${
            active
              ? "bg-blue-50 text-blue-700 ring-blue-600"
              : "bg-slate-100 text-slate-500 ring-transparent"
          }`}
        >
          {initials}
        </span>
      ) : (
        <User
          className={`h-5.5 w-5.5 ${active ? "text-blue-600" : "text-slate-400"}`}
          strokeWidth={active ? 2.25 : 2}
          aria-hidden="true"
        />
      )}
      <span
        className={`text-[11px] leading-none ${
          active ? "font-semibold text-blue-600" : "font-medium text-slate-500"
        }`}
      >
        {tab.label}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-600"
        />
      )}
    </Link>
  );
}

function PrimaryTab({ tab, active }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      style={TAP_STYLE}
      className="relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 active:opacity-80 transition-opacity"
    >
      <span
        className={`-mt-7 flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 ring-4 ring-white transition-transform ${
          active ? "scale-105" : ""
        }`}
      >
        <Icon className="h-5.5 w-5.5 text-white" aria-hidden="true" />
      </span>
      <span
        className={`text-[11px] leading-none ${
          active ? "font-semibold text-blue-600" : "font-medium text-slate-500"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <nav
      aria-label="Primary"
      className="print:hidden md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          if (tab.primary) {
            return <PrimaryTab key={tab.key} tab={tab} active={active} />;
          }
          if (tab.isAccount) {
            return (
              <AccountTab
                key={tab.key}
                tab={tab}
                active={active}
                avatarUrl={profile?.avatarUrl}
                name={profile?.name}
              />
            );
          }
          return <StandardTab key={tab.key} tab={tab} active={active} />;
        })}
      </div>
    </nav>
  );
}
