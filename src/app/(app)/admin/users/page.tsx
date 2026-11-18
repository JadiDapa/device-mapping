import { getDb } from "@/db";
import { UsersManager } from "@/components/users/users-manager";
import { requireAdminPage } from "@/lib/auth";
import { id } from "@/lib/i18n/id";
import { listUsers } from "@/server/users";

export default async function UsersPage() {
  const session = await requireAdminPage();
  const users = await listUsers(getDb());

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{id.users.title}</h1>
      <UsersManager
        currentUserId={session.user.id}
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
