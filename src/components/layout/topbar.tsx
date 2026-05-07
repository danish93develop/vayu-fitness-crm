import { auth } from "@/auth";
import { getAlerts } from "@/server/services/dashboard";
import {
  listMyNotifications,
  countUnread,
} from "@/server/services/notifications";
import { UserMenu } from "./user-menu";
import { NotificationsDropdown } from "./notifications-dropdown";
import { GlobalSearch } from "./global-search";

export async function Topbar() {
  const session = await auth();
  const user = session?.user;

  // Live operational alerts (existing) + DB-backed notifications (new)
  const [alerts, dbNotifications, unreadCount] = user
    ? await Promise.all([
        getAlerts(user.gymId, user.id),
        listMyNotifications(user.id, 10),
        countUnread(user.id),
      ])
    : [
        {
          overdueInstallments: 0,
          todaysFollowUps: 0,
          pendingFreezes: 0,
          expiredCount: 0,
          snoozed: [],
        },
        [],
        0,
      ];

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex flex-1 items-center gap-3">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        <NotificationsDropdown
          alerts={alerts}
          notifications={dbNotifications}
          unreadCount={unreadCount}
        />
        {user && (
          <UserMenu
            name={user.name ?? "User"}
            email={user.email ?? ""}
            role={user.role}
          />
        )}
      </div>
    </header>
  );
}
