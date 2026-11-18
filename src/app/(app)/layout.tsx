import { requireUser } from "@/lib/auth";

// Everything in this group depends on the session cookie, so it must never be
// statically prerendered — static generation runs at build time, before any
// runtime env vars or a real database exist.
export const dynamic = "force-dynamic";

/**
 * The real authentication gate for the app. proxy.ts only does an optimistic
 * cookie-presence check; this validates the session server-side.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser({ redirectTo: "/login" });

  return <div className="min-h-screen">{children}</div>;
}
