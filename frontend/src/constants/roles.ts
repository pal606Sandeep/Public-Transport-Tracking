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

export const STAFF_ROLES: Role[] = [ROLES.DRIVER, ROLES.CONDUCTOR];
export const PASSENGER_ROLES: Role[] = [ROLES.PASSENGER, ROLES.GUEST];

export type AppArea = "passenger" | "operations" | "unknown";

export const roleArea = (role?: string): AppArea => {
  if (role === ROLES.DRIVER || role === ROLES.CONDUCTOR) return "operations";
  if (role === ROLES.PASSENGER || role === ROLES.GUEST) return "passenger";
  return "unknown";
};
