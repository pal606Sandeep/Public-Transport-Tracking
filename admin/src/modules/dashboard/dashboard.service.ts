import { api } from "@/utils/apiClient";

/** Everything the dashboard shows. Any field may be null if that call failed. */
export interface DashboardData {
  activeTrips: number | null;
  openIncidents: number | null;
  openComplaints: number | null;
  vehicles: { total: number; active: number; utilizationPct: number } | null;
  drivers: { total: number; active: number } | null;
  routes: { total: number; onTimePct: number } | null;
  passengers: { total: number; active: number } | null;
  revenueToday: { amount: number; transactions: number } | null;
  revenueAllTime: { amount: number; transactions: number } | null;
}

const listTotal = async (path: string): Promise<number> => {
  const res = await api.get<{ pagination?: { total?: number } }>(path);
  return res.data?.pagination?.total ?? 0;
};

const startOfTodayIso = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const pick = <T,>(v: PromiseSettledResult<T>): T | null =>
  v.status === "fulfilled" ? v.value : null;

export async function getDashboard(): Promise<DashboardData> {
  const todayFrom = String(new Date(startOfTodayIso()).getTime());

  const [
    activeTrips,
    openIncidents,
    openComplaints,
    veh,
    drv,
    rte,
    pax,
    revToday,
    revAll,
  ] = await Promise.allSettled([
    listTotal("/admin/trips?status=ACTIVE&limit=1"),
    listTotal("/admin/incidents?status=OPEN&limit=1"),
    listTotal("/admin/complaints?status=OPEN&limit=1"),
    api.get<Record<string, unknown>>("/admin/analytics/vehicles"),
    api.get<Record<string, unknown>>("/admin/analytics/drivers"),
    api.get<Record<string, unknown>>("/admin/analytics/routes"),
    api.get<Record<string, unknown>>("/admin/analytics/passengers"),
    api.get<Record<string, unknown>>(
      `/admin/analytics/revenue?from=${todayFrom}`
    ),
    api.get<Record<string, unknown>>("/admin/analytics/revenue"),
  ]);

  const n = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const vehD = pick(veh)?.data as Record<string, unknown> | undefined;
  const drvD = pick(drv)?.data as Record<string, unknown> | undefined;
  const rteD = pick(rte)?.data as Record<string, unknown> | undefined;
  const paxD = pick(pax)?.data as Record<string, unknown> | undefined;
  const rTodayD = pick(revToday)?.data as
    | { totals?: Record<string, unknown> }
    | undefined;
  const rAllD = pick(revAll)?.data as
    | { totals?: Record<string, unknown> }
    | undefined;

  return {
    activeTrips: pick(activeTrips),
    openIncidents: pick(openIncidents),
    openComplaints: pick(openComplaints),
    vehicles: vehD
      ? {
          total: n(vehD.totalVehicles),
          active: n(vehD.activeVehicles),
          utilizationPct: n(vehD.utilizationPercentage),
        }
      : null,
    drivers: drvD
      ? { total: n(drvD.totalDrivers), active: n(drvD.activeDrivers) }
      : null,
    routes: rteD
      ? {
          total: n(rteD.totalRoutes),
          onTimePct: n(
            (rteD.totals as Record<string, unknown> | undefined)
              ?.averageOnTimePercentage
          ),
        }
      : null,
    passengers: paxD
      ? { total: n(paxD.total), active: n(paxD.activePassengers) }
      : null,
    revenueToday: rTodayD?.totals
      ? {
          amount: n(rTodayD.totals.revenue),
          transactions: n(rTodayD.totals.transactions),
        }
      : null,
    revenueAllTime: rAllD?.totals
      ? {
          amount: n(rAllD.totals.revenue),
          transactions: n(rAllD.totals.transactions),
        }
      : null,
  };
}
