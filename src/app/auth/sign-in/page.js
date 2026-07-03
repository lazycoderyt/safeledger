"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Landmark,
  BadgeCheck,
} from "lucide-react";
import { loginUser } from "@/utils/authHelper";

function mapAuthError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and access key combination doesn't match our records.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "256-bit encrypted session handling" },
  { icon: Landmark, label: "FDIC-insured partner bank custody" },
  { icon: BadgeCheck, label: "SOC 2 Type II certified infrastructure" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter both your email and access key to continue.");
      return;
    }

    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Left — brand / trust panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#0F172A] px-14 py-12">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="SafeLedger"
            width={36}
            height={36}
            className="rounded-md"
          />
          <span className="text-lg font-bold tracking-tight text-white">
            SafeLedger
          </span>
        </div>

        <div className="max-w-md">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Secure Access
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Welcome back to your institutional ledger.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Sign in to review balances, disbursements, and account activity in
            real time.
          </p>
        </div>

        <ul className="space-y-4">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <li key={point.label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                </span>
                <span className="text-sm text-slate-300">{point.label}</span>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Right — form panel */}
      <section
        aria-label="Sign in to SafeLedger"
        className="flex items-center justify-center px-6 py-16 sm:px-10"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Image
              src="/icon.png"
              alt="SafeLedger"
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">
              SafeLedger
            </span>
          </div>

          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Secure Access
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Don&rsquo;t have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Open one now
            </Link>
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
            >
              <AlertCircle
                className="h-4 w-4 shrink-0 mt-0.5 text-rose-600"
                aria-hidden="true"
              />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Clearing Email
              </label>
              <div className="mt-2 flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.com"
                  className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Secure Access Key
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot access key?
                </Link>
              </div>
              <div className="mt-2 flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
                <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your access key"
                  className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Hide access key" : "Show access key"
                  }
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Verifying
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
