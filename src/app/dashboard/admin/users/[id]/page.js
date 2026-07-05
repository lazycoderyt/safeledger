"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserCog,
  IdCard,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { useAdminUserDetail } from "@/utils/useAdminUserDetails";
import { updateUserIdentity, updateUserRole } from "@/utils/authHelper";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";
import { useAuth } from "@/context/AuthContext";

/**
 * app/dashboard/admin/users/[id]/page.js
 * Edit a user's name and account number, and grant/revoke admin access.
 *
 * Role changes are gated behind a type-to-confirm phrase rather than a
 * single click — this is a friction/confirmation step against
 * mis-clicks, not a cryptographic security control. An admin can never
 * change their own role from here (enforced both in the UI and again in
 * updateUserRole itself), so there's no path to locking yourself out of
 * the admin console.
 */

const CONFIRM_PHRASE = "I confirm this admin action now";

function normalizePhrase(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function formatCurrency(value) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Banner({ tone, icon: Icon, children }) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${toneClasses}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export default function AdminUserEditPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;
  const { user: currentAdmin } = useAuth();

  const {
    profile,
    account,
    loading,
    error: loadError,
  } = useAdminUserDetail(userId);

  // Identity form (name + account number)
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [identityInitialized, setIdentityInitialized] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [identitySuccess, setIdentitySuccess] = useState(false);

  // Populate the editable fields once, when the profile first loads —
  // afterwards the inputs are the source of truth for what the admin is
  // typing, not the live document (otherwise every Firestore snapshot
  // would stomp on whatever they're mid-typing).
  useEffect(() => {
    if (!identityInitialized && profile) {
      setName(profile.name || "");
      setAccountNumber(profile.accountNumber || "");
      setIdentityInitialized(true);
    }
  }, [profile, identityInitialized]);

  // Role change confirmation
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [changingRole, setChangingRole] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleSuccess, setRoleSuccess] = useState(false);

  const isSelf = Boolean(
    currentAdmin?.uid && userId && currentAdmin.uid === userId,
  );
  const currentRole = profile?.role === "admin" ? "admin" : "user";
  const targetRole = currentRole === "admin" ? "user" : "admin";
  const phraseMatches =
    normalizePhrase(confirmInput) === normalizePhrase(CONFIRM_PHRASE);

  async function handleIdentitySubmit(e) {
    e.preventDefault();
    setIdentityError("");
    setIdentitySuccess(false);

    const trimmedName = name.trim();
    const trimmedAccountNumber = accountNumber.trim();

    if (!trimmedName) {
      setIdentityError("Name cannot be empty.");
      return;
    }
    if (!/^[1-9]\d{9,11}$/.test(trimmedAccountNumber)) {
      setIdentityError(
        "Account number must be 10-12 digits with no leading zero.",
      );
      return;
    }

    setSavingIdentity(true);
    try {
      await updateUserIdentity(userId, {
        name: trimmedName,
        accountNumber: trimmedAccountNumber,
      });
      setIdentitySuccess(true);
    } catch (err) {
      console.error("Failed to update user identity:", err);
      setIdentityError(
        err.message || "Couldn't save these changes. Please try again.",
      );
    } finally {
      setSavingIdentity(false);
    }
  }

  function openRoleConfirm() {
    setRoleError("");
    setRoleSuccess(false);
    setConfirmInput("");
    setShowRoleConfirm(true);
  }

  function cancelRoleConfirm() {
    setShowRoleConfirm(false);
    setConfirmInput("");
    setRoleError("");
  }

  async function handleRoleSubmit(e) {
    e.preventDefault();
    if (!phraseMatches || isSelf) return;

    setRoleError("");
    setChangingRole(true);
    try {
      await updateUserRole(userId, targetRole, currentAdmin?.uid);
      setRoleSuccess(true);
      setShowRoleConfirm(false);
      setConfirmInput("");
    } catch (err) {
      console.error("Failed to update role:", err);
      setRoleError(
        err.message || "Couldn't update this user's role. Please try again.",
      );
    } finally {
      setChangingRole(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl bg-white p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-slate-400">Loading user…</p>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 bg-white p-4 sm:p-6 lg:p-8">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to All Users
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-700">
            This user couldn&rsquo;t be found. They may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/admin/users")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to All Users
      </button>

      {/* User header */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-700 border border-indigo-200">
            {getInitials(profile.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">
            {profile.name}
          </p>
          <p className="truncate text-sm text-slate-500">{profile.email}</p>
          {isSelf && (
            <p className="mt-0.5 text-xs font-semibold text-indigo-600">
              This is you
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Available Balance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(account?.availableBalance)}
          </p>
        </div>
      </div>

      {/* Identity form */}
      <form
        onSubmit={handleIdentitySubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <IdCard className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Name &amp; Account Number
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Changes save directly to this user&rsquo;s profile and account
          records.
        </p>

        {identityError && (
          <div className="mt-4">
            <Banner tone="error" icon={AlertCircle}>
              {identityError}
            </Banner>
          </div>
        )}
        {identitySuccess && (
          <div className="mt-4">
            <Banner tone="success" icon={CheckCircle2}>
              Saved.
            </Banner>
          </div>
        )}

        <div className="mt-5">
          <label
            htmlFor="fullName"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIdentitySuccess(false);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="accountNumber"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Account Number
          </label>
          <input
            id="accountNumber"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={accountNumber}
            onChange={(e) => {
              // Digits only — keeps the mobile numeric keypad usable
              // without letting anything non-numeric slip through on
              // any platform.
              setAccountNumber(e.target.value.replace(/\D/g, ""));
              setIdentitySuccess(false);
            }}
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {formatAccountNumberDisplay(accountNumber) || "10-12 digits"}
          </p>
        </div>

        <button
          type="submit"
          disabled={savingIdentity}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {savingIdentity ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>

      {/* Role management */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <UserCog className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Admin Access
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Current role:{" "}
          <span className="font-semibold text-slate-700">
            {currentRole === "admin" ? "Admin" : "Standard User"}
          </span>
        </p>

        {roleError && (
          <div className="mt-4">
            <Banner tone="error" icon={AlertCircle}>
              {roleError}
            </Banner>
          </div>
        )}
        {roleSuccess && (
          <div className="mt-4">
            <Banner tone="success" icon={CheckCircle2}>
              Role updated to{" "}
              {currentRole === "admin" ? "Admin" : "Standard User"}.
            </Banner>
          </div>
        )}

        {isSelf ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              You can&rsquo;t change your own role from here. Ask another admin
              to make this change.
            </p>
          </div>
        ) : !showRoleConfirm ? (
          <button
            type="button"
            onClick={openRoleConfirm}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors sm:w-auto ${
              targetRole === "admin"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            {targetRole === "admin" ? (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
            )}
            {targetRole === "admin"
              ? "Grant Admin Access"
              : "Revoke Admin Access"}
          </button>
        ) : (
          <form
            onSubmit={handleRoleSubmit}
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
            noValidate
          >
            <div className="flex items-start gap-2.5">
              <KeyRound
                className="h-4 w-4 shrink-0 mt-0.5 text-amber-700"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Confirm: {targetRole === "admin" ? "grant" : "revoke"} admin
                  access for {profile.name}?
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Type the phrase below exactly to enable the update button.
                </p>
              </div>
            </div>

            <p className="mt-3 select-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-900">
              {CONFIRM_PHRASE}
            </p>

            <label htmlFor="roleConfirmInput" className="sr-only">
              Type the confirmation phrase
            </label>
            <input
              id="roleConfirmInput"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type the phrase above"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cancelRoleConfirm}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!phraseMatches || changingRole}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none ${
                  targetRole === "admin"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {changingRole ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Updating
                  </>
                ) : targetRole === "admin" ? (
                  "Update Role: Make Admin"
                ) : (
                  "Update Role: Revoke Admin"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
