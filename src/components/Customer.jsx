"use client";

import {
  Star,
  ShieldCheck,
  Users,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const AUDITED_METRICS = [
  {
    id: "csat",
    value: "98.4%",
    label: "Client Satisfaction Index",
    description:
      "Annual independent audit of commercial relationship management performance.",
    icon: Users,
  },
  {
    id: "retention",
    value: "99.92%",
    label: "Capital Retention Rate",
    description:
      "Year-over-year asset retention across enterprise and institutional accounts.",
    icon: TrendingUp,
  },
  {
    id: "compliance",
    value: "100%",
    label: "SLA Regulatory Compliance",
    description:
      " Flawless history of automated trade clearing and customs auditing.",
    icon: ShieldCheck,
  },
];

const CASE_STUDIES = [
  {
    id: "maritime-alpha",
    quote:
      "Transitioning our cross-border clearing to SafeLedger reduced our letter-of-credit processing latency from 4 days to less than 11 minutes. The combination of liquid capital alignment and instant vessel custody status is unparalleled.",
    author: "Eleanor Vance",
    role: "VP of Global Treasury",
    company: "Vanguard Shipping Group",
    logoText: "VANGUARD MARITIME",
  },
  {
    id: "capital-beta",
    quote:
      "In institutional trade finance, visibility is risk. SafeLedger gives our compliance and logistics arms a single source of truth. We are executing multi-currency clearing cycles with absolute structural confidence.",
    author: "Marcus Sterling",
    role: "Chief Risk Officer",
    company: "Apex Commodities International",
    logoText: "APEX COMMODITIES",
  },
];

export default function CustomerSatisfaction() {
  return (
    <section
      aria-label="Institutional trust metrics and case studies"
      className="bg-[#F8FAFC] border-t border-[#E2E8F0] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ---------- Header Section ---------- */}
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Performance &amp; Accountability
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
            Audited to the highest corporate standards.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl">
            We measure our success by the absolute stability and velocity of
            your supply chain capital. SafeLedger is independently verified to
            ensure continuous operational excellence.
          </p>
        </div>

        {/* ---------- Layer 1: Audited Performance Cards ---------- */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {AUDITED_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A] tabular-nums">
                    {metric.value}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-blue-600">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#0F172A] tracking-tight">
                  {metric.label}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {metric.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ---------- Layer 2: Institutional Case Studies ---------- */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {CASE_STUDIES.map((study) => (
            <div
              key={study.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-8 flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div>
                {/* Visual Trust Indicator (5-Star subtle alignment) */}
                <div className="flex items-center gap-1 text-amber-500 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>

                {/* Corporate Testimonial */}
                <blockquote className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium italic">
                  &ldquo;{study.quote}&rdquo;
                </blockquote>
              </div>

              {/* Author & Profile Alignment */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">
                    {study.author}
                  </p>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {study.role},{" "}
                    <span className="text-slate-500">{study.company}</span>
                  </p>
                </div>

                {/* Structural Minimalist Mock-Logo for Trust */}
                <div className="text-[10px] font-black tracking-widest text-slate-300 uppercase select-none border border-dashed border-slate-200 px-2.5 py-1 rounded">
                  {study.logoText}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Bottom Institutional Footnote ---------- */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E2E8F0] pt-6 text-xs text-slate-400">
          <p>
            Methodology: All performance figures reflect rolling 12-month
            performance independently validated by third-party accounting
            infrastructure.
          </p>
          <a
            href="#investor-relations"
            className="hover:text-blue-600 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Access Annual Audit Reports <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
