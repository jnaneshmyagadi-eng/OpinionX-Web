"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Lock,
  Bell,
  Palette,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  FileText,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Account",
    items: [
      { href: "/profile/edit", label: "Edit Profile", icon: User },
      { href: "/forgot-password", label: "Change Password", icon: Lock },
    ],
  },
  {
    title: "Preferences",
    items: [
      { href: "#", label: "Notifications", icon: Bell, soon: true },
      { href: "#", label: "Appearance", icon: Palette, soon: true },
      { href: "#", label: "Privacy", icon: Shield, soon: true },
    ],
  },
  {
    title: "About",
    items: [
      { href: "#", label: "Help & Support", icon: HelpCircle, soon: true },
      { href: "#", label: "Community Guidelines", icon: FileText, soon: true },
    ],
  },
];

export default function SettingsPage() {
  const [confirmOut, setConfirmOut] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  async function logout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      // Full navigation so middleware and cookies stay in sync
      window.location.assign("/login");
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-white">Settings</h1>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {section.title}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
              {section.items.map((item, i) => {
                const Icon = item.icon;
                const inner = (
                  <div
                    className={`flex items-center gap-3 px-4 py-3.5 ${
                      i > 0 ? "border-t border-zinc-800" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 text-zinc-400" />
                    <span className="flex-1 text-sm text-zinc-100">
                      {item.label}
                    </span>
                    {"soon" in item && item.soon ? (
                      <span className="text-[10px] text-zinc-600">Soon</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    )}
                  </div>
                );
                return item.href === "#" ? (
                  <div key={item.label}>{inner}</div>
                ) : (
                  <Link key={item.label} href={item.href}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
          {!confirmOut ? (
            <button
              type="button"
              onClick={() => setConfirmOut(true)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <LogOut className="h-5 w-5 text-red-400" />
              <span className="text-sm text-red-400">Log out</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3">
              <p className="flex-1 text-sm text-zinc-300">Log out of OpinionX?</p>
              <button
                type="button"
                onClick={() => setConfirmOut(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void logout()}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400"
              >
                {loggingOut ? "…" : "Confirm"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600">
          OpinionX — Everyone has an opinion.
        </p>
      </div>
    </div>
  );
}
