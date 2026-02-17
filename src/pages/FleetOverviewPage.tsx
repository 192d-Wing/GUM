import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import Cards from "@cloudscape-design/components/cards";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Link from "@cloudscape-design/components/link";
import PropertyFilter from "@cloudscape-design/components/property-filter";
import type { PropertyFilterProps } from "@cloudscape-design/components/property-filter";
import { useDeployments } from "../api/hooks/useDeployments";
import { useFleetHealth } from "../api/hooks/useFleetHealth";
import type { Deployment, HealthStatus, ServiceType } from "../api/types";
import { matchesQuery } from "./filterUtils";

function healthIndicator(status: HealthStatus) {
  const map: Record<HealthStatus, "success" | "warning" | "error" | "stopped"> =
    {
      healthy: "success",
      degraded: "warning",
      unhealthy: "error",
      unknown: "stopped",
    };
  return (
    <StatusIndicator type={map[status] ?? "stopped"}>{status}</StatusIndicator>
  );
}

function serviceLabel(type: ServiceType) {
  return type === "crow_dns" ? "Crow DNS" : "NTP";
}

const FILTERING_PROPERTIES: PropertyFilterProps.FilteringProperty[] = [
  {
    key: "service_type",
    operators: ["=", "!="],
    propertyLabel: "Service type",
    groupValuesLabel: "Service type values",
  },
  {
    key: "health_status",
    operators: ["=", "!="],
    propertyLabel: "Health status",
    groupValuesLabel: "Health status values",
  },
  {
    key: "name",
    operators: ["=", "!=", ":", "!:"],
    propertyLabel: "Name",
    groupValuesLabel: "Name values",
  },
  {
    key: "tag",
    operators: ["=", "!=", ":", "!:"],
    propertyLabel: "Tag",
    groupValuesLabel: "Tag values",
  },
];

export default function FleetOverviewPage() {
  const navigate = useNavigate();
  const { data: deployments = [], isLoading } = useDeployments();
  const { data: fleet } = useFleetHealth();
  const [query, setQuery] = useState<PropertyFilterProps.Query>({
    tokens: [],
    operation: "and",
  });

  const filteredDeployments = useMemo(
    () => deployments.filter((d) => matchesQuery(d, query)),
    [deployments, query],
  );

  // Collect unique values for filter suggestions
  const filteringOptions = useMemo(() => {
    const options: PropertyFilterProps.FilteringOption[] = [];
    const serviceTypes = new Set<string>();
    const healthStatuses = new Set<string>();
    const tags = new Set<string>();

    for (const d of deployments) {
      serviceTypes.add(d.service_type);
      healthStatuses.add(d.health_status);
      for (const [k, v] of Object.entries(d.tags)) {
        tags.add(`${k}=${v}`);
      }
    }

    for (const st of serviceTypes) {
      options.push({ propertyKey: "service_type", value: st });
    }
    for (const hs of healthStatuses) {
      options.push({ propertyKey: "health_status", value: hs });
    }
    for (const t of tags) {
      options.push({ propertyKey: "tag", value: t });
    }

    return options;
  }, [deployments]);

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="All managed deployments across services"
      >
        Fleet overview
      </Header>

      <ColumnLayout columns={4} variant="text-grid">
        <Container header={<Header variant="h2">Total</Header>}>
          <Box variant="awsui-value-large">{fleet?.total ?? 0}</Box>
        </Container>
        <Container header={<Header variant="h2">Healthy</Header>}>
          <Box variant="awsui-value-large" color="text-status-success">
            {fleet?.healthy ?? 0}
          </Box>
        </Container>
        <Container header={<Header variant="h2">Degraded</Header>}>
          <Box variant="awsui-value-large" color="text-status-warning">
            {fleet?.degraded ?? 0}
          </Box>
        </Container>
        <Container header={<Header variant="h2">Unhealthy</Header>}>
          <Box variant="awsui-value-large" color="text-status-error">
            {fleet?.unhealthy ?? 0}
          </Box>
        </Container>
      </ColumnLayout>

      <Cards
        loading={isLoading}
        loadingText="Loading deployments..."
        items={filteredDeployments}
        filter={
          <PropertyFilter
            query={query}
            onChange={({ detail }) => setQuery(detail)}
            filteringProperties={FILTERING_PROPERTIES}
            filteringOptions={filteringOptions}
            i18nStrings={{
              filteringAriaLabel: "Filter deployments",
              filteringPlaceholder:
                "Filter by service type, health status, name, or tag",
              groupValuesText: "Values",
              groupPropertiesText: "Properties",
              operatorsText: "Operators",
              operationAndText: "and",
              operationOrText: "or",
              clearFiltersText: "Clear filters",
              applyActionText: "Apply",
              cancelActionText: "Cancel",
              enteredTextLabel: (text) => `Use: "${text}"`,
              allPropertiesLabel: "All properties",
              tokenLimitShowMore: "Show more",
              tokenLimitShowFewer: "Show fewer",
              removeTokenButtonAriaLabel: () => "Remove filter",
              operatorEqualsText: "equals",
              operatorContainsText: "contains",
            }}
          />
        }
        cardDefinition={{
          header: (item: Deployment) => (
            <Link
              onFollow={(e) => {
                e.preventDefault();
                navigate(`/deployments/${item.id}`);
              }}
              fontSize="heading-m"
            >
              {item.name}
            </Link>
          ),
          sections: [
            {
              id: "type",
              header: "Service",
              content: (item: Deployment) => serviceLabel(item.service_type),
            },
            {
              id: "status",
              header: "Status",
              content: (item: Deployment) =>
                healthIndicator(item.health_status),
            },
            {
              id: "tags",
              header: "Tags",
              content: (item: Deployment) => {
                const entries = Object.entries(item.tags);
                if (entries.length === 0)
                  return <Box color="text-body-secondary">None</Box>;
                return (
                  <SpaceBetween direction="horizontal" size="xs">
                    {entries.map(([k, v]) => (
                      <Box key={k} color="text-body-secondary">
                        {k}: {v}
                      </Box>
                    ))}
                  </SpaceBetween>
                );
              },
            },
            {
              id: "endpoint",
              header: "Endpoint",
              content: (item: Deployment) => (
                <Box color="text-body-secondary">{item.endpoint_url}</Box>
              ),
            },
            {
              id: "last_seen",
              header: "Last seen",
              content: (item: Deployment) =>
                item.last_seen
                  ? new Date(item.last_seen).toLocaleString()
                  : "Never",
            },
          ],
        }}
        header={
          <Header
            counter={`(${filteredDeployments.length})`}
            actions={
              <Button variant="primary" onClick={() => navigate("/settings")}>
                Manage deployments
              </Button>
            }
          >
            Deployments
          </Header>
        }
        empty={
          <Box textAlign="center" padding="xxl" color="text-body-secondary">
            <SpaceBetween size="m">
              <Box>
                {query.tokens.length > 0
                  ? "No deployments match the current filters."
                  : "No deployments registered yet."}
              </Box>
              {query.tokens.length === 0 && (
                <Button onClick={() => navigate("/settings")}>
                  Add a deployment
                </Button>
              )}
            </SpaceBetween>
          </Box>
        }
      />
    </SpaceBetween>
  );
}
