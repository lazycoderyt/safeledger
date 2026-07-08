"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ArrowRight,
  ArrowLeft,
  Landmark,
  BadgeCheck,
  Calendar,
  Users,
  Globe,
  Phone,
  Wallet,
  ChevronDown,
  Check,
  KeyRound,
} from "lucide-react";
import { signUpUser } from "@/utils/authHelper";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";
import { COUNTRIES } from "@/utils/countries";

function mapAuthError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/invalid-email":
      return "Enter a valid clearing email address.";
    case "auth/weak-password":
      return "Your access key must be at least 6 characters.";
    default:
      return "We couldn't complete registration. Please try again.";
  }
}

function calculateAge(dateString) {
  if (!dateString) return null;
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "256-bit encrypted account provisioning" },
  { icon: Landmark, label: "FDIC-insured partner bank custody" },
  { icon: BadgeCheck, label: "SOC 2 Type II certified infrastructure" },
];

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const ACCOUNT_TYPES = [
  "Personal Checking",
  "Personal Savings",
  "Student Checking",
  "Business Checking",
];

const STEPS = [
  { id: 1, label: "Credentials" },
  { id: 2, label: "Identity & Account" },
];

// Single source of truth for every field the form collects, plus the
// step each one belongs to. Makes it trivial to add/remove a field later
// without touching handleChange, validation wiring, or JSX plumbing.
const INITIAL_FORM = {
  fullName: "",
  email: "",
  password: "",
  dateOfBirth: "",
  gender: "",
  country: "",
  mobileNumber: "",
  accountType: "",
  transferPin: "",
  transferPinConfirm: "",
};

