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

interface WsContextValue {
  connected: boolean;
}

const WsContext = createContext<WsContextValue>({ connected: false });

interface WsFrame {
  type: string;
  data: unknown;
}

const RECONNECT_DELAY = 5_000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let unmounted = false;

    async function connect() {
      if (unmounted) return;

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
          if (!unmounted) setConnected(true);
        };

        ws.onclose = () => {
          if (!unmounted) {
            setConnected(false);
            reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
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
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, queryClient]);

  return (
    <WsContext.Provider value={{ connected }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWsStatus(): WsContextValue {
  return useContext(WsContext);
}
