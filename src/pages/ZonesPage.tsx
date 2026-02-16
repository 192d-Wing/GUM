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
import { useZones } from "../api/hooks/useZones";
import type { ZoneSummary } from "../api/types";

const COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Zone name",
    cell: (item: ZoneSummary) => item.name,
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "serial",
    header: "Serial",
    cell: (item: ZoneSummary) => item.serial.toLocaleString(),
    sortingField: "serial",
  },
  {
    id: "role",
    header: "Role",
    cell: (item: ZoneSummary) => (
      <StatusIndicator type={item.role === "primary" ? "success" : "info"}>
        {item.role}
      </StatusIndicator>
    ),
    sortingField: "role",
  },
  {
    id: "record_count",
    header: "Records",
    cell: (item: ZoneSummary) => item.record_count.toLocaleString(),
    sortingField: "record_count",
  },
];

const FILTERING_PROPERTIES = [
  {
    key: "name",
    propertyLabel: "Name",
    operators: [":", "!:", "=", "!="] as const,
    groupValuesLabel: "Zone name values",
  },
  {
    key: "role",
    propertyLabel: "Role",
    operators: ["=", "!="] as const,
    groupValuesLabel: "Role values",
  },
];

export default function ZonesPage() {
  const navigate = useNavigate();
  const { data: zones = [], isLoading } = useZones();
  const [selectedItems, setSelectedItems] = useState<ZoneSummary[]>([]);

  const {
    items,
    filteredItemsCount,
    collectionProps,
    propertyFilterProps,
    paginationProps,
  } = useCollection(zones, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: "No zones",
      noMatch: "No matching zones",
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
      loadingText="Loading zones..."
      items={items}
      columnDefinitions={COLUMN_DEFINITIONS}
      selectionType="single"
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) =>
        setSelectedItems(detail.selectedItems as ZoneSummary[])
      }
      onRowClick={({ detail }) => navigate(`/zones/${encodeURIComponent(detail.item.name)}`)}
      header={
        <Header
          variant="h1"
          counter={`(${filteredItemsCount ?? zones.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (selectedItems[0]) {
                    navigate(`/zones/${encodeURIComponent(selectedItems[0].name)}`);
                  }
                }}
              >
                View details
              </Button>
              <Button variant="primary">Create zone</Button>
            </SpaceBetween>
          }
        >
          Zones
        </Header>
      }
      filter={
        <PropertyFilter
          {...propertyFilterProps}
          i18nStrings={{
            filteringAriaLabel: "Filter zones",
            filteringPlaceholder: "Filter zones by property or value",
          }}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      stickyHeader
      variant="full-page"
    />
  );
}
