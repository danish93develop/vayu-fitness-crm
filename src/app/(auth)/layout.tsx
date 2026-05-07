// Bare layout for the auth pages — no sidebar, no topbar, aurora mesh background.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora">
      {/* Animated gradient blobs — adds movement without being distracting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[hsl(84,81%,56%)] opacity-20 blur-3xl animate-aurora-shift"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(158,64%,42%)] opacity-25 blur-3xl animate-aurora-shift"
        style={{ animationDelay: "-7s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/3 h-[320px] w-[320px] rounded-full bg-[hsl(199,89%,60%)] opacity-15 blur-3xl"
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
