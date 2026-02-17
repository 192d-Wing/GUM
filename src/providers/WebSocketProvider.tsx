import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";
import apiClient from "../api/client";
import type { ServerStats, HealthTargetsResponse } from "../api/types";
import { getReconnectDelay } from "../utils/backoff";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface WsContextValue {
  connected: boolean;
  connectionStatus: ConnectionStatus;
}

const WsContext = createContext<WsContextValue>({
  connected: false,
  connectionStatus: "disconnected",
});

interface WsFrame {
  type: string;
  data: unknown;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let unmounted = false;

    async function connect() {
      if (unmounted) return;

      setConnectionStatus("connecting");

      try {
        // Fetch a one-time ticket from the authenticated endpoint.
        const { data } = await apiClient.post<{ ticket: string }>(
          "/api/v1/ws/ticket",
        );

        if (unmounted) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${protocol}//${window.location.host}/ws?ticket=${encodeURIComponent(data.ticket)}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!unmounted) {
            attemptRef.current = 0;
            setConnectionStatus("connected");
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            setConnectionStatus("disconnected");
            const delay = getReconnectDelay(attemptRef.current++);
            reconnectTimer = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onmessage = (event) => {
          try {
            const frame = JSON.parse(event.data) as WsFrame;
            if (frame.type === "stats") {
              queryClient.setQueryData<ServerStats>(
                ["stats"],
                frame.data as ServerStats,
              );
            } else if (frame.type === "health") {
              queryClient.setQueryData<HealthTargetsResponse>(
                ["health", "targets"],
                frame.data as HealthTargetsResponse,
              );
            }
          } catch {
            // Ignore malformed frames.
          }
        };
      } catch {
        // Ticket fetch failed (e.g., 401) — retry after delay.
        if (!unmounted) {
          setConnectionStatus("disconnected");
          const delay = getReconnectDelay(attemptRef.current++);
          reconnectTimer = setTimeout(connect, delay);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionStatus("disconnected");
    };
  }, [isAuthenticated, queryClient]);

  return (
    <WsContext.Provider
      value={{ connected: connectionStatus === "connected", connectionStatus }}
    >
      {children}
    </WsContext.Provider>
  );
}

export function useWsStatus(): WsContextValue {
  return useContext(WsContext);
}
