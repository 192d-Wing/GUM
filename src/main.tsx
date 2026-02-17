// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import "@cloudscape-design/global-styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { FleetWebSocketProvider } from "./providers/FleetWebSocketProvider";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <QueryProvider>
          <FleetWebSocketProvider>
            <App />
          </FleetWebSocketProvider>
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
