// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Pagination from "@cloudscape-design/components/pagination";
import PropertyFilter from "@cloudscape-design/components/property-filter";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useHealthTargets } from "../api/hooks/useHealth";
import type { HealthTargetState } from "../api/types";

const COLUMN_DEFINITIONS = [
  {
    id: "target_id",
    header: "Target",
    cell: (item: HealthTargetState) => item.target_id,
    sortingField: "target_id",
    isRowHeader: true,
  },
  {
    id: "healthy",
    header: "Status",
    cell: (item: HealthTargetState) => (
      <StatusIndicator type={item.healthy ? "success" : "error"}>
        {item.healthy ? "Healthy" : "Unhealthy"}
      </StatusIndicator>
    ),
    sortingField: "healthy",
  },
  {
    id: "latency_ms",
    header: "Latency",
    cell: (item: HealthTargetState) =>
      item.latency_ms !== null ? `${item.latency_ms} ms` : "\u2014",
    sortingField: "latency_ms",
  },
  {
    id: "consecutive_successes",
    header: "Successes",
    cell: (item: HealthTargetState) => item.consecutive_successes,
    sortingField: "consecutive_successes",
  },
  {
    id: "consecutive_failures",
    header: "Failures",
    cell: (item: HealthTargetState) => item.consecutive_failures,
    sortingField: "consecutive_failures",
  },
];

const FILTERING_PROPERTIES = [
  {
    key: "target_id",
    propertyLabel: "Target",
    operators: [":", "!:", "=", "!="] as const,
    groupValuesLabel: "Target values",
  },
  {
    key: "healthy",
    propertyLabel: "Healthy",
    operators: ["="] as const,
    groupValuesLabel: "Status values",
  },
];

export default function HealthPage() {
  const { data, isLoading } = useHealthTargets(10000);
  const targets = data?.targets ?? [];

  const {
    items,
    filteredItemsCount,
    collectionProps,
    propertyFilterProps,
    paginationProps,
  } = useCollection(targets, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: "No health check targets",
      noMatch: "No matching targets",
    },
    pagination: { pageSize: 25 },
    sorting: {
      defaultState: {
        sortingColumn: COLUMN_DEFINITIONS[0],
        isDescending: false,
      },
    },
  });

  return (
    <Table
      {...collectionProps}
      loading={isLoading}
      loadingText="Loading health targets..."
      items={items}
      columnDefinitions={COLUMN_DEFINITIONS}
      header={
        <Header
          variant="h1"
          counter={`(${filteredItemsCount ?? targets.length})`}
          description="Health check targets and status \u2014 refreshes every 10 seconds"
        >
          Health checks
        </Header>
      }
      filter={
        <PropertyFilter
          {...propertyFilterProps}
          i18nStrings={{
            filteringAriaLabel: "Filter health targets",
            filteringPlaceholder: "Filter targets by property or value",
          }}
        />
      }
      pagination={<Pagination {...paginationProps} />}
      stickyHeader
      variant="full-page"
    />
  );
}
