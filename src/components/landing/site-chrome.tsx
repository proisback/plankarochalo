import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/app/theme-toggle";
import { site } from "@/lib/site";

const navLink =
  "hidden min-h-11 items-center rounded-xl px-3 text-[0.8125rem] font-semibold text-text-secondary hover:bg-subtle hover:text-text";

/** Top bar shared by the marketing pages. */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-1.5 lg:px-8">
        <Link href="/" aria-label="Plan Karo Chalo home" className="inline-flex min-h-11 shrink-0 items-center">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/#how" className={`${navLink} md:inline-flex`}>
            How it works
          </Link>
          <Link href="/story" className={`${navLink} md:inline-flex`}>
            Case study
          </Link>
          <Link href="/demo" className={`${navLink} sm:inline-flex`}>
            Try the demo
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="btn btn-outline ml-1 text-[0.8125rem]">
            Start a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}

const footerLink = "link inline-flex min-h-11 items-center";

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
        <div className="flex flex-col gap-3 md:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 text-sm">
            <Link href="/demo" className={footerLink}>
              Try the demo
            </Link>
            <Link href="/story" className={footerLink}>
              Case study
            </Link>
            <Link href="/login" className={footerLink}>
              Start a trip
            </Link>
            {site.linkRepo && (
              <a href={site.repo} target="_blank" rel="noopener noreferrer" className={footerLink}>
                Source on GitHub
              </a>
            )}
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
