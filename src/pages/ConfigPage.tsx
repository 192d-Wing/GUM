// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { useConfigReload } from "../api/hooks/useConfig";
import type { ReloadResponse } from "../api/types";

export default function ConfigPage() {
  const reload = useConfigReload();
  const [lastReload, setLastReload] = useState<ReloadResponse | null>(null);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const handleReload = () => {
    reload.mutate(undefined, {
      onSuccess: (data) => {
        setLastReload(data);
        setFlash([
          {
            type: data.success ? "success" : "warning",
            content: data.message,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      },
      onError: (e) =>
        setFlash([
          {
            type: "error",
            content: `Reload failed: ${e.message}`,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]),
    });
  };

  return (
    <SpaceBetween size="l">
      <Flashbar items={flash} />
      <Header
        variant="h1"
        description="Reload zones, TLS certificates, and firewall policies from disk"
        actions={
          <Button
            variant="primary"
            onClick={handleReload}
            loading={reload.isPending}
            iconName="refresh"
          >
            Reload configuration
          </Button>
        }
      >
        Configuration
      </Header>

      {lastReload && (
        <>
          <Container
            header={
              <Header variant="h2">
                <StatusIndicator
                  type={lastReload.success ? "success" : "warning"}
                >
                  {lastReload.message}
                </StatusIndicator>
              </Header>
            }
          >
            <SpaceBetween size="m">
              {lastReload.reloaded_zones.length > 0 && (
                <div>
                  <Box variant="awsui-key-label">Reloaded zones</Box>
                  <Box>{lastReload.reloaded_zones.join(", ")}</Box>
                </div>
              )}
            </SpaceBetween>
          </Container>

          {lastReload.failed_zones.length > 0 && (
            <Table
              items={lastReload.failed_zones.map(([zone, error]) => ({
                zone,
                error,
              }))}
              columnDefinitions={[
                {
                  id: "zone",
                  header: "Zone",
                  cell: (item) => item.zone,
                  isRowHeader: true,
                },
                {
                  id: "error",
                  header: "Error",
                  cell: (item) => item.error,
                },
              ]}
              header={
                <Header
                  variant="h2"
                  counter={`(${lastReload.failed_zones.length})`}
                >
                  Failed zones
                </Header>
              }
              variant="container"
            />
          )}

          {(lastReload.tls_errors ?? []).length > 0 && (
            <Table
              items={(lastReload.tls_errors ?? []).map(([cert, error]) => ({
                cert,
                error,
              }))}
              columnDefinitions={[
                {
                  id: "cert",
                  header: "Certificate",
                  cell: (item) => item.cert,
                  isRowHeader: true,
                },
                {
                  id: "error",
                  header: "Error",
                  cell: (item) => item.error,
                },
              ]}
              header={
                <Header
                  variant="h2"
                  counter={`(${(lastReload.tls_errors ?? []).length})`}
                >
                  TLS errors
                </Header>
              }
              variant="container"
            />
          )}
        </>
      )}

      {!lastReload && (
        <Box color="text-status-inactive" textAlign="center" padding="xxl">
          Click "Reload configuration" to refresh zones, certificates, and
          policies from disk.
        </Box>
      )}
    </SpaceBetween>
  );
}
