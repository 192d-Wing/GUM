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

interface FleetWsContextValue {
  connected: boolean;
}

const FleetWsContext = createContext<FleetWsContextValue>({ connected: false });

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

const RECONNECT_DELAY = 5_000;

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/api/v1/fleet/ws`;

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
      setConnected(false);
    };
  }, [isAuthenticated, queryClient]);

  return (
    <FleetWsContext.Provider value={{ connected }}>
      {children}
    </FleetWsContext.Provider>
  );
}

export function useFleetWsStatus(): FleetWsContextValue {
  return useContext(FleetWsContext);
}
