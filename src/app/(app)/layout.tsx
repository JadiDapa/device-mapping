import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { AppNav } from "./app-nav";
import { SignOutButton } from "./sign-out-button";

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
  const session = await requireUser({ redirectTo: "/login" });
  const role = session.user.role === "admin" ? "admin" : "guest";
  const links = [
    { href: "/map", label: id.nav.map },
    { href: "/network-sources", label: id.nav.sources },
    { href: "/export", label: id.nav.export },
    ...(role === "admin"
      ? [
          { href: "/admin/device-types", label: id.deviceType.title },
          { href: "/admin/users", label: id.nav.users },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background relative flex h-14 shrink-0 items-center gap-4 border-b px-4">
        <Link href="/" className="font-semibold">
          {id.app.title}
        </Link>
        <AppNav links={links} />
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div>{session.user.email}</div>
            <div className="text-muted-foreground" data-testid="user-role">
              {id.role[role]}
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
