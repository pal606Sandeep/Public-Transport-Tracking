import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./maintenance.service.js";

const ok = asyncHandler;

const vehicleId = (req: Request): string => (req.params as { vehicleId: string }).vehicleId;
const id = (req: Request): string => (req.params as { id: string }).id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

// --- maintenance records ---
export const listMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listMaintenance(vehicleId(req), {
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    status: q.status,
  });
  apiResponse(res, 200, true, "Maintenance records", result);
});

export const createMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createMaintenance(vehicleId(req), req.body as never);
  apiResponse(res, 201, true, "Maintenance record created", { record: doc });
});

export const getMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getMaintenance(vehicleId(req), id(req));
  apiResponse(res, 200, true, "Maintenance record", { record: doc });
});

export const updateMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateMaintenance(vehicleId(req), id(req), req.body as never);
  apiResponse(res, 200, true, "Maintenance record updated", { record: doc });
});

export const completeMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.completeMaintenance(vehicleId(req), id(req));
  apiResponse(res, 200, true, "Maintenance record completed", { record: doc });
});

export const deleteMaintenance = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.deleteMaintenance(vehicleId(req), id(req));
  apiResponse(res, 200, true, "Maintenance record deleted");
});

// --- vehicle documents ---
export const listDocuments = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listDocuments(vehicleId(req), { status: q.status });
  apiResponse(res, 200, true, "Vehicle documents", result);
});

export const createDocument = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createDocument(vehicleId(req), req.body as never);
  apiResponse(res, 201, true, "Vehicle document created", { document: doc });
});

export const getDocument = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getDocument(vehicleId(req), id(req));
  apiResponse(res, 200, true, "Vehicle document", { document: doc });
});

export const updateDocument = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateDocument(vehicleId(req), id(req), req.body as never);
  apiResponse(res, 200, true, "Vehicle document updated", { document: doc });
});

export const deleteDocument = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.deleteDocument(vehicleId(req), id(req));
  apiResponse(res, 200, true, "Vehicle document deleted");
});

// --- jobs / reminders ---
export const runJobs = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.runMaintenanceJobs(actorOf(req));
  apiResponse(res, 200, true, "Maintenance jobs run", result);
});
