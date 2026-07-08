import Image from "next/image";

/**
 * components/AppLoader.jsx
 * The one loading screen for the whole app: the SafeLedger icon
 * centered on a white background with a spinner ring turning around
 * it. Used two ways:
 *
 * 1. Automatically by Next.js's `loading.js` convention — dropped in
 *    at the root and at each major route segment (app/loading.js,
 *    app/auth/loading.js, app/dashboard/loading.js,
 *    app/dashboard/user/loading.js, app/dashboard/admin/loading.js) so
 *    it shows while a route segment is being prepared during
 *    navigation.
 * 2. Manually, wherever a page/layout already tracks its own loading
 *    state client-side (e.g. the auth check in
 *    app/dashboard/user/layout.js and app/dashboard/admin/layout.js) —
 *    same component, same look, everywhere a full-page loading state
 *    is needed.
 *
 * No client-side interactivity, so this has no "use client" directive
 * and can be dropped straight into a Server Component (a loading.js
 * file) or a Client Component (an existing layout) identically.
 *
 * @param {Object} props
 * @param {string} [props.label] - Optional caption under the spinner.
 *   Omitted by default to match a clean icon-only loading screen.
 * @param {boolean} [props.fullScreen] - `true` (default) fixes the
 *   loader to the full viewport, for route-level loading states.
 *   Pass `false` to instead fill its parent container — useful when
 *   nesting inside a panel that already has its own bounded size.
 */
export default function AppLoader({ label, fullScreen = true }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
      className={`flex flex-col items-center justify-center gap-4 bg-white ${
        fullScreen
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-full w-full min-h-[240px]"
      }`}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-blue-600 motion-safe:animate-spin"
        />
        <Image
          src="/icon.png"
          alt=""
          width={48}
          height={48}
          priority
          className="relative z-10 h-12 w-12 rounded-xl object-cover"
        />
      </div>
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}
