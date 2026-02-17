// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import {
  useTopQueries,
  useTopClients,
  useTopNxdomains,
} from "../api/hooks/useAnalytics";
import type { TopEntry } from "../api/types";

const TOP_COLUMNS = [
  {
    id: "key",
    header: "Name",
    cell: (item: TopEntry) => item.key,
    isRowHeader: true,
  },
  {
    id: "count",
    header: "Count",
    cell: (item: TopEntry) => item.count.toLocaleString(),
  },
];

function TopTable({
  title,
  description,
  data,
  isLoading,
}: {
  title: string;
  description: string;
  data: TopEntry[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Table
      loading={isLoading}
      loadingText={`Loading ${title.toLowerCase()}...`}
      items={data ?? []}
      columnDefinitions={TOP_COLUMNS}
      header={
        <Header variant="h2" description={description}>
          {title}
        </Header>
      }
      variant="container"
      empty="No data available"
    />
  );
}

export default function AnalyticsPage() {
  const queries = useTopQueries(20);
  const clients = useTopClients(20);
  const nxdomains = useTopNxdomains(20);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Query analytics and traffic insights">
        Analytics
      </Header>
      <TopTable
        title="Top queries"
        description="Most frequently queried domain names"
        data={queries.data}
        isLoading={queries.isLoading}
      />
      <TopTable
        title="Top clients"
        description="Clients generating the most queries"
        data={clients.data}
        isLoading={clients.isLoading}
      />
      <TopTable
        title="Top NXDOMAIN"
        description="Most frequent queries returning NXDOMAIN"
        data={nxdomains.data}
        isLoading={nxdomains.isLoading}
      />
    </SpaceBetween>
  );
}
