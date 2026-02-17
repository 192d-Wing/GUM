import { render, screen, act } from "@testing-library/react";
import {
  DeploymentProvider,
  useDeploymentContext,
} from "../DeploymentProvider";
import type { Deployment } from "../../api/types";

const TEST_DEPLOYMENT: Deployment = {
  id: "dep-123",
  name: "test-deploy",
  service_type: "crow_dns",
  endpoint_url: "http://localhost:9999",
  health_status: "healthy",
  last_seen: null,
  created_at: "2024-01-01T00:00:00Z",
  tags: {},
};

function Consumer() {
  const { deployment, setDeployment, apiPrefix } = useDeploymentContext();
  return (
    <div>
      <span data-testid="prefix">{apiPrefix ?? "none"}</span>
      <span data-testid="name">{deployment?.name ?? "none"}</span>
      <button onClick={() => setDeployment(TEST_DEPLOYMENT)}>set</button>
      <button onClick={() => setDeployment(null)}>clear</button>
    </div>
  );
}

describe("DeploymentProvider", () => {
  it("apiPrefix is null when no deployment", () => {
    render(
      <DeploymentProvider>
        <Consumer />
      </DeploymentProvider>,
    );
    expect(screen.getByTestId("prefix")).toHaveTextContent("none");
  });

  it("apiPrefix is correct when deployment set", () => {
    render(
      <DeploymentProvider initialDeployment={TEST_DEPLOYMENT}>
        <Consumer />
      </DeploymentProvider>,
    );
    expect(screen.getByTestId("prefix")).toHaveTextContent(
      "/api/v1/deployments/dep-123/proxy",
    );
  });

  it("setDeployment updates apiPrefix", () => {
    render(
      <DeploymentProvider>
        <Consumer />
      </DeploymentProvider>,
    );
    expect(screen.getByTestId("prefix")).toHaveTextContent("none");

    act(() => {
      screen.getByText("set").click();
    });

    expect(screen.getByTestId("prefix")).toHaveTextContent(
      "/api/v1/deployments/dep-123/proxy",
    );
  });

  it("setDeployment(null) clears deployment", () => {
    render(
      <DeploymentProvider initialDeployment={TEST_DEPLOYMENT}>
        <Consumer />
      </DeploymentProvider>,
    );
    expect(screen.getByTestId("prefix")).toHaveTextContent(
      "/api/v1/deployments/dep-123/proxy",
    );

    act(() => {
      screen.getByText("clear").click();
    });

    expect(screen.getByTestId("prefix")).toHaveTextContent("none");
  });

  it("useDeploymentContext throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      "useDeploymentContext must be used within a DeploymentProvider",
    );
    spy.mockRestore();
  });
});
