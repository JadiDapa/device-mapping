import { redirect } from "next/navigation";

// Replace with your landing page. Signed-out visitors end up at /login.
export default function RootPage() {
  redirect("/admin");
}
