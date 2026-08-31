import { ROLES } from "@/constants/roles";

/** Landing route for a role after authentication. */
export const homePathForRole = (role?: string): string => {
  switch (role) {
    case ROLES.DRIVER:
      return "/driver";
    case ROLES.CONDUCTOR:
      return "/conductor";
    case ROLES.PASSENGER:
    case ROLES.GUEST:
      return "/map";
    default:
      return "/login";
  }
};

/** Basic dotted-version compare: is `current` older than `min`? */
export const isVersionBelow = (current: string, min: string): boolean => {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = min.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
};
