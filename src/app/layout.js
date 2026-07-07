import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Correct and expanded metadata configuration
export const metadata = {
  title: {
    default: "Safe Ledger",
    template: "%s | Safe Ledger", // Allows inner pages to dynamically show "Dashboard | Safe Ledger"
  },
  description:
    "Securely track, manage, and audit your financial records with confidence.",
  icons: {
    icon: "/icon.png", // Correct path pointing directly to your public/icon.png
    shortcut: "/icon.png",
    apple: "/icon.png", // Standard fallback for iOS home screen bookmarks
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
