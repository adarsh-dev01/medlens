"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { AccessibilityControls } from "@/components/accessibility-controls";
import { cn } from "@/lib/utils";

const navigation: Array<{ href: Route; label: string; ariaLabel: string }> = [
  { href: "/", label: "Home", ariaLabel: "Go to home page" },
  { href: "/triage", label: "Triage", ariaLabel: "Go to symptom triage page" },
  { href: "/map", label: "Map", ariaLabel: "Go to nearby healthcare map page" },
  { href: "/history", label: "History", ariaLabel: "Go to symptom history page" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Go to MedLens home page"
          className="flex items-center gap-2 rounded-full px-2 py-1 text-base font-extrabold tracking-tight text-brand-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <span className="text-2xl" aria-hidden="true">
            {"\u{1F3E5}"}
          </span>
          <span>MedLens</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.ariaLabel}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <AccessibilityControls />
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:hidden"
        >
          <div className="flex flex-col gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 md:hidden"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.ariaLabel}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                        isActive
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <AccessibilityControls />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
