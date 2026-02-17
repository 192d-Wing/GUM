// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import CloudscapeAppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import type { SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import { useIsAdmin } from "../hooks/useAuthorization";

export default function FleetLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = useIsAdmin();

  const navItems = useMemo<SideNavigationProps.Item[]>(() => {
    const items: SideNavigationProps.Item[] = [
      { type: "link", text: "Fleet overview", href: "/" },
      { type: "link", text: "Fleet analytics", href: "/fleet-analytics" },
    ];
    if (isAdmin) {
      items.push({ type: "link", text: "Audit logs", href: "/audit-logs" });
    }
    items.push({ type: "divider" });
    items.push({ type: "link", text: "Settings", href: "/settings" });
    return items;
  }, [isAdmin]);

  return (
    <CloudscapeAppLayout
      navigation={
        <SideNavigation
          activeHref={location.pathname}
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
  );
}
