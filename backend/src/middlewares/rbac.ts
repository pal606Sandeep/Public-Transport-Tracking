import { Request, Response, NextFunction } from "express";
import { Role } from "../models/role.model.js";
import { User } from "../modules/user/user.model.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { isAdminRole } from "../constants/roles.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Load the caller's role permissions. Result is cached in-process (short TTL)
 * to avoid a DB hit on every guarded route; role mapping changes propagate on
 * the next cache refresh.
 */
const rolePermissionCache = new Map<string, { permissions: string[]; at: number }>();
const CACHE_MS = 5000;

export const getRolePermissions = async (role: string): Promise<string[]> => {
  if (isAdminRole(role)) return []; // admin bypass resolved in hasPermission
  const cached = rolePermissionCache.get(role);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.permissions;

  const doc = await Role.findOne({ code: role }).lean();
  const permissions: string[] = (doc?.permissions as string[]) || [];
  rolePermissionCache.set(role, { permissions, at: Date.now() });
  return permissions;
};

/**
 * Does a set of granted permissions satisfy `permission` (optionally scoped to
 * `resource`)? Grant if the bare verb, a resource-qualified `<verb>:<resource>`,
 * `MANAGE`, or an admin role is present.
 */
export const hasPermission = (
  permissions: string[] | undefined,
  permission: string,
  resource?: string,
  role?: string
): boolean => {
  if (isAdminRole(role)) return true;
  const list = permissions ?? [];
  if (list.includes("MANAGE")) return true;
  if (resource && list.includes(`${permission}:${resource}`)) return true;
  return list.includes(permission);
};

/**
 * authenticate: require a valid access/guest JWT (Bearer), load the user, and
 * attach `req.user` (with role permissions). Throws 401 otherwise.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    }

    const token = header.split(" ")[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized("Invalid or expired token", "INVALID_TOKEN");
    }

    // Guest-scoped tokens are accepted as read-only GUEST identities.
    if ((payload as { scope?: string }).scope === "guest") {
      req.user = { id: payload.id, role: "GUEST", scope: "guest", permissions: ["VIEW"] };
      next();
      return;
    }

    const user = await User.findById(payload.id).lean();
    if (!user || !user.isActive || user.deletedAt) {
      throw AppError.unauthorized("Account not found or inactive", "ACCOUNT_INACTIVE");
    }
    if (user.passwordChangedAt && payload.iat) {
      const changedMs = new Date(user.passwordChangedAt).getTime() / 1000;
      if (changedMs > (payload.iat ?? 0)) {
        throw AppError.unauthorized("Token issued before password change", "PASSWORD_CHANGED");
      }
    }

    const permissions = await getRolePermissions(user.role);
    req.user = {
      id: user._id.toString(),
      role: user.role,
      permissions,
      sessionId: payload.sessionId,
      scope: payload.scope,
    };
    next();
  }
);

/**
 * guestOrAuth: allow guest tokens (read-only) or real users. Attaches req.user
 * with a `scope` of "guest" or "user".
 */
export const guestOrAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      let token = header.split(" ")[1];
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        throw AppError.unauthorized("Invalid token", "INVALID_TOKEN");
      }
      if ((payload as { scope?: string }).scope === "guest") {
        req.user = {
          id: payload.id,
          role: "GUEST",
          scope: "guest",
          permissions: ["VIEW"],
        };
        next();
        return;
      }
      await authenticate(req, _res, next);
      return;
    }
    throw AppError.unauthorized("Authentication required", "NO_TOKEN");
  }
);

/**
 * authorize(permission, resource?): require the authenticated user to hold the
 * given permission (optionally scoped to a resource). Admin roles bypass.
 * e.g. authorize("CREATE", "user").
 */
export const authorize =
  (permission: string, resource?: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.forbidden("Permission required", "NO_PERMISSION"));
      return;
    }
    if (
      !hasPermission(req.user.permissions, permission, resource, req.user.role)
    ) {
      next(
        AppError.forbidden(
          `Missing permission: ${permission}${resource ? `:${resource}` : ""}`,
          "FORBIDDEN"
        )
      );
      return;
    }
    next();
  };

/**
 * authorizeRoles(...roles): simple role allow-list check (kept for
 * compatibility with the original role middleware).
 */
export const authorizeRoles =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden("Forbidden: insufficient role", "FORBIDDEN"));
      return;
    }
    next();
  };

/**
 * Resource-level authorization helper: a handler asks whether the caller may
 * operate on a target record owned by `resourceOwnerId`.
 *  - owner passes with the base `permission`
 *  - non-owners require a resource-scoped `<permission>:<resource>:any` (or admin/MANAGE)
 * Returns a boolean.
 */
export const canAccessResource = (
  req: Request,
  resourceOwnerId: string | undefined,
  permission: string,
  resource: string
): boolean => {
  if (!req.user) return false;
  if (isAdminRole(req.user.role)) return true;
  const perms = req.user.permissions ?? [];
  if (perms.includes("MANAGE")) return true;
  if (req.user.id === String(resourceOwnerId)) {
    return perms.includes(permission);
  }
  return perms.includes(`${permission}:${resource}:any`);
};
