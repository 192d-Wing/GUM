import { Outlet, useNavigate, useLocation } from "react-router";
import CloudscapeAppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import type { SideNavigationProps } from "@cloudscape-design/components/side-navigation";

const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: "link", text: "Fleet overview", href: "/" },
  { type: "link", text: "Fleet analytics", href: "/fleet-analytics" },
  { type: "divider" },
  { type: "link", text: "Settings", href: "/settings" },
];

export default function FleetLayout() {
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
