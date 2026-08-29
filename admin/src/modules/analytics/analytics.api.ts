import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { ANALYTICS_ROUTES } from "./analytics.routes";
import type {
  AnalyticsQuery,
  AnalyticsSeries,
  OverviewStats,
} from "./analytics.types";

const toQuery = (params: AnalyticsQuery = {}): string => {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== ""
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : "";
};

export const getOverview = (): Promise<ApiResponse<OverviewStats>> =>
  apiClient<OverviewStats>(ANALYTICS_ROUTES.overview());

export const getPassengers = (
  query?: AnalyticsQuery
): Promise<ApiResponse<AnalyticsSeries[]>> =>
  apiClient<AnalyticsSeries[]>(
    `${ANALYTICS_ROUTES.passengers()}${toQuery(query)}`
  );

export const getVehicles = (
  query?: AnalyticsQuery
): Promise<ApiResponse<AnalyticsSeries[]>> =>
  apiClient<AnalyticsSeries[]>(`${ANALYTICS_ROUTES.vehicles()}${toQuery(query)}`);

export const getDrivers = (
  query?: AnalyticsQuery
): Promise<ApiResponse<AnalyticsSeries[]>> =>
  apiClient<AnalyticsSeries[]>(`${ANALYTICS_ROUTES.drivers()}${toQuery(query)}`);

export const getRoutes = (
  query?: AnalyticsQuery
): Promise<ApiResponse<AnalyticsSeries[]>> =>
  apiClient<AnalyticsSeries[]>(`${ANALYTICS_ROUTES.routes()}${toQuery(query)}`);

export const getRevenue = (
  query?: AnalyticsQuery
): Promise<ApiResponse<AnalyticsSeries[]>> =>
  apiClient<AnalyticsSeries[]>(`${ANALYTICS_ROUTES.revenue()}${toQuery(query)}`);
