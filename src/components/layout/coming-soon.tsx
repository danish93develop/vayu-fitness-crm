import { Construction } from "lucide-react";

type Props = {
  feature: string;
  phase: number;
  description?: string;
};

export function ComingSoon({ feature, phase, description }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{feature}</h1>
        <p className="text-sm text-muted-foreground">
          {description ?? `${feature} module — ships in Phase ${phase}.`}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-foreground">
          <Construction className="h-6 w-6 text-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Coming in Phase {phase}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The schema is already in place — this UI lands when we work through Phase {phase}.
        </p>
      </div>
    </div>
  );
}
