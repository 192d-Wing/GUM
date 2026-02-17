vi.mock("../../hooks/useAuthorization", () => ({
  useIsAdmin: vi.fn(),
  useHasRole: vi.fn(),
}));

vi.mock("../../api/hooks/useAuditLogs", () => ({
  useAuditLogs: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import AuditLogsPage from "../AuditLogsPage";
import { useIsAdmin } from "../../hooks/useAuthorization";
import { useAuditLogs } from "../../api/hooks/useAuditLogs";

const mockUseIsAdmin = vi.mocked(useIsAdmin);
const mockUseAuditLogs = vi.mocked(useAuditLogs);

function mockAuditLogsReturn(
  overrides: Partial<ReturnType<typeof useAuditLogs>> = {},
) {
  const defaults = {
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
    status: "success" as const,
    fetchStatus: "idle" as const,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isLoadingError: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
    promise: Promise.resolve({ items: [], total: 0 }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseAuditLogs.mockReturnValue({ ...defaults, ...overrides } as any);
}

describe("AuditLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows forbidden page for non-admin users", () => {
    mockUseIsAdmin.mockReturnValue(false);
    mockAuditLogsReturn();

    render(<AuditLogsPage />);

    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission/)).toBeInTheDocument();
    expect(screen.queryByText("Audit logs")).not.toBeInTheDocument();
  });

  it("shows loading state for admin", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockAuditLogsReturn({ isLoading: true });

    render(<AuditLogsPage />);

    expect(screen.getByText("Audit logs")).toBeInTheDocument();
    expect(screen.getByText("Loading audit logs...")).toBeInTheDocument();
  });

  it("shows empty state when no logs exist", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockAuditLogsReturn();

    render(<AuditLogsPage />);

    expect(screen.getByText("Audit logs")).toBeInTheDocument();
    expect(screen.getByText("No audit log entries")).toBeInTheDocument();
  });

  it("displays total count in header", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockAuditLogsReturn({
      data: {
        items: [
          {
            id: "1",
            timestamp: "2025-01-01T00:00:00Z",
            actor_sub: "u1",
            actor_name: "Alice",
            action: "create",
            resource_type: "deployment",
            resource_id: "d1",
            resource_name: "prod-dns",
            details: {},
          },
        ],
        total: 42,
      },
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("(42)")).toBeInTheDocument();
  });

  it("renders audit log rows", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockAuditLogsReturn({
      data: {
        items: [
          {
            id: "1",
            timestamp: "2025-06-15T10:30:00Z",
            actor_sub: "u1",
            actor_name: "Alice",
            action: "create",
            resource_type: "deployment",
            resource_id: "d1",
            resource_name: "prod-dns",
            details: {},
          },
        ],
        total: 1,
      },
    });

    render(<AuditLogsPage />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("create")).toBeInTheDocument();
    expect(screen.getByText("prod-dns")).toBeInTheDocument();
  });

  it("passes pagination params to hook", () => {
    mockUseIsAdmin.mockReturnValue(true);
    mockAuditLogsReturn();

    render(<AuditLogsPage />);

    expect(mockUseAuditLogs).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
    });
  });
});
