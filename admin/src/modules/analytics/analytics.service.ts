import * as analyticsApi from "./analytics.api";
import type {
  AnalyticsQuery,
  AnalyticsSeries,
  OverviewStats,
} from "./analytics.types";

export const getOverview = async (): Promise<OverviewStats | null> => {
  const res = await analyticsApi.getOverview();
  return res.data ?? null;
};

export const getPassengerAnalytics = async (
  query?: AnalyticsQuery
): Promise<AnalyticsSeries[]> => {
  const res = await analyticsApi.getPassengers(query);
  return res.data ?? [];
};

export const getVehicleAnalytics = async (
  query?: AnalyticsQuery
): Promise<AnalyticsSeries[]> => {
  const res = await analyticsApi.getVehicles(query);
  return res.data ?? [];
};

export const getDriverAnalytics = async (
  query?: AnalyticsQuery
): Promise<AnalyticsSeries[]> => {
  const res = await analyticsApi.getDrivers(query);
  return res.data ?? [];
};

export const getRouteAnalytics = async (
  query?: AnalyticsQuery
): Promise<AnalyticsSeries[]> => {
  const res = await analyticsApi.getRoutes(query);
  return res.data ?? [];
};

export const getRevenueAnalytics = async (
  query?: AnalyticsQuery
): Promise<AnalyticsSeries[]> => {
  const res = await analyticsApi.getRevenue(query);
  return res.data ?? [];
};
