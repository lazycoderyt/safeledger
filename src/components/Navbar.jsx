"use client";

import { useState } from "react";
import { ShieldCheck, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Personal Banking", href: "#personal-banking" },
  { label: "Security Commitments", href: "#security" },
  { label: "Institution", href: "#institution" },
];

/**
 * Navbar — fixed top navigation for Apex Global
 * Stack: Next.js + Tailwind CSS + lucide-react
 */
export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 shrink-0">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <img src="/icon.png" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">
              Apex Global
            </span>
          </a>

          {/* Center links - desktop */}
          <div className="hidden lg:flex items-center gap-9">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-[#0F172A] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right - desktop */}
          <div className="hidden lg:flex items-center gap-6">
            <a
              href="/auth/sign-in"
              className="text-sm font-medium text-slate-700 hover:text-[#0F172A] transition-colors"
            >
              Sign In
            </a>
            <a
              href="/auth/sign-up"
              className="inline-flex items-center rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Open Account
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            open ? "max-h-96 opacity-100 pb-6" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-4">
              <a
                href="/auth/sign-in"
                className="px-3 text-sm font-medium text-slate-700"
              >
                Sign In
              </a>
              <a
                href="/auth/sign-up"
                className="mx-3 inline-flex items-center justify-center rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Open Account
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
