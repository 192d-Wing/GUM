// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Deployment } from "../api/types";

interface DeploymentContextValue {
  /** The currently active deployment, or null when at fleet level. */
  deployment: Deployment | null;
  /** Set (or clear) the active deployment. */
  setDeployment: (d: Deployment | null) => void;
  /**
   * API prefix for proxied requests to the active deployment.
   * Example: "/api/v1/deployments/abc-123/proxy"
   * Null when no deployment is selected.
   */
  apiPrefix: string | null;
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

interface DeploymentProviderProps {
  children: ReactNode;
  /** Optionally pre-set the deployment (used by DeploymentShell). */
  initialDeployment?: Deployment | null;
}

export function DeploymentProvider({
  children,
  initialDeployment = null,
}: DeploymentProviderProps) {
  const [deployment, setDeploymentState] = useState<Deployment | null>(
    initialDeployment,
  );

  const setDeployment = useCallback((d: Deployment | null) => {
    setDeploymentState(d);
  }, []);

  const apiPrefix = useMemo(
    () => (deployment ? `/api/v1/deployments/${deployment.id}/proxy` : null),
    [deployment],
  );

  return (
    <DeploymentContext.Provider
      value={{ deployment, setDeployment, apiPrefix }}
    >
      {children}
    </DeploymentContext.Provider>
  );
}

/**
 * Access the current deployment context.
 * Must be used within a DeploymentProvider.
 */
export function useDeploymentContext(): DeploymentContextValue {
  const ctx = useContext(DeploymentContext);
  if (!ctx) {
    throw new Error(
      "useDeploymentContext must be used within a DeploymentProvider",
    );
  }
  return ctx;
}
