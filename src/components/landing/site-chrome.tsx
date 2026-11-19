import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/app/theme-toggle";
import { site } from "@/lib/site";

/** Top bar shared by the marketing pages. */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/#how" className="btn btn-quiet btn-sm hidden md:inline-flex">
            How it works
          </Link>
          <Link href="/story" className="btn btn-quiet btn-sm hidden md:inline-flex">
            Case study
          </Link>
          <Link href="/demo" className="btn btn-quiet btn-sm hidden sm:inline-flex">
            Demo
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="btn btn-primary btn-sm ml-1">
            Start a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-text-secondary">
            Gets a group from &ldquo;we should go somewhere&rdquo; to &ldquo;we&apos;re going&rdquo;. Nothing else.
          </p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/demo" className="link">
              Live demo
            </Link>
            <Link href="/story" className="link">
              Case study
            </Link>
            <Link href="/login" className="link">
              Sign in
            </Link>
            <a href={site.repo} target="_blank" rel="noopener noreferrer" className="link">
              Source on GitHub
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-text-tertiary">
              Designed and built by{" "}
              {site.author.url ? (
                <a href={site.author.url} target="_blank" rel="noopener noreferrer" className="text-text underline">
                  {site.author.name}
                </a>
              ) : (
                site.author.name
              )}{" "}
              · 2026
            </p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
