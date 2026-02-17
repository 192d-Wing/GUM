import { Outlet, useParams, useNavigate, useLocation } from "react-router";
import CloudscapeAppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import type { SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import Spinner from "@cloudscape-design/components/spinner";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useDeployment } from "../api/hooks/useDeployments";
import { DeploymentProvider } from "../providers/DeploymentProvider";

function crowDnsNavItems(base: string): SideNavigationProps.Item[] {
  return [
    { type: "link", text: "Dashboard", href: base },
    { type: "divider" },
    {
      type: "section",
      text: "DNS",
      items: [
        { type: "link", text: "Zones", href: `${base}/zones` },
        { type: "link", text: "Catalogs", href: `${base}/catalogs` },
      ],
    },
    {
      type: "section",
      text: "Security",
      items: [
        { type: "link", text: "Firewall", href: `${base}/firewall` },
        { type: "link", text: "NTAs", href: `${base}/ntas` },
      ],
    },
    {
      type: "section",
      text: "Monitoring",
      items: [
        { type: "link", text: "Analytics", href: `${base}/analytics` },
        { type: "link", text: "Alerts", href: `${base}/alerts` },
        { type: "link", text: "Health checks", href: `${base}/health` },
      ],
    },
    { type: "divider" },
    { type: "link", text: "Users", href: `${base}/users` },
    { type: "link", text: "Configuration", href: `${base}/config` },
  ];
}

function ntpNavItems(base: string): SideNavigationProps.Item[] {
  return [
    { type: "link", text: "Dashboard", href: `${base}/ntp-dashboard` },
    { type: "divider" },
    {
      type: "section",
      text: "Time",
      items: [
        { type: "link", text: "Sources", href: `${base}/sources` },
        { type: "link", text: "Sync status", href: `${base}/sync` },
      ],
    },
    {
      type: "section",
      text: "Security",
      items: [{ type: "link", text: "Access control", href: `${base}/access` }],
    },
    {
      type: "section",
      text: "Monitoring",
      items: [
        { type: "link", text: "Analytics", href: `${base}/ntp-analytics` },
        { type: "link", text: "Alerts", href: `${base}/ntp-alerts` },
      ],
    },
    { type: "divider" },
    { type: "link", text: "Configuration", href: `${base}/ntp-config` },
  ];
}

export default function DeploymentShell() {
  const { deploymentId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: deployment, isLoading, isError } = useDeployment(deploymentId);

  if (isLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (isError || !deployment) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <StatusIndicator type="error">Deployment not found</StatusIndicator>
      </Box>
    );
  }

  const base = `/deployments/${deploymentId}`;
  const navItems =
    deployment.service_type === "crow_dns"
      ? crowDnsNavItems(base)
      : ntpNavItems(base);

  return (
    <DeploymentProvider initialDeployment={deployment}>
      <CloudscapeAppLayout
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            header={{
              href: "/",
              text: "Fleet overview",
            }}
            items={navItems}
            onFollow={(event) => {
              event.preventDefault();
              navigate(event.detail.href);
            }}
          />
        }
        content={<Outlet />}
        toolsHide
        ariaLabels={{
          navigation: "Side navigation",
          navigationClose: "Close navigation",
          navigationToggle: "Open navigation",
        }}
      />
    </DeploymentProvider>
  );
}
