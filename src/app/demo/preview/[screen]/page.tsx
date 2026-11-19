import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewClient, type PreviewScreen } from "./preview-client";

/**
 * Development only: the signed-in organiser screens on the in-memory demo
 * backend, so they can be looked at without an account.
 *
 *   /demo/preview/my-trips         the list, with trips in every state
 *   /demo/preview/my-trips-empty   no trips yet
 *   /demo/preview/my-trips-error   the first load fails; Retry works
 *   /demo/preview/new-trip         the create form (nothing is saved)
 *
 *   /demo/preview/login            the sign-in form with a stubbed "email me a
 *                                  link": no request, no email (?fail=otp fails it)
 *
 * new-trip also takes ?fail=trip|slug|size|member|proxy to make that one
 * database call fail, which is how the retry paths get exercised.
 */
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

const SCREENS: PreviewScreen[] = ["my-trips", "my-trips-empty", "my-trips-error", "new-trip", "login"];

export default async function PreviewPage({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await params;
  if (!SCREENS.includes(screen as PreviewScreen)) notFound();
  return <PreviewClient screen={screen as PreviewScreen} />;
}
