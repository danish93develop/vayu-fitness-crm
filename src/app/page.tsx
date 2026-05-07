import { redirect } from "next/navigation";

export default function Home() {
  // Real auth wiring lands in Phase 2 — for now, root redirects to dashboard
  // so you can preview the layout immediately.
  redirect("/dashboard");
}
