import React from "react";
import Navbar from "@/components/user/Navbar";

export default function layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="md:pl-64 pt-14 md:pt-0 min-h-screen bg-slate-50">
        {children}
      </main>
    </>
  );
}
