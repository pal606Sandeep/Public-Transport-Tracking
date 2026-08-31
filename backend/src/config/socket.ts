import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import dotenv from "dotenv";
import { createRedisClient } from "./redis.js";
import { verifyAccessToken, AccessTokenPayload } from "../utils/tokens.js";
import logger from "../utils/logger.js";

dotenv.config();

let io: SocketIOServer | null = null;

const pubClient = createRedisClient("socket-pub");
const subClient = createRedisClient("socket-sub");

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    scope: "user" | "guest";
    sessionId?: string;
  };
}

export interface RoomSubscription {
  vehicle?: string;
  route?: string;
  trip?: string;
  stop?: string;
  fleetAll?: boolean;
}

const userRooms = new Map<string, RoomSubscription>();

export const initSocket = (httpServer: http.Server): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(socketAuthMiddleware);
  io.on("connection", handleConnection);

  logger.info("Socket.IO server initialized with Redis adapter");
  return io;
};

/**
 * Nullable by design: every call site chains with `getIO()?.to(...)`
 * because tracking logic can run in contexts where a socket server was
 * never started (tests, the worker process, request handling that races
 * server startup) — broadcasting is best-effort there, not fatal.
 */
export const getIO = (): SocketIOServer | null => io;

const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Socket connection rejected: no token provided", {
      socketId: socket.id,
      ip: socket.handshake.address,
    });
    return next(new Error("Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token) as AccessTokenPayload & { scope?: string };

    if (payload.scope === "guest") {
      socket.user = {
        id: payload.id,
        role: "GUEST",
        permissions: ["VIEW"],
        scope: "guest",
      };
      logger.info("Guest socket authenticated", { socketId: socket.id, guestId: payload.id });
      return next();
    }

    socket.user = {
      id: payload.id,
      role: payload.role,
      permissions: [],
      scope: "user",
      sessionId: payload.sessionId,
    };
    logger.info("User socket authenticated", { socketId: socket.id, userId: payload.id, role: payload.role });
    next();
  } catch (err) {
    logger.warn("Socket connection rejected: invalid token", {
      socketId: socket.id,
      error: (err as Error).message,
      ip: socket.handshake.address,
    });
    next(new Error("Invalid or expired token"));
  }
};

const handleConnection = (socket: AuthenticatedSocket) => {
  const { user } = socket;
  logger.info("Socket connected", { socketId: socket.id, userId: user?.id, role: user?.role, scope: user?.scope });

  userRooms.set(socket.id, {});

  socket.on("subscribe", (data: { vehicleId?: string; routeId?: string; tripId?: string; stopId?: string; fleetAll?: boolean }, callback) => {
    handleSubscribe(socket, data, callback);
  });

  socket.on("unsubscribe", (data: { vehicleId?: string; routeId?: string; tripId?: string; stopId?: string; fleetAll?: boolean }, callback) => {
    handleUnsubscribe(socket, data, callback);
  });

  socket.on("disconnect", (reason) => {
    handleDisconnect(socket, reason);
  });

  socket.on("error", (err) => {
    logger.error("Socket error", { socketId: socket.id, error: err.message });
  });
};

const handleSubscribe = (socket: AuthenticatedSocket, data: { vehicleId?: string; routeId?: string; tripId?: string; stopId?: string; fleetAll?: boolean }, callback?: (response: { success: boolean; message?: string; error?: string }) => void) => {
  const { user } = socket;
  const subscriptions = userRooms.get(socket.id) || {};
  const responses: string[] = [];

  if (data.vehicleId) {
    const room = `vehicle:${data.vehicleId}`;
    socket.join(room);
    subscriptions.vehicle = data.vehicleId;
    responses.push(`joined ${room}`);
    logger.debug("Socket joined vehicle room", { socketId: socket.id, room, userId: user?.id });
  }

  if (data.routeId) {
    const room = `route:${data.routeId}`;
    socket.join(room);
    subscriptions.route = data.routeId;
    responses.push(`joined ${room}`);
    logger.debug("Socket joined route room", { socketId: socket.id, room, userId: user?.id });
  }

  if (data.tripId) {
    const room = `trip:${data.tripId}`;
    socket.join(room);
    subscriptions.trip = data.tripId;
    responses.push(`joined ${room}`);
    logger.debug("Socket joined trip room", { socketId: socket.id, room, userId: user?.id });
  }

  if (data.stopId) {
    const room = `stop:${data.stopId}`;
    socket.join(room);
    subscriptions.stop = data.stopId;
    responses.push(`joined ${room}`);
    logger.debug("Socket joined stop room", { socketId: socket.id, room, userId: user?.id });
  }

  if (data.fleetAll) {
    if (user?.scope === "guest" || (!isAdminRole(user?.role) && !hasFleetPermission(user?.permissions))) {
      const msg = "Access denied: fleet:all requires admin role";
      logger.warn("Socket denied fleet:all access", { socketId: socket.id, userId: user?.id, role: user?.role });
      callback?.({ success: false, error: msg });
      return;
    }
    const room = "fleet:all";
    socket.join(room);
    subscriptions.fleetAll = true;
    responses.push(`joined ${room}`);
    logger.info("Socket joined fleet:all room", { socketId: socket.id, userId: user?.id, role: user?.role });
  }

  userRooms.set(socket.id, subscriptions);
  callback?.({ success: true, message: responses.join(", ") });
};

