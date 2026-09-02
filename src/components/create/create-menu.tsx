"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, Video, Image as ImageIcon, FileText, BarChart3 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const items = [
  {
    href: "/create?type=video",
    icon: Video,
    title: "Video",
    desc: "Short clips · coming next",
    accent: "from-rose-600/20 to-orange-600/10 border-rose-500/30",
    available: false,
  },
  {
    href: "/create?type=image",
    icon: ImageIcon,
    title: "Image",
    desc: "Photo posts · coming next",
    accent: "from-sky-600/20 to-cyan-600/10 border-sky-500/30",
    available: false,
  },
  {
    href: "/create?type=post",
    icon: FileText,
    title: "Post",
    desc: "Text thoughts · coming next",
    accent: "from-emerald-600/20 to-teal-600/10 border-emerald-500/30",
    available: false,
  },
  {
    href: "/create",
    icon: BarChart3,
    title: "Poll",
    desc: "Ask. Vote. Let the internet decide.",
    accent: "from-violet-600/30 to-fuchsia-600/20 border-violet-400/50",
    available: true,
  },
] as const;

export function CreateMenu({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create something"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Create something
            </p>
            <h2 className="text-lg font-bold text-white">What do you want to share?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="grid gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-r p-3.5 transition hover:brightness-110 ${item.accent}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900/80 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-white">{item.title}</span>
                      {item.available ? (
                        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Live
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      {item.desc}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-center text-[11px] text-zinc-600">
          OpinionX = Social content + Polls · ASK. VOTE. DISCOVER.
        </p>
      </div>
    </div>
  );
}
