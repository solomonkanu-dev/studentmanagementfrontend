"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { tokenStore } from "@/lib/api/tokenStore";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const token = tokenStore.get();
    if (!token) return;

    // Strip /api/v1 to get the base server URL
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
    const serverUrl = apiUrl.replace(/\/api\/v1\/?$/, "");

    console.log("[Socket] connecting to:", serverUrl);

    const s = io(serverUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on("connect", () => console.log("[Socket] connected ✓"));
    s.on("connect_error", (err) => {
      console.warn("[Socket] connect_error:", err.message);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.off("connect");
      s.off("connect_error");
      s.disconnect();
      socketRef.current = null;
    };
    // Re-connect when user identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
