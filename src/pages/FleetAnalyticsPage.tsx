import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import {
  useFleetTopQueries,
  useFleetTopClients,
} from "../api/hooks/useFleetAnalytics";
import { useFleetHealth } from "../api/hooks/useFleetHealth";
import type { FleetTopEntry } from "../api/types";

const FLEET_TOP_COLUMNS = [
  {
    id: "key",
    header: "Name",
    cell: (item: FleetTopEntry) => item.key,
    isRowHeader: true,
  },
  {
    id: "count",
    header: "Count",
    cell: (item: FleetTopEntry) => item.count.toLocaleString(),
  },
  {
    id: "deployments",
    header: "Deployments",
    cell: (item: FleetTopEntry) => (
      <SpaceBetween direction="horizontal" size="xs">
        {item.deployments.map((d) => (
          <Badge key={d}>{d}</Badge>
        ))}
      </SpaceBetween>
    ),
  },
];

function FleetTopTable({
  title,
  description,
  data,
  isLoading,
}: {
  title: string;
  description: string;
  data: FleetTopEntry[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Table
      loading={isLoading}
      loadingText={`Loading ${title.toLowerCase()}...`}
      items={data ?? []}
      columnDefinitions={FLEET_TOP_COLUMNS}
      header={
        <Header variant="h2" description={description}>
          {title}
        </Header>
      }
      variant="container"
      empty="No data available — ensure at least one deployment is healthy."
    />
  );
}

export default function FleetAnalyticsPage() {
  const topQueries = useFleetTopQueries(20);
  const topClients = useFleetTopClients(20);
  const { data: fleet } = useFleetHealth();

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Aggregated analytics across all managed deployments"
      >
        Fleet analytics
      </Header>

      <ColumnLayout columns={3} variant="text-grid">
        <Container header={<Header variant="h2">Deployments reporting</Header>}>
          <Box variant="awsui-value-large">
            {(fleet?.healthy ?? 0) + (fleet?.degraded ?? 0)} /{" "}
            {fleet?.total ?? 0}
          </Box>
        </Container>
        <Container header={<Header variant="h2">Service types</Header>}>
          <SpaceBetween direction="horizontal" size="xs">
            <Badge>
              DNS:{" "}
              {fleet?.deployments.filter((d) => d.service_type === "crow_dns")
                .length ?? 0}
            </Badge>
            <Badge>
              NTP:{" "}
              {fleet?.deployments.filter((d) => d.service_type === "ntp")
                .length ?? 0}
            </Badge>
          </SpaceBetween>
        </Container>
        <Container header={<Header variant="h2">Health overview</Header>}>
          <SpaceBetween direction="horizontal" size="xs">
            <Badge color="green">{fleet?.healthy ?? 0} healthy</Badge>
            <Badge color="grey">{fleet?.degraded ?? 0} degraded</Badge>
            <Badge color="red">{fleet?.unhealthy ?? 0} unhealthy</Badge>
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      <FleetTopTable
        title="Top queries (fleet-wide)"
        description="Most frequently queried domains across all DNS deployments"
        data={topQueries.data}
        isLoading={topQueries.isLoading}
      />
      <FleetTopTable
        title="Top clients (fleet-wide)"
        description="Clients generating the most traffic across all deployments"
        data={topClients.data}
        isLoading={topClients.isLoading}
      />
    </SpaceBetween>
  );
}
