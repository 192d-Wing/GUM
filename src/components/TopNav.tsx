// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import TopNavigation from "@cloudscape-design/components/top-navigation";
import type { TopNavigationProps } from "@cloudscape-design/components/top-navigation";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useFleetWsStatus } from "../providers/FleetWebSocketProvider";
import ConnectionStatus from "./ConnectionStatus";

export default function TopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const { connectionStatus } = useFleetWsStatus();

  const utilities: TopNavigationProps.Utility[] = [];

  if (isAuthenticated) {
    utilities.push({
      type: "button",
      text: mode === "dark" ? "Light mode" : "Dark mode",
      onClick: toggleMode,
    });

    utilities.push({
      type: "menu-dropdown",
      text: user?.name ?? "User",
      description: user?.email ?? "",
      items: [{ id: "signout", text: "Sign out" }],
      onItemClick: ({ detail }) => {
        if (detail.id === "signout") {
          logout();
        }
      },
    });
  }

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{
          href: "/",
          title: "GUM",
        }}
        utilities={utilities}
        i18nStrings={{
          overflowMenuTriggerText: "More",
          overflowMenuTitleText: "All",
        }}
      />
      {isAuthenticated && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 16,
            zIndex: 1000,
          }}
        >
          <ConnectionStatus status={connectionStatus} />
        </div>
      )}
    </div>
  );
}
