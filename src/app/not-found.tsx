import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-2 text-6xl font-bold text-muted-foreground">404</div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        This route doesn&apos;t exist. If you reached it from the sidebar, the module probably ships
        in a later phase — check the phase plan in the README.
      </p>
      <Button asChild className="mt-6">
        <Link href={"/dashboard" as never}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
