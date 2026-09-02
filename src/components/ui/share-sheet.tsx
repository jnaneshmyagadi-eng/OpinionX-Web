"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

type Props = {
  url: string;
  title: string;
  text?: string;
  className?: string;
};

export function ShareSheet({ url, title, text, className }: Props) {
  const [copied, setCopied] = useState(false);
  const body =
    text ||
    `${title}\n\nWhat would you choose?\n\nVote here:\n${url}\n\n#LetTheInternetDecide`;

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: body, url });
        return;
      } catch {
        /* cancelled */
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(body)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
        >
          WhatsApp
        </a>
        <a
          href={x}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-400 ring-1 ring-sky-500/30"
        >
          X
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
