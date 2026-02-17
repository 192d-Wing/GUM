import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import FormField from "@cloudscape-design/components/form-field";
import Select from "@cloudscape-design/components/select";
import type { SelectProps } from "@cloudscape-design/components/select";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { useCollection } from "@cloudscape-design/collection-hooks";
import {
  useDeployments,
  useCreateDeployment,
  useDeleteDeployment,
} from "../api/hooks/useDeployments";
import type { Deployment, HealthStatus, ServiceType } from "../api/types";

const SERVICE_OPTIONS: SelectProps.Option[] = [
  { label: "Crow DNS", value: "crow_dns" },
  { label: "NTP", value: "ntp" },
];

const COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Name",
    cell: (item: Deployment) => item.name,
    sortingField: "name",
    isRowHeader: true,
  },
  {
    id: "service_type",
    header: "Service",
    cell: (item: Deployment) =>
      item.service_type === "crow_dns" ? "Crow DNS" : "NTP",
    sortingField: "service_type",
  },
  {
    id: "endpoint_url",
    header: "Endpoint",
    cell: (item: Deployment) => item.endpoint_url,
  },
  {
    id: "health_status",
    header: "Status",
    cell: (item: Deployment) => {
      const map: Record<HealthStatus, "success" | "warning" | "error" | "stopped"> = {
        healthy: "success",
        degraded: "warning",
        unhealthy: "error",
        unknown: "stopped",
      };
      return (
        <StatusIndicator type={map[item.health_status] ?? "stopped"}>
          {item.health_status}
        </StatusIndicator>
      );
    },
    sortingField: "health_status",
  },
  {
    id: "created_at",
    header: "Created",
    cell: (item: Deployment) => new Date(item.created_at).toLocaleDateString(),
    sortingField: "created_at",
  },
];

export default function SettingsPage() {
  const { data: deployments = [], isLoading } = useDeployments();
  const createDeployment = useCreateDeployment();
  const deleteDeployment = useDeleteDeployment();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [serviceType, setServiceType] = useState<SelectProps.Option>(
    SERVICE_OPTIONS[0],
  );
  const [selectedItems, setSelectedItems] = useState<Deployment[]>([]);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const { items, collectionProps } = useCollection(deployments, {
    sorting: {
      defaultState: {
        sortingColumn: COLUMN_DEFINITIONS[0],
        isDescending: false,
      },
    },
  });

  const handleAdd = () => {
    if (!name.trim() || !endpointUrl.trim()) return;
    createDeployment.mutate(
      {
        name: name.trim(),
        service_type: (serviceType.value ?? "crow_dns") as ServiceType,
        endpoint_url: endpointUrl.trim(),
      },
      {
        onSuccess: (d) => {
          setFlash([
            {
              type: "success",
              content: `Deployment "${d.name}" added`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]);
          setShowAdd(false);
          setName("");
          setEndpointUrl("");
        },
        onError: (e) =>
          setFlash([
            {
              type: "error",
              content: `Failed: ${e.message}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
      },
    );
  };

  const handleDelete = () => {
    if (selectedItems.length === 0) return;
    const target = selectedItems[0];
    deleteDeployment.mutate(target.id, {
      onSuccess: () => {
        setFlash([
          {
            type: "success",
            content: `Deployment "${target.name}" removed`,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]);
        setSelectedItems([]);
      },
      onError: (e) =>
        setFlash([
          {
            type: "error",
            content: `Failed: ${e.message}`,
            dismissible: true,
            onDismiss: () => setFlash([]),
          },
        ]),
    });
  };

  return (
    <SpaceBetween size="l">
      <Flashbar items={flash} />
      <Table
        {...collectionProps}
        loading={isLoading}
        loadingText="Loading deployments..."
        items={items}
        columnDefinitions={COLUMN_DEFINITIONS}
        selectionType="single"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems as Deployment[])
        }
        header={
          <Header
            variant="h1"
            counter={`(${deployments.length})`}
            description="Register and manage Crow DNS and NTP server deployments"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={selectedItems.length === 0}
                  loading={deleteDeployment.isPending}
                  onClick={handleDelete}
                >
                  Remove
                </Button>
                <Button variant="primary" onClick={() => setShowAdd(true)}>
                  Add deployment
                </Button>
              </SpaceBetween>
            }
          >
            Settings
          </Header>
        }
        stickyHeader
        variant="full-page"
        empty="No deployments registered"
      />

      <Modal
        visible={showAdd}
        onDismiss={() => setShowAdd(false)}
        header="Add deployment"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                loading={createDeployment.isPending}
                disabled={!name.trim() || !endpointUrl.trim()}
              >
                Add
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Name" description="A friendly name for this deployment">
            <Input
              value={name}
              onChange={({ detail }) => setName(detail.value)}
              placeholder="prod-dns-east"
            />
          </FormField>
          <FormField label="Service type">
            <Select
              selectedOption={serviceType}
              onChange={({ detail }) => setServiceType(detail.selectedOption)}
              options={SERVICE_OPTIONS}
            />
          </FormField>
          <FormField
            label="Endpoint URL"
            description="The base URL of the service API"
          >
            <Input
              value={endpointUrl}
              onChange={({ detail }) => setEndpointUrl(detail.value)}
              placeholder="https://dns-east.internal:8080"
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}
