import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Deterministic gradient avatar with initials, OR a real uploaded photo
 * if `photoUrl` is provided. Same name + same seed → same gradient color
 * across renders.
 */

const PALETTE = [
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-sky-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600",
  "from-lime-400 to-lime-600",
  "from-cyan-400 to-cyan-600",
  "from-fuchsia-400 to-fuchsia-600",
];

function colorIndex(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(h) % PALETTE.length;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

type Props = {
  name: string;
  seed?: string;
  /** When set, renders the real photo instead of the gradient initials */
  photoUrl?: string | null;
  size?: Size;
  className?: string;
};

export function AvatarCell({
  name,
  seed,
  photoUrl,
  size = "md",
  className,
}: Props) {
  if (photoUrl) {
    const px = SIZE_PX[size];
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={px}
        height={px}
        unoptimized
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-card",
          SIZE_CLASS[size],
          className,
        )}
      />
    );
  }

  const palette = PALETTE[colorIndex(seed ?? name)] ?? PALETTE[0];
  const initials = getInitials(name) || "?";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-card",
        palette,
        SIZE_CLASS[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
