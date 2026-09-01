import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { getReport, ReportQuery } from "./reports.service.js";
import { toCsv, toPdf } from "./reports.export.js";

const ok = asyncHandler;

const reportQuery = (req: Request): ReportQuery => {
  const q = req.query as Record<string, string>;
  return {
    from: q.from ? Number(q.from) : undefined,
    to: q.to ? Number(q.to) : undefined,
    routeId: q.routeId,
    vehicleId: q.vehicleId,
    driverId: q.driverId,
  };
};

export const jsonReport = ok(async (req: Request, res: Response): Promise<void> => {
  const type = (req.params as { type: string }).type;
  const table = await getReport(type, reportQuery(req));
  apiResponse(res, 200, true, `Report: ${type}`, {
    type,
    columns: table.columns,
    rows: table.rows,
    rowCount: table.rows.length,
  });
});

export const csvReport = ok(async (req: Request, res: Response): Promise<void> => {
  const type = (req.params as { type: string }).type;
  const table = await getReport(type, reportQuery(req));
  const csv = toCsv(table.columns, table.rows);
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-report.csv"`,
    })
    .send(csv);
});

export const pdfReport = ok(async (req: Request, res: Response): Promise<void> => {
  const type = (req.params as { type: string }).type;
  const table = await getReport(type, reportQuery(req));
  const lines = [
    `Generated: ${new Date().toISOString()}`,
    `Columns: ${table.columns.join(", ")}`,
    "",
    ...table.rows.map((r) => r.join(" | ")),
  ];
  const pdf = toPdf(`${type} report`, lines);
  res
    .status(200)
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
    })
    .send(pdf);
});
