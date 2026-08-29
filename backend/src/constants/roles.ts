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

export const ALL_ROLES = Object.values(ROLES) as string[];

/** Roles that require a second DRIVER/CONDUCTOR device to be admin-approved. */
export const SINGLE_DEVICE_ROLES = [ROLES.DRIVER, ROLES.CONDUCTOR] as string[];

export const isAdminRole = (role?: string): boolean =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
