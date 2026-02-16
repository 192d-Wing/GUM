import { useParams, useNavigate } from "react-router";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import Pagination from "@cloudscape-design/components/pagination";
import PropertyFilter from "@cloudscape-design/components/property-filter";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useZone } from "../api/hooks/useZones";
import { useRecords } from "../api/hooks/useRecords";
import type { RecordEntry } from "../api/types";

const RECORD_COLUMNS = [
  {
    id: "name",
    header: "Name",
    cell: (item: RecordEntry) => item.name,
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "rtype",
    header: "Type",
    cell: (item: RecordEntry) => item.rtype,
    sortingField: "rtype",
  },
  {
    id: "rclass",
    header: "Class",
    cell: (item: RecordEntry) => item.rclass,
  },
  {
    id: "ttl",
    header: "TTL",
    cell: (item: RecordEntry) => item.ttl.toLocaleString(),
    sortingField: "ttl",
  },
  {
    id: "rdata",
    header: "Data",
    cell: (item: RecordEntry) => item.rdata_display ?? item.rdata_hex,
  },
];

const RECORD_FILTER_PROPERTIES = [
  {
    key: "name",
    propertyLabel: "Name",
    operators: [":", "!:", "=", "!="] as const,
    groupValuesLabel: "Name values",
  },
  {
    key: "rtype",
    propertyLabel: "Type",
    operators: ["=", "!="] as const,
    groupValuesLabel: "Type values",
  },
];

export default function ZoneDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const { data: zone, isLoading: zoneLoading } = useZone(name);
  const { data: records = [], isLoading: recordsLoading } = useRecords(name);

  const {
    items,
    filteredItemsCount,
    collectionProps,
    propertyFilterProps,
    paginationProps,
  } = useCollection(records, {
    propertyFiltering: {
      filteringProperties: RECORD_FILTER_PROPERTIES,
      empty: "No records",
      noMatch: "No matching records",
    },
    pagination: { pageSize: 25 },
    sorting: {
      defaultState: { sortingColumn: RECORD_COLUMNS[0], isDescending: false },
    },
  });

  if (zoneLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  if (!zone) {
    return (
      <StatusIndicator type="error">Zone "{name}" not found</StatusIndicator>
    );
  }

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: "Zones", href: "/zones" },
          { text: zone.name, href: `/zones/${encodeURIComponent(zone.name)}` },
        ]}
        onFollow={(event) => {
          event.preventDefault();
          navigate(event.detail.href);
        }}
      />

      <Header variant="h1">{zone.name}</Header>

      <Container header={<Header variant="h2">Zone details</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Serial</Box>
            <Box>{zone.serial.toLocaleString()}</Box>
          </div>
          <div>
            <Box variant="awsui-key-label">Role</Box>
            <StatusIndicator
              type={zone.role === "primary" ? "success" : "info"}
            >
              {zone.role}
            </StatusIndicator>
          </div>
          <div>
            <Box variant="awsui-key-label">Records</Box>
            <Box>{zone.record_count.toLocaleString()}</Box>
          </div>
        </ColumnLayout>
      </Container>

      <Table
        {...collectionProps}
        loading={recordsLoading}
        loadingText="Loading records..."
        items={items}
        columnDefinitions={RECORD_COLUMNS}
        header={
          <Header
            variant="h2"
            counter={`(${filteredItemsCount ?? records.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary">Add record</Button>
              </SpaceBetween>
            }
          >
            Records
          </Header>
        }
        filter={
          <PropertyFilter
            {...propertyFilterProps}
            i18nStrings={{
              filteringAriaLabel: "Filter records",
              filteringPlaceholder:
                "Filter records by property or value",
            }}
          />
        }
        pagination={<Pagination {...paginationProps} />}
        stickyHeader
      />
    </SpaceBetween>
  );
}
