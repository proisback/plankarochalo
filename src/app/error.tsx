"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pb-24">
      <p className="label-mono">Signal failure</p>
      <h1 className="mt-2 font-heading text-[2.25rem] font-extrabold leading-[1.02] text-text">
        Something went wrong on our side.
      </h1>
      <p className="mt-3 text-text-secondary">
        Anything that had already saved is safe. Try again, and if it keeps happening, check your connection.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          <Icon name="refresh" className="h-4 w-4" />
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Go to the start
        </Link>
      </div>
    </main>
  );
}
