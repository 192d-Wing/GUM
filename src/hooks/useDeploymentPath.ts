import { useParams } from "react-router";

/**
 * Returns a path builder that prefixes routes with the current deployment.
 *
 * Usage:
 *   const path = useDeploymentPath();
 *   path("zones")           => "/deployments/abc-123/zones"
 *   path("")                => "/deployments/abc-123"
 *   path("zones/example.com") => "/deployments/abc-123/zones/example.com"
 */
export function useDeploymentPath() {
  const { deploymentId } = useParams();
  return (subpath: string) => {
    const base = `/deployments/${deploymentId}`;
    return subpath ? `${base}/${subpath}` : base;
  };
}
