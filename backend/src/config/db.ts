import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const DEFAULT_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 3000;

interface ConnectDBOptions {
  retries?: number;
  retryDelayMs?: number;
}

let isConnected = false;

/**
 * Connect to MongoDB with automatic retry.
 * Requires a replica set URl (e.g. `mongodb://localhost:27017/db?replicaSet=rs0`)
 * so that multi-document transactions and change streams work.
 */
export const connectDB = async (options: ConnectDBOptions = {}): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  const { retries = DEFAULT_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;
  let attempt = 0;

  mongoose.connection.on("connected", () => {
    const host = mongoose.connection.host ?? "unknown";
    logger.info(`MongoDB connected: ${host}`);
    isConnected = true;
  });

  mongoose.connection.on("error", (error) => {
    logger.error(`MongoDB connection error: ${(error as Error).message}`);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  while (attempt < retries) {
    attempt += 1;
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: retryDelayMs });
      return;
    } catch (error) {
      const message = (error as Error).message;
      if (attempt >= retries) {
        throw new Error(`MongoDB connection failed after ${retries} attempts: ${message}`);
      }
      logger.warn(`MongoDB connection attempt ${attempt} failed (${message}); retrying in ${retryDelayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

/**
 * Close the MongoDB connection cleanly (used on SIGINT/SIGTERM).
 */
export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  isConnected = false;
};

export const isDbConnected = (): boolean => isConnected;
