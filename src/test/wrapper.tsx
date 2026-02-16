import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../providers/AuthProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import type { ReactNode } from "react";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function TestProviders({ children }: { children: ReactNode }) {
  const qc = createTestQueryClient();
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
