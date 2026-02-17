// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import Spinner from "@cloudscape-design/components/spinner";
import Box from "@cloudscape-design/components/box";
import TopNav from "./components/TopNav";
import FleetLayout from "./components/FleetLayout";
import DeploymentShell from "./components/DeploymentShell";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded (always needed).
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Fleet-level pages (lazy).
const FleetOverviewPage = lazy(() => import("./pages/FleetOverviewPage"));
const FleetAnalyticsPage = lazy(() => import("./pages/FleetAnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));

// Deployment index — dispatches to the right dashboard based on service type.
const DeploymentIndexPage = lazy(() => import("./pages/DeploymentIndexPage"));

// Deployment-scoped pages — Crow DNS (lazy).
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

// Deployment-scoped pages — NTP (lazy).
const NtpDashboardPage = lazy(() => import("./pages/ntp/NtpDashboardPage"));
const NtpSourcesPage = lazy(() => import("./pages/ntp/NtpSourcesPage"));
const NtpSourceDetailPage = lazy(
  () => import("./pages/ntp/NtpSourceDetailPage"),
);
const NtpAccessPage = lazy(() => import("./pages/ntp/NtpAccessPage"));
const NtpSyncPage = lazy(() => import("./pages/ntp/NtpSyncPage"));
const NtpAnalyticsPage = lazy(() => import("./pages/ntp/NtpAnalyticsPage"));
const NtpAlertsPage = lazy(() => import("./pages/ntp/NtpAlertsPage"));
const NtpConfigPage = lazy(() => import("./pages/ntp/NtpConfigPage"));

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

            {/* Fleet-level routes */}
            <Route
              element={
                <ProtectedRoute>
                  <FleetLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FleetOverviewPage />} />
              <Route path="fleet-analytics" element={<FleetAnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Deployment-scoped routes */}
            <Route
              path="deployments/:deploymentId"
              element={
                <ProtectedRoute>
                  <DeploymentShell />
                </ProtectedRoute>
              }
            >
              {/* Index — redirects NTP to ntp-dashboard, renders Crow DNS dashboard otherwise */}
              <Route index element={<DeploymentIndexPage />} />

              {/* Crow DNS routes */}
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

              {/* NTP routes */}
              <Route path="ntp-dashboard" element={<NtpDashboardPage />} />
              <Route path="sources" element={<NtpSourcesPage />} />
              <Route
                path="sources/:sourceId"
                element={<NtpSourceDetailPage />}
              />
              <Route path="access" element={<NtpAccessPage />} />
              <Route path="sync" element={<NtpSyncPage />} />
              <Route path="ntp-analytics" element={<NtpAnalyticsPage />} />
              <Route path="ntp-alerts" element={<NtpAlertsPage />} />
              <Route path="ntp-config" element={<NtpConfigPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
