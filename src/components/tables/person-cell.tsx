import Link from "next/link";
import { AvatarCell } from "./avatar-cell";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  seed?: string;
  photoUrl?: string | null;
  secondary?: React.ReactNode;
  href?: string;
  size?: "sm" | "md" | "lg";
};

/** Avatar (or photo) + name (bold) + secondary line. Used as the headline cell on listing tables. */
export function PersonCell({ name, seed, photoUrl, secondary, href, size = "md" }: Props) {
  const inner = (
    <div className="flex min-w-0 items-center gap-3">
      <AvatarCell name={name} seed={seed} photoUrl={photoUrl} size={size} />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-medium",
            href && "transition-colors group-hover:text-foreground",
          )}
        >
          {name}
        </div>
        {secondary && (
          <div className="truncate text-xs text-muted-foreground">{secondary}</div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href as never} className="block hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
