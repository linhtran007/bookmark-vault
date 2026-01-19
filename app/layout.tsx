import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import { ThemeScript, ThemeToggle } from "@/components/theme";
import { ThemeProvider } from "@/hooks/useTheme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookmark Vault",
  description: "Save, view, search, and manage your bookmarks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 text-slate-900 dark:bg-gray-950 dark:text-slate-100`}
      >
        <ThemeProvider>
          <header className="bg-white/80 backdrop-blur border-b border-zinc-200 dark:bg-slate-900/80 dark:border-slate-800 relative z-9999">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 2xl:max-w-7xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />
                  <h1 className="text-2xl font-semibold tracking-tight">Bookmark Vault</h1>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-7xl">
            {children}
          </main>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
