"use client";

import { cn } from "@/lib/cn";
import { useFavourites, useToggleFavourite } from "../hooks/usePassenger";
import { useSession } from "@/modules/auth/hooks/useAuth";
import type { FavouriteType } from "../constant/passenger.types";

export function FavouriteToggle({
  type,
  targetId,
  className,
}: {
  type: FavouriteType;
  targetId: string;
  className?: string;
}) {
  const { isGuest } = useSession();
  const { data } = useFavourites();
  const toggle = useToggleFavourite();

  // guests can't favourite — hide the control
  if (isGuest) return null;

  const list = type === "route" ? data?.routes : data?.stops;
  const active = Boolean(list?.includes(targetId));

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ type, targetId, active })}
      className={cn(
        "rounded-full p-2 transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 17.3l-5.5 3 1-6.1L3 9.9l6.1-.9L12 3.5l2.9 5.5 6.1.9-4.5 4.3 1 6.1z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
