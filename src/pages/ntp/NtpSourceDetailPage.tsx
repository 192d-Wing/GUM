// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useParams, useNavigate } from "react-router";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useNtpSource } from "../../api/hooks/useNtpSources";
import { useDeploymentPath } from "../../hooks/useDeploymentPath";

function stateIndicator(state: string) {
  switch (state) {
    case "synced":
      return <StatusIndicator type="success">Synced</StatusIndicator>;
    case "reachable":
      return <StatusIndicator type="info">Reachable</StatusIndicator>;
    case "unreachable":
      return <StatusIndicator type="error">Unreachable</StatusIndicator>;
    default:
      return <StatusIndicator type="stopped">Unknown</StatusIndicator>;
  }
}

export default function NtpSourceDetailPage() {
  const { sourceId = "" } = useParams();
  const navigate = useNavigate();
  const path = useDeploymentPath();
  const { data: source, isLoading } = useNtpSource(sourceId);

  if (isLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (!source) {
    return (
      <StatusIndicator type="error">
        Source &quot;{sourceId}&quot; not found
      </StatusIndicator>
    );
  }

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Sources", href: path("sources") },
          {
            text: source.address,
            href: path(`sources/${encodeURIComponent(source.id)}`),
          },
        ]}
        onFollow={(event) => {
          event.preventDefault();
          navigate(event.detail.href);
        }}
      />

      <Header variant="h1">{source.address}</Header>

      <Container header={<Header variant="h2">Source details</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">State</Box>
            {stateIndicator(source.state)}
          </div>
          <div>
            <Box variant="awsui-key-label">Stratum</Box>
            <Box>{source.stratum}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Reach</Box>
            <Box>{source.reach}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Poll interval</Box>
            <Box>{source.poll_interval}s</Box>
          </div>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h2">Timing metrics</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Delay</Box>
            <Box variant="awsui-value-large">{source.delay.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Offset</Box>
            <Box variant="awsui-value-large">{source.offset.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Jitter</Box>
            <Box variant="awsui-value-large">{source.jitter.toFixed(3)} ms</Box>
          </div>
        </ColumnLayout>
      </Container>

      {source.last_poll && (
        <Container header={<Header variant="h2">Last poll</Header>}>
          <Box>{new Date(source.last_poll).toLocaleString()}</Box>
        </Container>
      )}
    </SpaceBetween>
  );
}
