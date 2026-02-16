import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import { useStats } from "../api/hooks/useStats";
import { useWsStatus } from "../providers/WebSocketProvider";

export default function DashboardPage() {
  const { connected } = useWsStatus();
  const { data: stats, isLoading, isError } = useStats(connected ? false : 5000);

  if (isLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (isError || !stats) {
    return (
      <StatusIndicator type="error">
        Failed to load server statistics
      </StatusIndicator>
    );
  }

  const hitRate =
    stats.cache_hits + stats.cache_misses > 0
      ? (
          (stats.cache_hits / (stats.cache_hits + stats.cache_misses)) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Server overview and key metrics">
        Dashboard
      </Header>
      <ColumnLayout columns={3} variant="text-grid">
        <Container header={<Header variant="h2">Zones</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Total zones</Box>
              <Box variant="awsui-value-large">{stats.zone_count}</Box>
            </div>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Cache</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Entries</Box>
              <Box variant="awsui-value-large">
                {stats.cache_size.toLocaleString()}
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Hit rate</Box>
              <Box variant="awsui-value-large">{hitRate}%</Box>
            </div>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Cache activity</Header>}>
          <SpaceBetween size="l">
            <div>
              <Box variant="awsui-key-label">Hits</Box>
              <Box>{stats.cache_hits.toLocaleString()}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Misses</Box>
              <Box>{stats.cache_misses.toLocaleString()}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Evictions</Box>
              <Box>{stats.cache_evictions.toLocaleString()}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Expirations</Box>
              <Box>{stats.cache_expirations.toLocaleString()}</Box>
            </div>
          </SpaceBetween>
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}
