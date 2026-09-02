"use client";

import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env.config";
import { getAccessToken, onAccessTokenChange } from "@/lib/auth/tokenStore";

export interface SubscribeTarget {
  vehicleId?: string;
  routeId?: string;
  tripId?: string;
  fleetAll?: boolean;
}

type Ack = { success: boolean; message?: string; error?: string };

let socket: Socket | null = null;
let tokenUnsub: (() => void) | null = null;

/** Lazily create the shared socket. Reconnects with a fresh token when it changes. */
export const getSocket = (): Socket => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: (cb) => cb({ token: getAccessToken() ?? "" }),
  });

  tokenUnsub?.();
  tokenUnsub = onAccessTokenChange(() => {
    if (socket && socket.connected) {
      socket.disconnect().connect();
    }
  });

  return socket;
};

export const subscribe = (target: SubscribeTarget): Promise<Ack> =>
  new Promise((resolve) => {
    getSocket().emit("subscribe", target, (ack: Ack) =>
      resolve(ack ?? { success: false, error: "no ack" })
    );
  });

export const unsubscribe = (target: SubscribeTarget): Promise<Ack> =>
  new Promise((resolve) => {
    getSocket().emit("unsubscribe", target, (ack: Ack) =>
      resolve(ack ?? { success: true })
    );
  });

export const disconnectSocket = (): void => {
  tokenUnsub?.();
  tokenUnsub = null;
  socket?.disconnect();
  socket = null;
};
