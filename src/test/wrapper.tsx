import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { AuthProvider } from "../providers/AuthProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import { DeploymentProvider } from "../providers/DeploymentProvider";
import type { Deployment } from "../api/types";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface TestProviderOptions {
  queryClient?: QueryClient;
  initialEntries?: string[];
  deployment?: Deployment | null;
}

export function TestProviders({
  children,
  queryClient,
  initialEntries = ["/"],
  deployment,
}: TestProviderOptions & { children: ReactNode }) {
  const qc = queryClient ?? createTestQueryClient();
  const content = (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );

  if (deployment !== undefined) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <ThemeProvider>
            <QueryClientProvider client={qc}>
              <DeploymentProvider initialDeployment={deployment}>
                {children}
              </DeploymentProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  return content;
}

interface RenderWithProvidersOptions
  extends Omit<RenderOptions, "wrapper">, TestProviderOptions {}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const {
    queryClient: qc,
    initialEntries,
    deployment,
    ...renderOptions
  } = options;
  const queryClient = qc ?? createTestQueryClient();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <TestProviders
        queryClient={queryClient}
        initialEntries={initialEntries}
        deployment={deployment}
      >
        {children}
      </TestProviders>
    ),
    ...renderOptions,
  });

  return { ...result, queryClient };
}
