// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Spinner from "@cloudscape-design/components/spinner";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useAlerts, useAlertRules } from "../api/hooks/useAlerts";
import type { AlertRuleSummary } from "../api/types";

const RULE_COLUMNS = [
  {
    id: "name",
    header: "Rule",
    cell: (item: AlertRuleSummary) => item.name,
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "metric",
    header: "Metric",
    cell: (item: AlertRuleSummary) => item.metric,
    sortingField: "metric",
  },
  {
    id: "condition",
    header: "Condition",
    cell: (item: AlertRuleSummary) => `${item.condition} ${item.threshold}`,
  },
  {
    id: "severity",
    header: "Severity",
    cell: (item: AlertRuleSummary) => {
      const type =
        item.severity === "critical"
          ? "error"
          : item.severity === "warning"
            ? "warning"
            : "info";
      return (
        <StatusIndicator type={type as "error" | "warning" | "info"}>
          {item.severity}
        </StatusIndicator>
      );
    },
    sortingField: "severity",
  },
];

export default function AlertsPage() {
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: rules = [], isLoading: rulesLoading } = useAlertRules();

  const { items, collectionProps } = useCollection(rules, {
    sorting: {
      defaultState: { sortingColumn: RULE_COLUMNS[0], isDescending: false },
    },
  });

  if (alertsLoading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Alert rules and active notifications">
        Alerts
      </Header>

      <Container
        header={
          <Header
            variant="h2"
            counter={`(${alerts?.active.length ?? 0})`}
            description={`${alerts?.total_fired ?? 0} total fired`}
          >
            Active alerts
          </Header>
        }
      >
        {alerts?.active.length ? (
          <SpaceBetween size="xs">
            {alerts.active.map((alert, i) => (
              <StatusIndicator key={i} type="warning">
                {alert}
              </StatusIndicator>
            ))}
          </SpaceBetween>
        ) : (
          <Box color="text-status-inactive" textAlign="center" padding="l">
            No active alerts
          </Box>
        )}
      </Container>

      <Table
        {...collectionProps}
        loading={rulesLoading}
        loadingText="Loading alert rules..."
        items={items}
        columnDefinitions={RULE_COLUMNS}
        header={
          <Header variant="h2" counter={`(${rules.length})`}>
            Alert rules
          </Header>
        }
        variant="container"
        empty="No alert rules configured"
      />
    </SpaceBetween>
  );
}
