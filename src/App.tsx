import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import Spinner from "@cloudscape-design/components/spinner";
import Box from "@cloudscape-design/components/box";
import TopNav from "./components/TopNav";
import AppShell from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded (always needed).
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Lazy-loaded page chunks.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ZonesPage = lazy(() => import("./pages/ZonesPage"));
const ZoneDetailPage = lazy(() => import("./pages/ZoneDetailPage"));
const FirewallPage = lazy(() => import("./pages/FirewallPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const HealthPage = lazy(() => import("./pages/HealthPage"));
const CatalogsPage = lazy(() => import("./pages/CatalogsPage"));
const NtasPage = lazy(() => import("./pages/NtasPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const ConfigPage = lazy(() => import("./pages/ConfigPage"));

function PageLoader() {
  return (
    <Box textAlign="center" padding={{ top: "xxxl" }}>
      <Spinner size="large" />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TopNav />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="zones" element={<ZonesPage />} />
              <Route path="zones/:name" element={<ZoneDetailPage />} />
              <Route path="firewall" element={<FirewallPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="catalogs" element={<CatalogsPage />} />
              <Route path="ntas" element={<NtasPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="config" element={<ConfigPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
