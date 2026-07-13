"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Check } from "lucide-react";

/**
 * components/LanguageSwitcher.jsx
 * A fully client-side language switcher. This app has no i18n string
 * catalog of its own (every label is plain hardcoded English JSX), so
 * rather than re-authoring the whole UI around translation keys, this
 * drives Google's Website Translate widget — the standard no-backend
 * way to machine-translate an existing site's live DOM into another
 * language, entirely in the browser. No server route, no API key, no
 * data ever leaves the client except the page text itself going to
 * Google's public translate endpoint the same way it would for any
 * "Translate this page" browser feature.
 *
 * The widget's own UI (the top banner iframe, the "Powered by Google"
 * gadget) is hidden via CSS in globals.css — only this custom pill +
 * dropdown is shown, styled to match the rest of the app.
 *
 * How it works:
 * 1. On mount, injects Google's translate script once and initializes
 *    a hidden TranslateElement instance (required — it won't work
 *    without one, even though we never show its default markup).
 * 2. Restores any previously chosen language from localStorage (this
 *    device only — deliberately not synced anywhere) and re-applies
 *    it via the `googtrans` cookie before the page finishes loading.
 * 3. Selecting a language finds the widget's own hidden <select> once
 *    it's ready and dispatches a change event on it — the documented
 *    trick to trigger a translation without a full page reload. If
 *    the widget hasn't finished initializing yet (e.g. the very first
 *    switch, right after the script loads), it retries for ~2s and
 *    falls back to a one-time reload so the saved cookie/localStorage
 *    preference still takes effect reliably.
 *
 * Rendered next to the notification bell in both the mobile top bar
 * and the desktop sidebar header in Navbar.jsx.
 */

const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "中文" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

const SOURCE_LANG = "en";
const STORAGE_KEY = "apexGlobalLang";
const SCRIPT_ID = "google-translate-script";
const WIDGET_MOUNT_ID = "google_translate_element";

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeGoogTransCookie(langCode) {
  const hostname = window.location.hostname;
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // Clear any existing cookie on both the bare path and the current
  // hostname — Google's widget checks both, and a stale value on
  // either can make a later switch silently no-op.
  document.cookie = `googtrans=; path=/; ${expired}`;
  document.cookie = `googtrans=; path=/; domain=${hostname}; ${expired}`;

  if (langCode && langCode !== SOURCE_LANG) {
    const value = `/${SOURCE_LANG}/${langCode}`;
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; path=/; domain=${hostname}`;
  }
}

function readSavedLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage can throw in locked-down webviews (e.g. private
    // browsing on some iOS configurations) — fall through to cookie.
  }
  const cookie = readCookie("googtrans");
  if (!cookie) return SOURCE_LANG;
  const parts = cookie.split("/");
  return parts[2] || SOURCE_LANG;
}

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(SOURCE_LANG);
  const wrapperRef = useRef(null);
  const initializedRef = useRef(false);

  // Close on outside tap/click or Escape — touchstart is included
  // alongside mousedown so a tap outside the dropdown on iOS/Android
  // closes it immediately rather than waiting on a synthesized click.
  useEffect(() => {
    function handlePointerDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = readSavedLanguage();
    setSelected(saved);
    if (saved !== SOURCE_LANG) {
      writeGoogTransCookie(saved);
    }

    if (document.getElementById(SCRIPT_ID)) return;

    window.googleTranslateElementInit = function googleTranslateElementInit() {
      if (!window.google?.translate?.TranslateElement) return;
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement(
        { pageLanguage: SOURCE_LANG, autoDisplay: false },
        WIDGET_MOUNT_ID,
      );
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  function applyTranslation(langCode, attempt = 0) {
    const combo = document.querySelector("select.goog-te-combo");
    if (combo) {
      combo.value = langCode === SOURCE_LANG ? "" : langCode;
      combo.dispatchEvent(new Event("change"));
      return true;
    }
    if (attempt < 20) {
      setTimeout(() => applyTranslation(langCode, attempt + 1), 100);
    }
    return false;
  }

  function handleSelect(langCode) {
    setOpen(false);
    if (langCode === selected) return;

    setSelected(langCode);
    try {
      window.localStorage.setItem(STORAGE_KEY, langCode);
    } catch {
      // Ignore — the googtrans cookie below still carries the
      // preference for this load even if storage isn't writable.
    }
    writeGoogTransCookie(langCode);

    const applied = applyTranslation(langCode);
    if (!applied) {
      // First-ever switch on this page load: the widget's <select>
      // may not exist yet if the script is still loading. Give the
      // retry loop above a couple of seconds, then fall back to a
      // single reload so the cookie we just set takes effect cleanly.
      setTimeout(() => {
        if (!document.querySelector("select.goog-te-combo")) {
          window.location.reload();
        }
      }, 2200);
    }
  }

  const current = LANGUAGES.find((l) => l.code === selected) || LANGUAGES[0];

  return (
    <div ref={wrapperRef} className="notranslate relative" translate="no">
      {/* Required mount point for the Google Translate widget — kept
          in the DOM but visually hidden via globals.css; we render
          our own trigger/dropdown below instead of Google's markup. */}
      <div id={WIDGET_MOUNT_ID} className="hidden" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        style={{ WebkitTapHighlightColor: "transparent" }}
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 active:bg-slate-50"
      >
        <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{current.code === "zh-CN" ? "ZH" : current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg [-webkit-overflow-scrolling:touch]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === selected}
              onClick={() => handleSelect(lang.code)}
              style={{ WebkitTapHighlightColor: "transparent" }}
              className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors active:bg-slate-100 ${
                lang.code === selected
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">
                {lang.nativeLabel}
                <span className="ml-1.5 text-xs text-slate-400">
                  {lang.label}
                </span>
              </span>
              {lang.code === selected && (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
