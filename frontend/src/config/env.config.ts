export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000/api/v1";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || "http://localhost:5000";

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "1.0.0";