const handleUnsubscribe = (socket: AuthenticatedSocket, data: { vehicleId?: string; routeId?: string; tripId?: string; stopId?: string; fleetAll?: boolean }, callback?: (response: { success: boolean; message?: string }) => void) => {
  const subscriptions = userRooms.get(socket.id) || {};

  if (data.vehicleId) {
    const room = `vehicle:${data.vehicleId}`;
    socket.leave(room);
    delete subscriptions.vehicle;
    logger.debug("Socket left vehicle room", { socketId: socket.id, room });
  }

  if (data.routeId) {
    const room = `route:${data.routeId}`;
    socket.leave(room);
    delete subscriptions.route;
    logger.debug("Socket left route room", { socketId: socket.id, room });
  }

  if (data.tripId) {
    const room = `trip:${data.tripId}`;
    socket.leave(room);
    delete subscriptions.trip;
    logger.debug("Socket left trip room", { socketId: socket.id, room });
  }

  if (data.stopId) {
    const room = `stop:${data.stopId}`;
    socket.leave(room);
    delete subscriptions.stop;
    logger.debug("Socket left stop room", { socketId: socket.id, room });
  }

  if (data.fleetAll) {
    const room = "fleet:all";
    socket.leave(room);
    subscriptions.fleetAll = false;
    logger.debug("Socket left fleet:all room", { socketId: socket.id });
  }

  userRooms.set(socket.id, subscriptions);
  callback?.({ success: true, message: "Unsubscribed successfully" });
};

const handleDisconnect = (socket: AuthenticatedSocket, reason: string) => {
  const { user } = socket;
  userRooms.delete(socket.id);
  logger.info("Socket disconnected", { socketId: socket.id, userId: user?.id, role: user?.role, reason });
};

export const broadcastToVehicle = (vehicleId: string, event: string, data: unknown) => {
  io?.to(`vehicle:${vehicleId}`).emit(event, data);
};

export const broadcastToRoute = (routeId: string, event: string, data: unknown) => {
  io?.to(`route:${routeId}`).emit(event, data);
};

export const broadcastToTrip = (tripId: string, event: string, data: unknown) => {
  io?.to(`trip:${tripId}`).emit(event, data);
};

export const broadcastToStop = (stopId: string, event: string, data: unknown) => {
  io?.to(`stop:${stopId}`).emit(event, data);
};

export const broadcastToFleetAll = (event: string, data: unknown) => {
  io?.to("fleet:all").emit(event, data);
};

export const broadcastToAll = (event: string, data: unknown) => {
  io?.emit(event, data);
};

export const getSocketUser = (socketId: string) => {
  const socket = io?.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
  return socket?.user;
};

export const getRoomSockets = async (room: string) => {
  if (!io) return [];
  const sockets = await io.in(room).fetchSockets();
  return sockets.map((s) => {
    const authSocket = s as unknown as AuthenticatedSocket;
    return authSocket.user;
  }).filter(Boolean);
};

function isAdminRole(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function hasFleetPermission(permissions: string[] = []): boolean {
  return permissions.includes("MANAGE") || permissions.includes("VIEW:fleet") || permissions.includes("VIEW:vehicle:any");
}