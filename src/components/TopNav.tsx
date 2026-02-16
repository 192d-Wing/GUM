import TopNavigation from "@cloudscape-design/components/top-navigation";
import type { TopNavigationProps } from "@cloudscape-design/components/top-navigation";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useWsStatus } from "../providers/WebSocketProvider";

export default function TopNav() {
  const { isAuthenticated, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const { connected } = useWsStatus();

  const utilities: TopNavigationProps.Utility[] = [];

  if (isAuthenticated) {
    utilities.push(
      {
        type: "button",
        text: connected ? "Live" : "Disconnected",
        iconName: connected ? "status-positive" : "status-warning",
        disableUtilityCollapse: true,
      },
      {
        type: "button",
        text: mode === "dark" ? "Light mode" : "Dark mode",
        onClick: toggleMode,
      },
      {
        type: "button",
        text: "Sign out",
        onClick: logout,
      },
    );
  }

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{
          href: "/",
          title: "Crow DNS",
        }}
        utilities={utilities}
        i18nStrings={{
          overflowMenuTriggerText: "More",
          overflowMenuTitleText: "All",
        }}
      />
    </div>
  );
}
