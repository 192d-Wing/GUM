import TopNavigation from "@cloudscape-design/components/top-navigation";
import type { TopNavigationProps } from "@cloudscape-design/components/top-navigation";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";

export default function TopNav() {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();

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
      items: [
        { id: "signout", text: "Sign out" },
      ],
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
    </div>
  );
}
