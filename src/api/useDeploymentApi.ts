import { useDeploymentContext } from "../providers/DeploymentProvider";

/**
 * Returns the API prefix for proxied deployment requests.
 * Example: "/api/v1/deployments/abc-123/proxy"
 *
 * Throws if no deployment is active (i.e., used outside a deployment context).
 */
export function useDeploymentApiPrefix(): string {
  const { apiPrefix } = useDeploymentContext();
  if (!apiPrefix) throw new Error("No active deployment for API prefix");
  return apiPrefix;
}

/**
 * Returns the active deployment ID, or throws if none is set.
 */
export function useDeploymentId(): string {
  const { deployment } = useDeploymentContext();
  if (!deployment) throw new Error("No active deployment");
  return deployment.id;
}
