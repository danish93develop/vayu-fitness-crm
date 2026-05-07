import { auth } from "@/auth";
import { SidebarNav } from "./sidebar-nav";
import { navItems } from "@/constants/nav";
import { Dumbbell } from "lucide-react";
import { BRAND } from "@/constants/brand";

export async function Sidebar() {
  const session = await auth();
  const role = session?.user?.role;

  // Filter nav items by role on the server — clients never see items they can't open
  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  });

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-sidebar-border bg-gradient-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-[hsl(222,47%,11%)] shadow-glow-sm">
          <Dumbbell className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{BRAND.name}</div>
          <div className="text-xs text-sidebar-foreground/60">CRM &amp; Membership</div>
        </div>
      </div>

      <SidebarNav items={visibleItems} />

      <div className="border-t border-sidebar-border px-5 py-3 text-xs text-sidebar-foreground/50">
        v0.1 · Local MVP
      </div>
    </aside>
  );
}
