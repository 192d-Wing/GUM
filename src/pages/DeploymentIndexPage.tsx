import { Navigate } from "react-router";
import { useDeploymentContext } from "../providers/DeploymentProvider";
import { useDeploymentPath } from "../hooks/useDeploymentPath";
import DashboardPage from "./DashboardPage";

export default function DeploymentIndexPage() {
  const { deployment } = useDeploymentContext();
  const path = useDeploymentPath();

  if (deployment?.service_type === "ntp") {
    return <Navigate to={path("ntp-dashboard")} replace />;
  }

  return <DashboardPage />;
}
