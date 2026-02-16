import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Pagination from "@cloudscape-design/components/pagination";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useCatalogs } from "../api/hooks/useCatalogs";
import type { CatalogSummary } from "../api/types";

const COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Catalog zone",
    cell: (item: CatalogSummary) => item.name,
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "member_count",
    header: "Members",
    cell: (item: CatalogSummary) => item.member_count.toLocaleString(),
    sortingField: "member_count",
  },
];

export default function CatalogsPage() {
  const { data: catalogs = [], isLoading } = useCatalogs();

  const { items, collectionProps, paginationProps } = useCollection(catalogs, {
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
      loadingText="Loading catalog zones..."
      items={items}
      columnDefinitions={COLUMN_DEFINITIONS}
      header={
        <Header
          variant="h1"
          counter={`(${catalogs.length})`}
          description="RFC 9432 catalog zones and their member zones"
        >
          Catalog zones
        </Header>
      }
      pagination={<Pagination {...paginationProps} />}
      stickyHeader
      variant="full-page"
      empty="No catalog zones configured"
    />
  );
}
