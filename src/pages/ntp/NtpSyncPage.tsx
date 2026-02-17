import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import { useNtpSync } from "../../api/hooks/useNtpSync";

export default function NtpSyncPage() {
  const { data: sync, isLoading, isError } = useNtpSync(3000);

  if (isLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (isError || !sync) {
    return (
      <StatusIndicator type="error">
        Failed to load sync status
      </StatusIndicator>
    );
  }

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Real-time NTP synchronization status — refreshes every 3 seconds"
      >
        Sync status
      </Header>

      <Container header={<Header variant="h2">Synchronization</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Synchronized</Box>
            <Box>
              <StatusIndicator type={sync.synchronized ? "success" : "error"}>
                {sync.synchronized ? "Yes" : "No"}
              </StatusIndicator>
            </Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Stratum</Box>
            <Box variant="awsui-value-large">{sync.stratum}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Sync source</Box>
            <Box>{sync.sync_source ?? "\u2014"}</Box>
          </div>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h2">Timing accuracy</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Offset</Box>
            <Box variant="awsui-value-large">{sync.offset.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Jitter</Box>
            <Box variant="awsui-value-large">{sync.jitter.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Precision</Box>
            <Box variant="awsui-value-large">{sync.precision}</Box>
          </div>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h2">Root metrics</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Root delay</Box>
            <Box>{sync.root_delay.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Root dispersion</Box>
            <Box>{sync.root_dispersion.toFixed(3)} ms</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Leap indicator</Box>
            <Box>{sync.leap_indicator}</Box>
          </div>
        </ColumnLayout>
      </Container>
    </SpaceBetween>
  );
}