function FieldShell({ icon: Icon, children }) {
  return (
    <div className="mt-2 flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState(null); // { accountNumber }
  const [copied, setCopied] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "transferPin" || name === "transferPinConfirm") {
      setForm((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 4),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleContinue(e) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required to open an account.");
      return;
    }
    if (form.password.length < 6) {
      setError("Your access key must be at least 6 characters.");
      return;
    }

    setStep(2);
  }

  function handleBack() {
    setError("");
    setStep(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const { dateOfBirth, gender, country, mobileNumber, accountType } = form;

    if (
      !dateOfBirth ||
      !gender ||
      !country ||
      !mobileNumber.trim() ||
      !accountType
    ) {
      setError("Please complete every field to finish onboarding.");
      return;
    }

    const age = calculateAge(dateOfBirth);
    if (age === null || age < 18) {
      setError(
        "You must be at least 18 years old to open a Apex Global account.",
      );
      return;
    }

    const phonePattern = /^[+\d][\d\s-]{6,}$/;
    if (!phonePattern.test(mobileNumber.trim())) {
      setError("Enter a valid mobile number, including country code.");
      return;
    }

    if (!/^\d{4}$/.test(form.transferPin)) {
      setError("Create a 4-digit transfer PIN.");
      return;
    }
    if (form.transferPin !== form.transferPinConfirm) {
      setError("Your transfer PIN and confirmation don't match.");
      return;
    }
    if (/^(\d)\1{3}$/.test(form.transferPin)) {
      setError(
        "Choose a less predictable PIN — repeated digits like 1111 aren't allowed.",
      );
      return;
    }

    setLoading(true);
    try {
      const { accountNumber } = await signUpUser(
        form.email.trim(),
        form.password,
        {
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          country: form.country,
          mobileNumber: form.mobileNumber.trim(),
          accountType: form.accountType,
          transferPin: form.transferPin,
        },
      );
      setAccount({ accountNumber });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!account?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — fail silently, number is still visible
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Left — brand / trust panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#0F172A] px-14 py-12">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="Apex Global"
            width={36}
            height={36}
            className="rounded-md"
          />
          <span className="text-lg font-bold tracking-tight text-white">
            Apex Global
          </span>
        </div>

        <div className="max-w-md">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            Institutional Onboarding
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Open an account built for capital that moves.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Every Apex Global account is provisioned with a dedicated US account
            number, encrypted from the first keystroke.
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

      {/* Right — form / success panel */}
      <section
        aria-label={
          account
            ? "Account created successfully"
            : "Create your Apex Global account"
        }
        className="flex items-center justify-center px-6 py-16 sm:px-10"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Image
              src="/icon.png"
              alt="Apex Global"
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">
              Apex Global
            </span>
          </div>

          {account ? (
            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2
                  className="h-7 w-7 text-emerald-600"
                  aria-hidden="true"
                />
              </span>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#0F172A]">
                Account Provisioned
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your institutional profile has been created and secured. Your
                dedicated account number is below — keep it safe.
              </p>

              <div className="mt-7 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Account Number
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-semibold tracking-wider text-[#0F172A]">
                    {formatAccountNumberDisplay(account.accountNumber)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy account number"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-4">
                  <span className="text-xs text-slate-500">Account Type</span>
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {form.accountType}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Enter Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                Institutional Onboarding
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                Open your account
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Already registered?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Sign in
                </Link>
              </p>

              {/* Stepper */}
              <ol
                className="mt-7 flex items-center gap-3"
                aria-label="Registration progress"
              >
                {STEPS.map((s, index) => {
                  const isComplete = step > s.id;
                  const isActive = step === s.id;
                  return (
                    <li key={s.id} className="flex flex-1 items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            isComplete
                              ? "bg-blue-600 text-white"
                              : isActive
                                ? "border-2 border-blue-600 text-blue-600"
                                : "border-2 border-[#E2E8F0] text-slate-400"
                          }`}
                        >
                          {isComplete ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            s.id
                          )}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            isActive || isComplete
                              ? "text-[#0F172A]"
                              : "text-slate-400"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <span
                          className={`h-px flex-1 ${
                            step > s.id ? "bg-blue-600" : "bg-[#E2E8F0]"
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

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

              {step === 1 ? (
                <form
                  onSubmit={handleContinue}
                  className="mt-7 space-y-5"
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="fullName"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Full / Entity Name
                    </label>
                    <FieldShell icon={User}>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Jordan Whitfield"
                        className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                      />
                    </FieldShell>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Clearing Email
                    </label>
                    <FieldShell icon={Mail}>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@institution.com"
                        className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                      />
                    </FieldShell>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Secure Access Key
                    </label>
                    <FieldShell icon={Lock}>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 6 characters"
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
                    </FieldShell>
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mt-7 space-y-5"
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="dateOfBirth"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Date of Birth
                    </label>
                    <FieldShell icon={Calendar}>
                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        autoComplete="bday"
                        value={form.dateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] focus:outline-none"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="gender"
                        className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                      >
                        Sex
                      </label>
                      <FieldShell icon={Users}>
                        <select
                          id="gender"
                          name="gender"
                          value={form.gender}
                          onChange={handleChange}
                          className="w-full appearance-none bg-transparent px-3 py-3 text-sm text-[#0F172A] focus:outline-none"
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {GENDER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      </FieldShell>
                    </div>

                    <div>
                      <label
                        htmlFor="country"
                        className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                      >
                        Country
                      </label>
                      <FieldShell icon={Globe}>
                        <select
                          id="country"
                          name="country"
                          value={form.country}
                          onChange={handleChange}
                          className="w-full appearance-none bg-transparent px-3 py-3 text-sm text-[#0F172A] focus:outline-none"
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {COUNTRIES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      </FieldShell>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="mobileNumber"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Mobile Number
                    </label>
                    <FieldShell icon={Phone}>
                      <input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        autoComplete="tel"
                        value={form.mobileNumber}
                        onChange={handleChange}
                        placeholder="+1 555 123 4567"
                        className="w-full bg-transparent px-3 py-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                      />
                    </FieldShell>
                  </div>

                  <div>
                    <label
                      htmlFor="accountType"
                      className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                    >
                      Account Type
                    </label>
                    <FieldShell icon={Wallet}>
                      <select
                        id="accountType"
                        name="accountType"
                        value={form.accountType}
                        onChange={handleChange}
                        className="w-full appearance-none bg-transparent px-3 py-3 text-sm text-[#0F172A] focus:outline-none"
                      >
                        <option value="" disabled>
                          Select an account type
                        </option>
                        {ACCOUNT_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="transferPin"
                        className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                      >
                        Transfer PIN
                      </label>
                      <FieldShell icon={KeyRound}>
                        <input
                          id="transferPin"
                          name="transferPin"
                          type="password"
                          inputMode="numeric"
                          pattern="\d*"
                          autoComplete="off"
                          maxLength={4}
                          value={form.transferPin}
                          onChange={handleChange}
                          placeholder="4 digits"
                          className="w-full bg-transparent px-3 py-3 text-sm tracking-[0.3em] text-[#0F172A] placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none"
                        />
                      </FieldShell>
                    </div>

                    <div>
                      <label
                        htmlFor="transferPinConfirm"
                        className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                      >
                        Confirm PIN
                      </label>
                      <FieldShell icon={KeyRound}>
                        <input
                          id="transferPinConfirm"
                          name="transferPinConfirm"
                          type="password"
                          inputMode="numeric"
                          pattern="\d*"
                          autoComplete="off"
                          maxLength={4}
                          value={form.transferPinConfirm}
                          onChange={handleChange}
                          placeholder="Re-enter"
                          className="w-full bg-transparent px-3 py-3 text-sm tracking-[0.3em] text-[#0F172A] placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none"
                        />
                      </FieldShell>
                    </div>
                  </div>
                  <p className="-mt-2 text-xs leading-relaxed text-slate-400">
                    You&rsquo;ll enter this 4-digit PIN to confirm every
                    transfer — separate from your login password, and never
                    shown or emailed back to you.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      aria-label="Back to credentials"
                      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Provisioning Account
                        </>
                      ) : (
                        "Create Secure Account"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
