import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import TextFilter from "@cloudscape-design/components/text-filter";
import Pagination from "@cloudscape-design/components/pagination";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useAuditLogs } from "../api/hooks/useAuditLogs";
import { useIsAdmin } from "../hooks/useAuthorization";
import ForbiddenPage from "./ForbiddenPage";
import type { AuditLog } from "../api/types";

const PAGE_SIZE = 50;

const COLUMN_DEFINITIONS = [
  {
    id: "timestamp",
    header: "Timestamp",
    cell: (item: AuditLog) =>
      new Date(item.timestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    sortingField: "timestamp",
    isRowHeader: true,
  },
  {
    id: "actor_name",
    header: "Actor",
    cell: (item: AuditLog) => item.actor_name,
    sortingField: "actor_name",
  },
  {
    id: "action",
    header: "Action",
    cell: (item: AuditLog) => item.action,
    sortingField: "action",
  },
  {
    id: "resource_type",
    header: "Resource type",
    cell: (item: AuditLog) => item.resource_type,
    sortingField: "resource_type",
  },
  {
    id: "resource_name",
    header: "Resource",
    cell: (item: AuditLog) => item.resource_name,
    sortingField: "resource_name",
  },
];

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children}</div>
    </div>
  );
}

export default function AuditLogsPage() {
  const isAdmin = useIsAdmin();
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading } = useAuditLogs({
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });
  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const [selectedItems, setSelectedItems] = useState<AuditLog[]>([]);

  const { items, filterProps, collectionProps } = useCollection(logs, {
    filtering: {
      filteringFunction: (item, filterText) => {
        const text = filterText.toLowerCase();
        return (
          item.actor_name.toLowerCase().includes(text) ||
          item.action.toLowerCase().includes(text) ||
          item.resource_type.toLowerCase().includes(text) ||
          item.resource_name.toLowerCase().includes(text)
        );
      },
    },
    sorting: {
      defaultState: {
        sortingColumn: COLUMN_DEFINITIONS[0],
        isDescending: true,
      },
    },
  });

  if (!isAdmin) return <ForbiddenPage />;

  const selected = selectedItems[0];
  const pageCount = Math.ceil(total / PAGE_SIZE);

  return (
    <SpaceBetween size="l">
      <Table
        {...collectionProps}
        loading={isLoading}
        loadingText="Loading audit logs..."
        items={items}
        columnDefinitions={COLUMN_DEFINITIONS}
        selectionType="single"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems as AuditLog[])
        }
        header={
          <Header
            variant="h1"
            counter={`(${total})`}
            description="Activity log for deployment operations"
          >
            Audit logs
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            filteringPlaceholder="Filter audit logs"
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={pageCount}
            onChange={({ detail }) => {
              setCurrentPage(detail.currentPageIndex);
              setSelectedItems([]);
            }}
          />
        }
        stickyHeader
        variant="full-page"
        empty="No audit log entries"
      />

      {selected && (
        <Container header={<Header variant="h2">Event details</Header>}>
          <ColumnLayout columns={3} variant="text-grid">
            <DetailField label="Timestamp">
              {new Date(selected.timestamp).toLocaleString()}
            </DetailField>
            <DetailField label="Actor">{selected.actor_name}</DetailField>
            <DetailField label="Actor ID">{selected.actor_sub}</DetailField>
            <DetailField label="Action">{selected.action}</DetailField>
            <DetailField label="Resource type">
              {selected.resource_type}
            </DetailField>
            <DetailField label="Resource">{selected.resource_name}</DetailField>
            <DetailField label="Resource ID">
              {selected.resource_id}
            </DetailField>
          </ColumnLayout>
          {Object.keys(selected.details).length > 0 && (
            <Box margin={{ top: "l" }}>
              <DetailField label="Details">
                <Box variant="code">
                  {JSON.stringify(selected.details, null, 2)}
                </Box>
              </DetailField>
            </Box>
          )}
        </Container>
      )}
    </SpaceBetween>
  );
}
