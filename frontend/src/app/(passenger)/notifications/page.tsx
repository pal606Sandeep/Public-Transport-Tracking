import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { NotificationInbox } from "@/modules/notification/components/NotificationInbox";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        back
        action={
          <Link
            href="/notifications/settings"
            aria-label="Notification settings"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.6.67 1.02 1.32 1H21a2 2 0 010 4h-.09c-.65 0-1.18.4-1.32 1z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </Link>
        }
      />
      <NotificationInbox />
    </>
  );
}
