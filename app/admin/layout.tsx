import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

// /admin/* always depends on the session cookie, so it must never be
// statically prerendered — static generation runs at build time, before
// any runtime env vars or a real database exist.
export const dynamic = "force-dynamic";

/**
 * "All /admin routes and mutating APIs require a session." This
 * server-side check is the real gate — proxy.ts only does an optimistic
 * cookie-presence check to avoid a flash of admin UI.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <div className="min-h-screen">{children}</div>;
}
