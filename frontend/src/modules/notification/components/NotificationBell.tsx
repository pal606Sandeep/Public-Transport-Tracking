"use client";

import Link from "next/link";
import { useUnreadCount } from "../hooks/useNotifications";

export function NotificationBell() {
  const unread = useUnreadCount();
  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      className="relative -mr-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
