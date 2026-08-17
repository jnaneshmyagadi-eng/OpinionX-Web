import Link from "next/link";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <h1 className="text-xl font-semibold text-white">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        OpinionX needs a connection to load live votes and results. Check your
        network and try again.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        Retry
      </Link>
    </div>
  );
}
