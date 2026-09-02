"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FullScreenLoader, Alert, EmptyState, Button } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { cn } from "@/lib/cn";
import { useSession } from "@/modules/auth/hooks/useAuth";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "../hooks/useNotifications";

const timeAgo = (iso: string): string => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export function NotificationInbox() {
  const router = useRouter();
  const { isAuthenticated, isGuest } = useSession();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, error } = useNotifications(unreadOnly);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  if (isGuest || !isAuthenticated) {
    return (
      <EmptyState
        title="Sign in for notifications"
        hint="Service alerts and updates for your favourite routes land here."
      />
    );
  }
  if (isLoading) return <FullScreenLoader />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const items = data?.notifications ?? [];

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex gap-1 text-xs">
          {(
            [
              ["All", false],
              ["Unread", true],
            ] as [string, boolean][]
          ).map(([label, v]) => (
            <button
              key={label}
              onClick={() => setUnreadOnly(v)}
              className={cn(
                "rounded-full px-2.5 py-1",
                unreadOnly === v
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {(data?.unread ?? 0) > 0 && (
          <Button
            size="sm"
            variant="ghost"
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title={unreadOnly ? "Nothing unread" : "No notifications"} />
      ) : (
        <ul className="divide-y">
          {items.map((n) => {
            const url =
              typeof n.data?.url === "string" ? (n.data.url as string) : null;
            return (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) markRead.mutate({ id: n._id });
                    if (url) router.push(url);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                    !n.read && "bg-primary/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
