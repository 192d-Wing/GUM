import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useAuditLogs } from "../api/hooks/useAuditLogs";
import type { AuditLog } from "../api/types";

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

export default function AuditLogsPage() {
  const { data: logs = [], isLoading } = useAuditLogs();

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

  return (
    <Table
      {...collectionProps}
      loading={isLoading}
      loadingText="Loading audit logs..."
      items={items}
      columnDefinitions={COLUMN_DEFINITIONS}
      header={
        <Header
          variant="h1"
          counter={`(${logs.length})`}
          description="Activity log for deployment operations"
        >
          Audit logs
        </Header>
      }
      filter={
        <TextFilter {...filterProps} filteringPlaceholder="Filter audit logs" />
      }
      stickyHeader
      variant="full-page"
      empty="No audit log entries"
    />
  );
}
