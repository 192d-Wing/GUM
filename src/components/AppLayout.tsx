import { Outlet, useNavigate, useLocation } from "react-router";
import CloudscapeAppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import type { SideNavigationProps } from "@cloudscape-design/components/side-navigation";

const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: "link", text: "Dashboard", href: "/" },
  { type: "divider" },
  {
    type: "section",
    text: "DNS",
    items: [
      { type: "link", text: "Zones", href: "/zones" },
      { type: "link", text: "Catalogs", href: "/catalogs" },
    ],
  },
  {
    type: "section",
    text: "Security",
    items: [
      { type: "link", text: "Firewall", href: "/firewall" },
      { type: "link", text: "NTAs", href: "/ntas" },
    ],
  },
  {
    type: "section",
    text: "Monitoring",
    items: [
      { type: "link", text: "Analytics", href: "/analytics" },
      { type: "link", text: "Alerts", href: "/alerts" },
      { type: "link", text: "Health checks", href: "/health" },
    ],
  },
  { type: "divider" },
  { type: "link", text: "Users", href: "/users" },
  { type: "link", text: "Configuration", href: "/config" },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <CloudscapeAppLayout
      navigation={
        <SideNavigation
          activeHref={location.pathname}
          items={NAV_ITEMS}
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
  );
}
