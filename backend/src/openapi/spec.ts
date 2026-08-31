import type { OpenAPIV3_1 } from "openapi-types";

const api: OpenAPIV3_1.Document = {
  openapi: "3.1.0",
  info: {
    title: "Public Transport Tracking API",
    version: "1.0.0",
    description:
      "Backend API for the real-time public transport tracking PWA. Covers Phase 1 Foundation, Phase 2 Transport Management, and Passenger/Ticketing/Admin namespaces. All errors conform to the standard `{ error: { code, message, details?, traceId } }` envelope.",
  },
  servers: [{ url: "http://localhost:5000/api/v1", description: "Local dev" }],
  tags: [
    { name: "Auth", description: "Authentication, sessions, OTP, passwords, devices" },
    { name: "Bootstrap", description: "Client config + server time" },
    { name: "RBAC", description: "Roles, permissions, role-permission mapping" },
    { name: "Health", description: "Operational probes" },
  ],
  paths: {
    "/healthz": {
      get: { tags: ["Health"], summary: "Process liveness", responses: { "200": { description: "OK" } } },
    },
    "/readyz": {
      get: {
        tags: ["Health"],
        summary: "Readiness (Mongo + Redis)",
        responses: { "200": { description: "Ready" }, "503": { description: "Not ready" } },
      },
    },
    "/time": {
      get: {
        tags: ["Bootstrap"],
        summary: "Server time (epoch ms)",
        security: [{ bearerAuth: [], guestAuth: [] }],
        responses: { "200": { description: "Server time", content: { "application/json": { schema: { $ref: "#/components/schemas/serverTime" } } } } },
      },
    },
    "/config": {
      get: {
        tags: ["Bootstrap"],
        summary: "Role-filtered client config",
        security: [{ bearerAuth: [], guestAuth: [] }],
        responses: { "200": { description: "Client config", content: { "application/json": { schema: { $ref: "#/components/schemas/clientConfig" } } } } },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register with email/password",
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/register" } } } },
        responses: {
          "201": { description: "Registered" },
          "409": { $ref: "#/components/responses/Error" },
          "400": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login (access token in body, refresh cookie set)",
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/login" } } } },
        responses: {
          "200": { description: "Login OK", headers: { "Set-Cookie": { schema: { type: "string" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/authSuccess" } } } },
          "401": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token (cookie or Bearer)",
        responses: { "200": { description: "New access token", content: { "application/json": { schema: { $ref: "#/components/schemas/authSuccess" } } } }, "401": { $ref: "#/components/responses/Error" } },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (revoke refresh + clear cookie)",
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Profile", security: [{ bearerAuth: [] }], responses: { "200": { description: "Profile", content: { "application/json": { schema: { $ref: "#/components/schemas/userProfile" } } } } } },
      patch: { tags: ["Auth"], summary: "Update profile", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/updateProfile" } } } }, responses: { "200": { description: "Updated" } } },
    },
    "/auth/otp/request": {
      post: { tags: ["Auth"], summary: "Request OTP", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/otpRequest" } } } }, responses: { "200": { description: "OTP sent" }, "429": { $ref: "#/components/responses/Error" } } },
    },
    "/auth/otp/verify": {
      post: { tags: ["Auth"], summary: "Verify OTP and login", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/otpVerify" } } } }, responses: { "200": { description: "Logged in" }, "429": { $ref: "#/components/responses/Error" } } },
    },
    "/auth/guest": {
      post: { tags: ["Auth"], summary: "Guest session", responses: { "200": { description: "Guest token" } } },
    },
    "/auth/sessions": {
      get: { tags: ["Auth"], summary: "List active sessions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Sessions" } } },
    },
    "/auth/sessions/{sessionId}": {
      delete: { tags: ["Auth"], summary: "Revoke a session", security: [{ bearerAuth: [] }], parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Revoked" } } },
    },
    "/auth/password/forgot": {
      post: { tags: ["Auth"], summary: "Request password reset", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/emailRequest" } } } }, responses: { "200": { description: "Always 200" } } },
    },
    "/auth/password/reset": {
      post: { tags: ["Auth"], summary: "Reset password with token", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/resetPassword" } } } }, responses: { "200": { description: "Reset" }, "400": { $ref: "#/components/responses/Error" } } },
    },
    "/auth/password/change": {
      post: { tags: ["Auth"], summary: "Change password (authenticated)", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/changePassword" } } } }, responses: { "200": { description: "Changed" }, "401": { $ref: "#/components/responses/Error" } } },
    },
    "/auth/devices": {
      post: { tags: ["Auth"], summary: "Register device / push subscription", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/device" } } } }, responses: { "201": { description: "Registered" } } },
      get: { tags: ["Auth"], summary: "List devices", security: [{ bearerAuth: [] }], responses: { "200": { description: "Devices" } } },
    },
    "/auth/devices/{deviceId}": {
      delete: { tags: ["Auth"], summary: "Remove device", security: [{ bearerAuth: [] }], parameters: [{ name: "deviceId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Removed" } } },
    },
    "/rbac/permissions": {
      get: { tags: ["RBAC"], summary: "List permissions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Permissions" } } },
    },
    "/rbac/roles": {
      get: { tags: ["RBAC"], summary: "List roles", security: [{ bearerAuth: [] }], responses: { "200": { description: "Roles" } } },
      post: { tags: ["RBAC"], summary: "Create role", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/rbac/roles/{code}/permissions": {
      put: { tags: ["RBAC"], summary: "Set role permissions (audited)", security: [{ bearerAuth: [] }], parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      guestAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    responses: {
      Error: {
        description: "Standard error envelope",
        content: { "application/json": { schema: { $ref: "#/components/schemas/errorEnvelope" } } },
      },
    },
    schemas: {
      errorEnvelope: {
        type: "object",
        required: ["code", "message", "traceId"],
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string" },
              details: { type: "object", additionalProperties: true },
              traceId: { type: "string" },
            },
          },
        },
      },
      serverTime: { type: "object", properties: { serverTime: { type: "integer", description: "epoch ms" } } },
      clientConfig: {
        type: "object",
        properties: {
          gpsSendIntervalSeconds: { type: "integer" },
          geofenceRadiusMeters: { type: "number" },
          etaThresholds: { type: "object" },
          delayThresholds: { type: "object" },
          mapTileSource: { type: "string" },
          supportedLanguages: { type: "array", items: { type: "string" } },
          minSupportedAppVersion: { type: "string" },
          featureFlags: { type: "object" },
          vapidPublicKey: { type: "string" },
          serverTime: { type: "integer" },
        },
      },
      register: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          phone: { type: "string" },
        },
      },
      login: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } },
      authSuccess: {
        type: "object",
        properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "object", additionalProperties: true } },
      },
      userProfile: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, role: { type: "string" }, phone: { type: "string" }, language: { type: "string" } } },
      updateProfile: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, avatarKey: { type: "string" }, language: { type: "string" } } },
      otpRequest: { type: "object", required: ["phone"], properties: { phone: { type: "string" } } },
      otpVerify: { type: "object", required: ["phone", "otp"], properties: { phone: { type: "string" }, otp: { type: "string", pattern: "^[0-9]{6}$" } } },
      emailRequest: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
      resetPassword: { type: "object", required: ["token", "newPassword"], properties: { token: { type: "string" }, newPassword: { type: "string", minLength: 6 } } },
      changePassword: { type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 6 } } },
      device: { type: "object", required: ["deviceId"], properties: { deviceId: { type: "string" }, name: { type: "string" }, platform: { type: "string" }, pushSubscription: { type: "object" } } },
    },
  },
};

export default api;
