import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-24">
        <p className="label-mono">404 · No such station</p>
        <h1 className="display mt-3 text-6xl text-text">This train doesn&apos;t stop here.</h1>
        <p className="mt-4 text-text-secondary">
          The page you were looking for isn&apos;t on this line. If someone sent you a trip link, ask them to send it
          again.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            Go to the start
          </Link>
          <Link href="/demo" className="btn btn-outline">
            Try the demo
          </Link>
        </div>
      </main>
    </div>
  );
}
