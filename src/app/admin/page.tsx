import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { SignOutButton } from "./sign-out-button";

export default async function AdminDashboardPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{id.admin.dashboardTitle}</h1>
      <p className="text-muted-foreground mt-2">
        {id.admin.signedInAs}: {session?.user.email}
      </p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
