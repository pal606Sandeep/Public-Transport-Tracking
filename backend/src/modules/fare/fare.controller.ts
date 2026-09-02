import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./fare.service.js";

const ok = asyncHandler;
const parseId = (req: Request): string => (req.params as { id: string }).id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

/* ----------------------------- Fares ----------------------------- */

export const listFares = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listFares({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    type: q.type,
    isActive: q.isActive,
    search: q.search,
  });
  apiResponse(res, 200, true, "Fares", result);
});

export const getFare = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getFareById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Fare", { fare: doc });
});

export const createFare = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createFare(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Fare created", { fare: doc });
});

export const updateFare = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateFare(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Fare updated", { fare: doc });
});

export const removeFare = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeFare(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Fare deleted");
});

/* --------------------------- Fare Rules --------------------------- */

export const listFareRules = ok(async (_req: Request, res: Response): Promise<void> => {
  const result = await svc.listFareRules();
  apiResponse(res, 200, true, "Fare rules", result);
});

export const getFareRule = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getFareRuleById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Fare rule", { fareRule: doc });
});

export const createFareRule = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createFareRule(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Fare rule created", { fareRule: doc });
});

export const updateFareRule = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateFareRule(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Fare rule updated", { fareRule: doc });
});

export const removeFareRule = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeFareRule(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Fare rule deleted");
});

/* --------------------------- Concessions --------------------------- */

export const listConcessions = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listConcessions({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    type: q.type,
    isActive: q.isActive,
  });
  apiResponse(res, 200, true, "Concessions", result);
});

export const getConcession = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getConcessionById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Concession", { concession: doc });
});

export const createConcession = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createConcession(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Concession created", { concession: doc });
});

export const updateConcession = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateConcession(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Concession updated", { concession: doc });
});

export const removeConcession = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeConcession(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Concession deleted");
});

/* ----------------------------- Passes ----------------------------- */

export const listPasses = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listPasses({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    type: q.type,
    isActive: q.isActive,
  });
  apiResponse(res, 200, true, "Passes", result);
});

export const getPass = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getPassById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Pass", { pass: doc });
});

export const createPass = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createPass(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Pass created", { pass: doc });
});

export const updatePass = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updatePass(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Pass updated", { pass: doc });
});

export const removePass = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removePass(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Pass deleted");
});

export const calculateFare = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.calculateFare(req.body as never);
  apiResponse(res, 200, true, "Fare calculated", result);
});

/* --------------------- Public passenger-facing catalog --------------------- */

export const listPublicPasses = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listPasses({
    page: Number(q.page ?? 1),
    limit: Math.min(Number(q.limit ?? 100), 100),
    type: q.type,
    isActive: "true",
  });
  apiResponse(res, 200, true, "Passes", result);
});

export const listPublicConcessions = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listConcessions({
    page: Number(q.page ?? 1),
    limit: Math.min(Number(q.limit ?? 100), 100),
    type: q.type,
    isActive: "true",
  });
  apiResponse(res, 200, true, "Concessions", result);
});
