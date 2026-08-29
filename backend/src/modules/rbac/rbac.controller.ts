import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as rbac from "./rbac.service.js";

export const listPermissions = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const permissions = await rbac.listPermissions();
    apiResponse(res, 200, true, "Permissions", { permissions });
  }
);

export const listRoles = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const roles = await rbac.listRoles();
    apiResponse(res, 200, true, "Roles", { roles });
  }
);

export const getRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const role = await rbac.getRole((req.params as { code: string }).code);
    apiResponse(res, 200, true, "Role", { role });
  }
);

export const updateRolePermissions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const code = (req.params as { code: string }).code;
    const permissions = (req.body as { permissions: string[] }).permissions;
    const role = await rbac.setRolePermissions(
      { code, permissions },
      { id: req.user?.id, role: req.user?.role }
    );
    apiResponse(res, 200, true, "Role permissions updated", { role });
  }
);

export const createRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const role = await rbac.createRole(req.body as never);
    apiResponse(res, 201, true, "Role created", { role });
  }
);

export const deleteRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await rbac.deleteRole((req.params as { code: string }).code);
    apiResponse(res, 200, true, "Role deleted");
  }
);
