import { useState } from "react";
import { useNavigate } from "react-router";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Pagination from "@cloudscape-design/components/pagination";
import PropertyFilter from "@cloudscape-design/components/property-filter";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useNtpSources } from "../../api/hooks/useNtpSources";
import { useDeploymentPath } from "../../hooks/useDeploymentPath";
import type { NtpSource } from "../../api/types";

function stateIndicator(state: NtpSource["state"]) {
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

const COLUMN_DEFINITIONS = [
  {
    id: "address",
    header: "Address",
    cell: (item: NtpSource) => item.address,
    sortingField: "address",
    isRowHeader: true,
  },
  {
    id: "stratum",
    header: "Stratum",
    cell: (item: NtpSource) => item.stratum,
    sortingField: "stratum",
  },
  {
    id: "state",
    header: "State",
    cell: (item: NtpSource) => stateIndicator(item.state),
    sortingField: "state",
  },
];

const FILTERING_PROPERTIES = [
  {
    key: "address",
    propertyLabel: "Address",
    operators: [":", "!:", "=", "!="] as const,
    groupValuesLabel: "Address values",
  },
  {
    key: "state",
    propertyLabel: "State",
    operators: ["=", "!="] as const,
    groupValuesLabel: "State values",
  },
];

export default function NtpSourcesPage() {
  const navigate = useNavigate();
  const path = useDeploymentPath();
  const { data: sources = [], isLoading } = useNtpSources();
  const [selectedItems, setSelectedItems] = useState<NtpSource[]>([]);

  const {
    items,
    filteredItemsCount,
    collectionProps,
    propertyFilterProps,
    paginationProps,
  } = useCollection(sources, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: "No NTP sources",
      noMatch: "No matching sources",
    },
    pagination: { pageSize: 25 },
    sorting: {
      defaultState: { sortingColumn: COLUMN_DEFINITIONS[0], isDescending: false },
    },
    selection: {},
  });

  return (
    <Table
      {...collectionProps}
      loading={isLoading}
      loadingText="Loading NTP sources..."
      items={items}
      columnDefinitions={COLUMN_DEFINITIONS}
      selectionType="single"
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) =>
        setSelectedItems(detail.selectedItems as NtpSource[])
      }
      onRowClick={({ detail }) =>
        navigate(path(`sources/${encodeURIComponent(detail.item.id)}`))
      }
      header={
        <Header
          variant="h1"
          counter={`(${filteredItemsCount ?? sources.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (selectedItems[0]) {
                    navigate(path(`sources/${encodeURIComponent(selectedItems[0].id)}`));
                  }
                }}
              >
                View details
              </Button>
              <Button variant="primary">Add source</Button>
            </SpaceBetween>
          }
        >
          NTP sources
        </Header>
      }
      filter={
        <PropertyFilter
          {...propertyFilterProps}
          i18nStrings={{
            filteringAriaLabel: "Filter NTP sources",
            filteringPlaceholder: "Filter sources by property or value",
          }}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      stickyHeader
      variant="full-page"
    />
  );
}
