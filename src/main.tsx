import "@cloudscape-design/global-styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { WebSocketProvider } from "./providers/WebSocketProvider";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <QueryProvider>
          <WebSocketProvider>
            <App />
          </WebSocketProvider>
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
