/*
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/user/Navbar";

export default function Layout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Firebase's own client-side truth is the source of authorization
    // here — never the middleware cookie, whose write timing can lag
    // behind a navigation on some browsers (notably Safari/iOS).
    if (!loading && !user) {
      router.replace("/auth/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="md:pl-64 pt-14 md:pt-0 min-h-screen bg-slate-50">
        {children}
      </main>
    </>
  );
}


*/

"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/user/Navbar";
import BottomNav from "@/components/user/BottomNav";
import AppLoader from "@/components/AppLoader";

export default function Layout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Firebase's own client-side truth is the source of authorization
    // here — never the middleware cookie, whose write timing can lag
    // behind a navigation on some browsers (notably Safari/iOS).
    if (!loading && !user) {
      router.replace("/auth/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return <AppLoader />;
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="md:pl-64 pt-14 md:pt-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 print:pl-0 print:pt-0 print:pb-0 min-h-screen bg-slate-50 print:bg-white">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
