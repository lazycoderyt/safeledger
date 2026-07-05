// src/app/dashboard/page.jsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Adjusted path matching your new context file
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardController() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the context finishes checking the live auth state
    if (loading) return;

    if (!user) {
      // 1. Kick out unauthenticated visitors immediately
      router.replace("/auth/sign-in");
      return;
    }

    // 2. Perform lightning-fast client-side redirection using state memory
    if (profile?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    } else {
      // Defaults straight to standard user path if role is "user" or undefined
      router.replace("/dashboard/user");
      return;
    }
  }, [user, profile, loading, router]);

  // Clean intercept loading splash to cover up the seamless redirection transition
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      <p className="text-xs font-mono tracking-widest text-slate-500 uppercase">
        Synchronizing Security Profile...
      </p>
    </div>
  );
}
