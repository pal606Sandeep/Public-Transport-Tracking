export interface NavItem {
  label: string;
  href: string;
  /** false = shown in the sidebar but not yet implemented */
  ready?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", ready: true },
      { label: "Live map", href: "/live" },
    ],
  },
  {
    title: "Network",
    items: [
      { label: "Routes", href: "/routes", ready: true },
      { label: "Stops", href: "/stops", ready: true },
      { label: "Schedules", href: "/schedules", ready: true },
    ],
  },
  {
    title: "Fleet",
    items: [
      { label: "Vehicles", href: "/vehicles", ready: true },
      { label: "Drivers", href: "/drivers", ready: true },
      { label: "Conductors", href: "/conductors", ready: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Trips", href: "/trips", ready: true },
      { label: "Dispatch", href: "/dispatch", ready: true },
      { label: "Assignment requests", href: "/assignment-requests", ready: true },
      { label: "Incidents", href: "/incidents", ready: true },
      { label: "Maintenance", href: "/maintenance", ready: true },
    ],
  },
  {
    title: "Riders",
    items: [
      { label: "Complaints", href: "/complaints", ready: true },
      { label: "Lost & found", href: "/lost-found", ready: true },
      { label: "Service alerts", href: "/service-alerts", ready: true },
      { label: "Notification templates", href: "/notification-templates", ready: true },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Fares & passes", href: "/fares", ready: true },
      { label: "Payments", href: "/payments", ready: true },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", href: "/users", ready: true },
      { label: "Analytics", href: "/analytics", ready: true },
      { label: "Reports", href: "/reports", ready: true },
      { label: "Audit logs", href: "/audit-logs", ready: true },
      { label: "Settings", href: "/settings", ready: true },
    ],
  },
];
