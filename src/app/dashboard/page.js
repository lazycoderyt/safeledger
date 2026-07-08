"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Adjusted path matching your new context file
import { useRouter } from "next/navigation";
import AppLoader from "@/components/AppLoader";

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
  return <AppLoader />;
}
