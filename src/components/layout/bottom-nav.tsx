"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { CreateMenu } from "@/components/create/create-menu";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Discover" },
  { href: "__create__", icon: Plus, label: "Create" },
  { href: "/polls", icon: BarChart3, label: "Polls" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl safe-bottom"
        aria-label="Primary"
      >
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            if (href === "__create__") {
              return (
                <button
                  key="create"
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] text-zinc-400 transition hover:text-zinc-200"
                  aria-label="Create"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40">
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="font-medium text-violet-300">{label}</span>
                </button>
              );
            }

            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex min-w-[3.5rem] flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] transition-colors",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 h-0.5 w-7 rounded-full bg-violet-500"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn("h-5 w-5", isActive && "text-violet-400")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(isActive && "font-semibold text-violet-300")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
