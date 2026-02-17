import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import { useNtpStats } from "../../api/hooks/useNtpStats";
import { useNtpSync } from "../../api/hooks/useNtpSync";

export default function NtpDashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useNtpStats(5000);
  const {
    data: sync,
    isLoading: syncLoading,
    isError: syncError,
  } = useNtpSync(5000);

  if (statsLoading || syncLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if ((statsError && syncError) || (!stats && !sync)) {
    return (
      <StatusIndicator type="error">
        Failed to load NTP server statistics
      </StatusIndicator>
    );
  }

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="NTP server overview and key metrics">
        Dashboard
      </Header>
      <ColumnLayout columns={3} variant="text-grid">
        <Container header={<Header variant="h2">Sync status</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Synchronized</Box>
              <Box>
                {sync ? (
                  <StatusIndicator
                    type={sync.synchronized ? "success" : "error"}
                  >
                    {sync.synchronized ? "Yes" : "No"}
                  </StatusIndicator>
                ) : (
                  "\u2014"
                )}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Stratum</Box>
              <Box variant="awsui-value-large">{sync?.stratum ?? "\u2014"}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Sync source</Box>
              <Box>{sync?.sync_source ?? "\u2014"}</Box>
            </div>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Timing</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Offset</Box>
              <Box variant="awsui-value-large">
                {sync ? `${sync.offset.toFixed(3)} ms` : "\u2014"}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Jitter</Box>
              <Box variant="awsui-value-large">
                {sync ? `${sync.jitter.toFixed(3)} ms` : "\u2014"}
              </Box>
            </div>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Traffic</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Total requests</Box>
              <Box variant="awsui-value-large">
                {stats?.total_requests.toLocaleString() ?? "\u2014"}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Requests/sec</Box>
              <Box variant="awsui-value-large">
                {stats?.requests_per_second.toLocaleString() ?? "\u2014"}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Sources</Box>
              <Box>{stats?.source_count ?? "\u2014"}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Active clients</Box>
              <Box>{stats?.active_clients.toLocaleString() ?? "\u2014"}</Box>
            </div>
          </SpaceBetween>
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}
