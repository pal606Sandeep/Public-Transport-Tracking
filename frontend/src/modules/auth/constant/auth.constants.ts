/** Auth endpoint paths (relative to API_BASE_URL). As-built backend. */
export const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  guest: "/auth/guest",
  otpRequest: "/auth/otp/request",
  otpVerify: "/auth/otp/verify",
  forgot: "/auth/password/forgot",
  reset: "/auth/password/reset",
  change: "/auth/password/change",
  me: "/auth/me",
  sessions: "/auth/sessions",
  devices: "/auth/devices",
} as const;
