"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Landmark,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import { resetTransferPin } from "@/utils/authHelper";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";
import { COUNTRIES } from "@/utils/countries";

/**
 * app/dashboard/user/settings/page.js
 * Profile settings — everything except email and password is editable
 * here: name, date of birth, gender, country, mobile number, and a
 * profile photo uploaded through ImgBB. All logic (image upload +
 * Firestore write) lives in this one page rather than being split
 * across components/hooks.
 *
 * The transfer PIN is deliberately NOT part of the profile form: it has
 * its own card and its own modal (TransferPinModal below), with separate
 * state and a separate write path (resetTransferPin in authHelper), so a
 * profile save can never touch it and a PIN reset can never touch the
 * profile fields.
 *
 * ENV: requires NEXT_PUBLIC_IMGBB_API_KEY in your .env.local. Get a
 * free key at https://api.imgbb.com/.
 */

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB client-side cap

const INITIAL_FORM = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  country: "",
  mobileNumber: "",
};

/**
 * Self-contained modal for resetting a forgotten transfer PIN. The user
 * proves it's them by re-entering their account password, then picks a
 * new 4-digit PIN. Mounted only while open, so every open starts with
 * fresh, empty state.
 */
function TransferPinModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape closes the modal, unless a request is in flight.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!password) {
      setError("Enter your account password to confirm it's you.");
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError("Create a 4-digit transfer PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Your new PIN and confirmation don't match.");
      return;
    }
    if (/^(\d)\1{3}$/.test(newPin)) {
      setError(
        "Choose a less predictable PIN — repeated digits like 1111 aren't allowed.",
      );
      return;
    }

    setBusy(true);
    try {
      await resetTransferPin(password, newPin);
      onSuccess();
    } catch (err) {
      console.error("Failed to reset transfer PIN:", err);
      setError(
        err.message || "We couldn't update your PIN. Please try again.",
      );
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60";
  const pinInputClass = `${inputClass} tracking-[0.3em] placeholder:tracking-normal`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pinModalTitle"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="pinModalTitle"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              Reset transfer PIN
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Forgot your PIN? Confirm your account password, then choose a new
              4-digit PIN.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
              aria-hidden="true"
            />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
          <div>
            <label
              htmlFor="pinResetPassword"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Account Password
            </label>
            <div className="relative">
              <input
                id="pinResetPassword"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pinResetNew"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                New PIN
              </label>
              <input
                id="pinResetNew"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                autoComplete="off"
                maxLength={4}
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                disabled={busy}
                placeholder="4 digits"
                className={pinInputClass}
              />
            </div>
            <div>
              <label
                htmlFor="pinResetConfirm"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Confirm PIN
              </label>
              <input
                id="pinResetConfirm"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                autoComplete="off"
                maxLength={4}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                disabled={busy}
                placeholder="Re-enter"
                className={pinInputClass}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Updating PIN
                </>
              ) : (
                "Save new PIN"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, profile } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [hydrated, setHydrated] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Transfer PIN reset lives in its own state, fully separate from the
  // profile form above.
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  const closePinModal = useCallback(() => setPinModalOpen(false), []);

  // Hydrate the form from the live profile exactly once it arrives —
  // avoids stomping on in-progress edits if the profile doc re-emits.
  useEffect(() => {
    if (profile && !hydrated) {
      setForm({
        fullName: profile.name || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        country: profile.country || "",
        mobileNumber: profile.mobileNumber || "",
      });
      setHydrated(true);
    }
  }, [profile, hydrated]);

  // Revoke the object URL for the local preview on unmount/replacement
  // to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  /**
   * Uploads the selected file to ImgBB and returns the hosted image URL.
   * Corrected against the sample snippet: the real endpoint is
   * `https://api.imgbb.com/1/upload?key=<KEY>` (POST, multipart form
   * with an `image` field) — not `https://imgbb.com<KEY>`.
   */
  async function uploadToImgBB(file) {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Image hosting isn't configured. Set NEXT_PUBLIC_IMGBB_API_KEY and try again.",
      );
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      { method: "POST", body: formData },
    );

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("ImgBB returned an unexpected response.");
    }

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message || "Image upload failed.");
    }

    const uploadedUrl = payload.data?.display_url || payload.data?.url;
    if (!uploadedUrl) {
      throw new Error("ImgBB did not return an image URL.");
    }
    return uploadedUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!user?.uid) {
      setError("You must be signed in to update your profile.");
      return;
    }
    if (!form.fullName.trim()) {
      setError("Full name can't be empty.");
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        country: form.country,
        mobileNumber: form.mobileNumber.trim(),
        updatedAt: serverTimestamp(),
      };

      // Only touch avatarUrl if the user actually picked a new file —
      // never overwrite it with an empty value on an unrelated save.
      if (imageFile) {
        updates.avatarUrl = await uploadToImgBB(imageFile);
      }

      await updateDoc(doc(db, "profiles", user.uid), updates);

      setImageFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
      setSuccess(true);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(
        err.message || "We couldn't save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = previewUrl || profile?.avatarUrl || "";
  const initials =
    (form.fullName || profile?.name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "SL";

  return (
    <div className="mx-auto max-w-3xl space-y-8 bg-white p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings &amp; Security
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your personal information and profile photo.
        </p>
      </div>

      {/* Read-only identity — email & password intentionally excluded here */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Email
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-600">
              {profile?.email || user?.email || "—"}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
              Account Number
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-600">
              {profile?.accountNumber
                ? formatAccountNumberDisplay(profile.accountNumber)
                : "—"}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Password
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">••••••••</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Email and password can&rsquo;t be changed from this page. Contact
          support if you need help with either.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <AlertCircle
            className="h-4 w-4 shrink-0 mt-0.5 text-rose-600"
            aria-hidden="true"
          />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600"
            aria-hidden="true"
          />
          <p className="text-sm text-emerald-700">
            Your profile has been updated.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Avatar */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Profile Photo</h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-blue-700 border border-blue-200">
                  {initials}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {profile?.avatarUrl || previewUrl
                  ? "Change photo"
                  : "Upload photo"}
              </button>
              <p className="mt-1 text-xs text-slate-400">
                JPG or PNG, up to 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">
            Personal Information
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="fullName"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="mobileNumber"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                value={form.mobileNumber}
                onChange={handleChange}
                placeholder="+1 555 123 4567"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Sex
              </label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
            </div>

            <div>
              <label
                htmlFor="country"
                className="text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Country
              </label>
              <select
                id="country"
                name="country"
                value={form.country}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Changes
            </>
          )}
        </button>
      </form>

      {/* Transfer PIN — its own card, outside the profile form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
          Transfer PIN
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your 4-digit PIN confirms every transfer. If you&rsquo;ve forgotten
          it, you can set a new one after confirming your account password.
        </p>

        {pinSuccess && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-sm text-emerald-700">
              Your transfer PIN has been updated.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setPinSuccess(false);
            setPinModalOpen(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          Forgot or reset PIN
        </button>
      </div>

      {pinModalOpen && (
        <TransferPinModal
          onClose={closePinModal}
          onSuccess={() => {
            setPinModalOpen(false);
            setPinSuccess(true);
          }}
        />
      )}
    </div>
  );
}