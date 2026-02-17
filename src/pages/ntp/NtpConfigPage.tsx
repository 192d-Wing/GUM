// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import {
  useNtpConfig,
  useUpdateNtpConfig,
  useNtpConfigReload,
} from "../../api/hooks/useNtpConfig";
import type { NtpServerConfig } from "../../api/types";

export default function NtpConfigPage() {
  const { data: config, isLoading, isError } = useNtpConfig();
  const updateConfig = useUpdateNtpConfig();
  const reloadConfig = useNtpConfigReload();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [dirty, setDirty] = useState(false);

  const [listenAddresses, setListenAddresses] = useState("");
  const [stratum, setStratum] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [maxClients, setMaxClients] = useState("");
  const [rateLimit, setRateLimit] = useState("");

  useEffect(() => {
    if (config) {
      setListenAddresses(config.listen_addresses.join("\n"));
      setStratum(String(config.stratum));
      setReferenceId(config.reference_id);
      setMaxClients(String(config.max_clients));
      setRateLimit(String(config.rate_limit));
      setDirty(false);
    }
  }, [config]);

  if (isLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (isError || !config) {
    return (
      <StatusIndicator type="error">
        Failed to load NTP configuration
      </StatusIndicator>
    );
  }

  const handleSave = () => {
    const body: NtpServerConfig = {
      listen_addresses: listenAddresses
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => a.length > 0),
      stratum: parseInt(stratum, 10) || config.stratum,
      reference_id: referenceId,
      max_clients: parseInt(maxClients, 10) || config.max_clients,
      rate_limit: parseInt(rateLimit, 10) || config.rate_limit,
    };

    updateConfig.mutate(body, {
      onSuccess: () => {
        setDirty(false);
        setFlash([
          {
            type: "success",
            content: "Configuration saved",
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
      },
      onError: (e) =>
        setFlash([
          {
            type: "error",
            content: `Failed to save configuration: ${e.message}`,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]),
    });
  };

  const handleReload = () => {
    reloadConfig.mutate(undefined, {
      onSuccess: (data) =>
        setFlash([
          {
            type: data.success ? "success" : "warning",
            content: data.message,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]),
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

  const markDirty = () => setDirty(true);

  return (
    <SpaceBetween size="l">
      <Flashbar items={flash} />
      <Header
        variant="h1"
        description="NTP server configuration"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              onClick={handleReload}
              loading={reloadConfig.isPending}
              iconName="refresh"
            >
              Reload
            </Button>
            <Button
              variant="primary"
              disabled={!dirty}
              loading={updateConfig.isPending}
              onClick={handleSave}
            >
              Save changes
            </Button>
          </SpaceBetween>
        }
      >
        Configuration
      </Header>

      <Container header={<Header variant="h2">Server settings</Header>}>
        <SpaceBetween size="l">
          <FormField
            label="Listen addresses"
            description="Addresses and ports to listen on, one per line"
          >
            <Input
              value={listenAddresses}
              onChange={({ detail }) => {
                setListenAddresses(detail.value);
                markDirty();
              }}
              placeholder="0.0.0.0:123"
            />
          </FormField>
          <FormField label="Stratum" description="NTP stratum level">
            <Input
              value={stratum}
              type="number"
              onChange={({ detail }) => {
                setStratum(detail.value);
                markDirty();
              }}
            />
          </FormField>
          <FormField
            label="Reference ID"
            description="Four-character reference identifier"
          >
            <Input
              value={referenceId}
              onChange={({ detail }) => {
                setReferenceId(detail.value);
                markDirty();
              }}
              placeholder="GPS"
            />
          </FormField>
          <FormField
            label="Max clients"
            description="Maximum concurrent clients"
          >
            <Input
              value={maxClients}
              type="number"
              onChange={({ detail }) => {
                setMaxClients(detail.value);
                markDirty();
              }}
            />
          </FormField>
          <FormField
            label="Rate limit"
            description="Maximum requests per second per client"
          >
            <Input
              value={rateLimit}
              type="number"
              onChange={({ detail }) => {
                setRateLimit(detail.value);
                markDirty();
              }}
            />
          </FormField>
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
}
