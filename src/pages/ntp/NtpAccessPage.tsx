// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import {
  useNtpAllowList,
  useNtpDenyList,
  useUpdateNtpAllowList,
  useUpdateNtpDenyList,
} from "../../api/hooks/useNtpAccess";

function IpRangeEditor({
  title,
  description,
  ranges,
  isLoading,
  isError,
  onSave,
  isSaving,
}: {
  title: string;
  description: string;
  ranges: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onSave: (ranges: string[]) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (ranges) {
      setValue(ranges.join("\n"));
      setDirty(false);
    }
  }, [ranges]);

  if (isLoading) {
    return (
      <Container header={<Header variant="h2">{title}</Header>}>
        <Box textAlign="center" padding="l">
          <Spinner />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container header={<Header variant="h2">{title}</Header>}>
        <StatusIndicator type="error">
          Failed to load {title.toLowerCase()}
        </StatusIndicator>
      </Container>
    );
  }

  const handleSave = () => {
    const parsed = value
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    onSave(parsed);
    setDirty(false);
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={description}
          counter={`(${(ranges ?? []).length})`}
          actions={
            <Button
              variant="primary"
              disabled={!dirty || isSaving}
              loading={isSaving}
              onClick={handleSave}
            >
              Save
            </Button>
          }
        >
          {title}
        </Header>
      }
    >
      <Textarea
        value={value}
        onChange={({ detail }) => {
          setValue(detail.value);
          setDirty(true);
        }}
        rows={12}
        ariaLabel={`${title} IP ranges, one per line`}
        placeholder="one CIDR range per line, e.g.&#10;10.0.0.0/8&#10;192.168.1.0/24"
      />
    </Container>
  );
}

export default function NtpAccessPage() {
  const allowList = useNtpAllowList();
  const denyList = useNtpDenyList();
  const updateAllow = useUpdateNtpAllowList();
  const updateDeny = useUpdateNtpDenyList();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const handleAllowSave = (ranges: string[]) => {
    updateAllow.mutate(
      { ranges },
      {
        onSuccess: () =>
          setFlash([
            {
              type: "success",
              content: "Allow list updated",
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
        onError: (e) =>
          setFlash([
            {
              type: "error",
              content: `Failed to update allow list: ${e.message}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
      },
    );
  };

  const handleDenySave = (ranges: string[]) => {
    updateDeny.mutate(
      { ranges },
      {
        onSuccess: () =>
          setFlash([
            {
              type: "success",
              content: "Deny list updated",
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
        onError: (e) =>
          setFlash([
            {
              type: "error",
              content: `Failed to update deny list: ${e.message}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
      },
    );
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Control which clients can access this NTP server"
      >
        Access control
      </Header>
      <Flashbar items={flash} />
      <IpRangeEditor
        title="Allow list"
        description="IP ranges allowed to query this NTP server"
        ranges={allowList.data?.ranges}
        isLoading={allowList.isLoading}
        isError={allowList.isError}
        onSave={handleAllowSave}
        isSaving={updateAllow.isPending}
      />
      <IpRangeEditor
        title="Deny list"
        description="IP ranges blocked from querying this NTP server"
        ranges={denyList.data?.ranges}
        isLoading={denyList.isLoading}
        isError={denyList.isError}
        onSave={handleDenySave}
        isSaving={updateDeny.isPending}
      />
    </SpaceBetween>
  );
}
