import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function TripNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-24">
        <p className="label-mono">No such trip</p>
        <h1 className="mt-2 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">
          This trip link doesn&apos;t work.
        </h1>
        <p className="mt-3 text-text-secondary">
          It may have been mistyped or cut off when it was pasted. Ask whoever sent it to share it again from the trip
          page.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            What is Plan Karo Chalo?
          </Link>
          <Link href="/demo" className="btn btn-outline">
            Try the demo
          </Link>
        </div>
      </main>
    </div>
  );
}
