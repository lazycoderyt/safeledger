"use client";

import { ShieldCheck } from "lucide-react";
import { FaLinkedinIn, FaXTwitter } from "react-icons/fa6"; // Standard modern corporate icon sets

// Centralized Navigation & Data Hierarchy for easy editing
const FOOTER_NAVIGATION = {
  solutions: [
    { name: "Cross-Border Capital", href: "#" },
    { name: "Freight Custody Rails", href: "#" },
    { name: "Treasury Clearing", href: "#" },
    { name: "Compliance Auditing", href: "#" },
  ],
  institution: [
    { name: "About SafeLedger", href: "#" },
    { name: "Security Architecture", href: "#" },
    { name: "Regulatory Compliance", href: "#" },
    { name: "Investor Relations", href: "#" },
  ],
  resources: [
    { name: "API Documentation", href: "#" },
    { name: "System Status", href: "#" },
    { name: "Global Trade Desk", href: "#" },
    { name: "Contact Treasury Support", href: "#" },
  ],
  socials: [
    { name: "LinkedIn", href: "#", icon: FaLinkedinIn },
    { name: "Twitter", href: "#", icon: FaXTwitter },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      aria-label="SafeLedger Institutional Footer"
      className="bg-[#0F172A] border-t border-slate-800 text-slate-400"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-12">
        {/* ---------- Main Directory Grid ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
          {/* Column 1: Brand & Identity */}
          <div className="lg:col-span-2 max-w-sm">
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                {/* Kept the main branding shield as standard SVG wrapper or your existing asset */}
                <ShieldCheck className="h-4 w-4 text-white" />
              </span>
              <span className="text-lg font-black tracking-tight uppercase">
                SafeLedger
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Anchoring global supply chain liquidity through high-velocity
              commercial banking infrastructure, algorithmic trade custody, and
              institutional assurance frameworks.
            </p>

            {/* Social Links Sub-Row using react-icons */}
            <div className="mt-6 flex items-center gap-4">
              {FOOTER_NAVIGATION.socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    aria-label={`Follow SafeLedger on ${social.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Solutions Array */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Solutions
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_NAVIGATION.solutions.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Institution Array */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Institution
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_NAVIGATION.institution.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Resources Array */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Resources
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_NAVIGATION.resources.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------- Regulatory Compliance & Legal Footnotes ---------- */}
        <div className="mt-12 space-y-6 text-[11px] leading-relaxed text-slate-500">
          <p>
            SafeLedger is a corporate financial solutions architecture platform.
            Banking services are provided by partner institutional banks,
            members FDIC. Letters of Credit and underwritten trade instruments
            are cleared in coordination with authorized sovereign customs
            authorities and corresponding clearance banking clearings.
          </p>
          <p>
            Deposits are eligible for FDIC pass-through insurance up to defined
            statutory maximum extensions through our participating custodial
            credit network. Routing coordinates, escrow protocols, and
            multi-currency ledgers are fully audited via international 256-bit
            automated encryption compliance models.
          </p>

          {/* Bottom Copyright & Terms Sub-Flex */}
          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>
              &copy; {currentYear} SafeLedger Systems Inc. All sovereign rights
              reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-300 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Terms of Trade Custody
              </a>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Patents &amp; Disclosures
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
