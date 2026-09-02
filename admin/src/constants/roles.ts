export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  TRANSPORT_MANAGER: "TRANSPORT_MANAGER",
  DISPATCHER: "DISPATCHER",
  MAINTENANCE_MANAGER: "MAINTENANCE_MANAGER",
  SUPPORT_STAFF: "SUPPORT_STAFF",
  DRIVER: "DRIVER",
  CONDUCTOR: "CONDUCTOR",
  PASSENGER: "PASSENGER",
  GUEST: "GUEST",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles this dashboard serves. Everyone else is bounced to /login. */
export const ADMIN_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.TRANSPORT_MANAGER,
  ROLES.DISPATCHER,
  ROLES.MAINTENANCE_MANAGER,
  ROLES.SUPPORT_STAFF,
];

export const isAdminRole = (role?: string | null): boolean =>
  !!role && (ADMIN_ROLES as string[]).includes(role);

/** Full write access (create/update/delete on fleet + config). */
export const isFullAdmin = (role?: string | null): boolean =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  TRANSPORT_MANAGER: "Transport manager",
  DISPATCHER: "Dispatcher",
  MAINTENANCE_MANAGER: "Maintenance manager",
  SUPPORT_STAFF: "Support staff",
  DRIVER: "Driver",
  CONDUCTOR: "Conductor",
  PASSENGER: "Passenger",
  GUEST: "Guest",
};
