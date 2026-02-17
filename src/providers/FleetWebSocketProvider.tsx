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
import type {
  FleetHealth,
  DeploymentHealthSummary,
  HealthStatus,
} from "../api/types";
import { getReconnectDelay } from "../utils/backoff";

import type { ConnectionStatus } from "./WebSocketProvider";

interface FleetWsContextValue {
  connected: boolean;
  connectionStatus: ConnectionStatus;
}

const FleetWsContext = createContext<FleetWsContextValue>({
  connected: false,
  connectionStatus: "disconnected",
});

/**
 * Envelope format from the fleet WebSocket endpoint.
 * Each message includes the deployment_id/name plus the original frame type and data.
 */
interface FleetWsFrame {
  deployment_id: string;
  deployment_name: string;
  type: string;
  data: unknown;
}

/**
 * Fleet-level WebSocket provider that connects to `/api/v1/fleet/ws`.
 *
 * Receives aggregated messages from all downstream deployments and dispatches
 * them into the React Query cache, scoped by deployment ID. Also updates the
 * fleet health overview in real-time.
 */
export function FleetWebSocketProvider({ children }: { children: ReactNode }) {
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

    function connect() {
      if (unmounted) return;

      setConnectionStatus("connecting");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/api/v1/fleet/ws`;

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
          const frame = JSON.parse(event.data) as FleetWsFrame;
          const { deployment_id, type, data } = frame;

          // Update deployment-scoped cache entries
          if (type === "stats") {
            queryClient.setQueryData(
              ["deployments", deployment_id, "stats"],
              data,
            );
          } else if (type === "health") {
            queryClient.setQueryData(
              ["deployments", deployment_id, "health", "targets"],
              data,
            );
          }

          // Also update fleet health status if we get a "stats" frame
          // (deployment is responding = healthy)
          if (type === "stats" || type === "health") {
            queryClient.setQueryData<FleetHealth>(
              ["fleet", "health"],
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  deployments: old.deployments.map(
                    (d: DeploymentHealthSummary) =>
                      d.id === deployment_id
                        ? {
                            ...d,
                            health_status: "healthy" as HealthStatus,
                            last_seen: new Date().toISOString(),
                          }
                        : d,
                  ),
                };
              },
            );
          }
        } catch {
          // Ignore malformed frames
        }
      };
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
    <FleetWsContext.Provider
      value={{
        connected: connectionStatus === "connected",
        connectionStatus,
      }}
    >
      {children}
    </FleetWsContext.Provider>
  );
}

export function useFleetWsStatus(): FleetWsContextValue {
  return useContext(FleetWsContext);
}
