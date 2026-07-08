// src/app/dashboard/admin/layout.jsx
"use client";
/*
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import AdminNavbar from "@/components/admin/Adminnav";

export default function AdminLayout({ children }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      router.replace(profile ? "/dashboard/user" : "/auth/sign-in");
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (profile?.role !== "admin") return null;

  return (
    <>
      <AdminNavbar />
      <main className="md:pl-64 pt-14 md:pt-0 min-h-screen bg-slate-50">
        {children}
      </main>
    </>
  );
}
*/

// src/app/dashboard/admin/layout.jsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminNavbar from "@/components/admin/Adminnav";
import AppLoader from "@/components/AppLoader";

export default function AdminLayout({ children }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      router.replace(profile ? "/dashboard/user" : "/auth/sign-in");
    }
  }, [profile, loading, router]);

  if (loading) {
    return <AppLoader />;
  }

  if (profile?.role !== "admin") return null;

  return (
    <>
      <AdminNavbar />
      <main className="md:pl-64 pt-14 md:pt-0 min-h-screen bg-slate-50">
        {children}
      </main>
    </>
  );
}
