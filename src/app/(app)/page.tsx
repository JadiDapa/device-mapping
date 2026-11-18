import { requireUser } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { SignOutButton } from "./sign-out-button";

// Placeholder: replaced by the zone dashboard in M2.
export default async function DashboardPage() {
  const session = await requireUser({ redirectTo: "/login" });
  const role = session.user.role === "admin" ? "admin" : "guest";

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{id.admin.dashboardTitle}</h1>
      <p className="text-muted-foreground mt-2">
        {id.admin.signedInAs}: {session.user.email}
      </p>
      <p className="text-muted-foreground mt-1" data-testid="user-role">
        {id.admin.role}: {id.role[role]}
      </p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
