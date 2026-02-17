import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useNtpTopClients } from "../../api/hooks/useNtpStats";
import type { TopEntry } from "../../api/types";

const TOP_COLUMNS = [
  {
    id: "key",
    header: "Client",
    cell: (item: TopEntry) => item.key,
    isRowHeader: true,
  },
  {
    id: "count",
    header: "Requests",
    cell: (item: TopEntry) => item.count.toLocaleString(),
  },
];

export default function NtpAnalyticsPage() {
  const clients = useNtpTopClients(20);

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="NTP client analytics and traffic insights"
      >
        Analytics
      </Header>
      <Table
        loading={clients.isLoading}
        loadingText="Loading top clients..."
        items={clients.data ?? []}
        columnDefinitions={TOP_COLUMNS}
        header={
          <Header variant="h2" description="Clients generating the most NTP requests">
            Top clients
          </Header>
        }
        variant="container"
        empty="No data available"
      />
    </SpaceBetween>
  );
}
