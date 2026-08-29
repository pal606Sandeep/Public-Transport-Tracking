import { Server as SocketIOServer } from "socket.io";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: http.Server): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket() first.");
  }
  return io;
};