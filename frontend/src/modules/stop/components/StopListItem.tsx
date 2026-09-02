import { ListRow } from "@/components/ui";
import type { Stop } from "../constant/stop.types";

const PinIcon = (
  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  </span>
);

export function StopListItem({ stop }: { stop: Stop }) {
  return (
    <ListRow
      href={`/stops/${stop._id}`}
      leading={PinIcon}
      title={stop.name}
      subtitle={
        [stop.code, stop.address].filter(Boolean).join(" · ") ||
        (stop.accessibility ? "Step-free access" : undefined)
      }
      trailing={
        !stop.isActive ? (
          <span className="text-xs text-muted-foreground">Closed</span>
        ) : undefined
      }
    />
  );
}
