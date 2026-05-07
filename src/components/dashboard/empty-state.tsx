import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-40" />
      <p>{message}</p>
    </div>
  );
}
