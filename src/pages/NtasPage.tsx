// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import FormField from "@cloudscape-design/components/form-field";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useNtas, useAddNta, useDeleteNta } from "../api/hooks/useNtas";

interface NtaRow {
  zone: string;
}

const COLUMN_DEFINITIONS = [
  {
    id: "zone",
    header: "Zone",
    cell: (item: NtaRow) => item.zone,
    sortingField: "zone",
    isRowHeader: true,
  },
];

export default function NtasPage() {
  const { data: ntaData, isLoading } = useNtas();
  const addNta = useAddNta();
  const deleteNta = useDeleteNta();

  const [showAdd, setShowAdd] = useState(false);
  const [newZone, setNewZone] = useState("");
  const [selectedItems, setSelectedItems] = useState<NtaRow[]>([]);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const rows: NtaRow[] = (ntaData?.ntas ?? []).map((zone) => ({ zone }));

  const { items, collectionProps } = useCollection(rows, {
    sorting: {
      defaultState: {
        sortingColumn: COLUMN_DEFINITIONS[0],
        isDescending: false,
      },
    },
  });

  const handleAdd = () => {
    if (!newZone.trim()) return;
    addNta.mutate(
      { zone: newZone.trim() },
      {
        onSuccess: () => {
          setFlash([
            {
              type: "success",
              content: `NTA added for ${newZone.trim()}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]);
          setShowAdd(false);
          setNewZone("");
        },
        onError: (e) =>
          setFlash([
            {
              type: "error",
              content: `Failed to add NTA: ${e.message}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
      },
    );
  };

  const handleDelete = () => {
    if (selectedItems.length === 0) return;
    const zone = selectedItems[0].zone;
    deleteNta.mutate(zone, {
      onSuccess: () => {
        setFlash([
          {
            type: "success",
            content: `NTA removed for ${zone}`,
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
            content: `Failed to remove NTA: ${e.message}`,
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
        loadingText="Loading NTAs..."
        items={items}
        columnDefinitions={COLUMN_DEFINITIONS}
        selectionType="single"
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems as NtaRow[])
        }
        header={
          <Header
            variant="h1"
            counter={`(${rows.length})`}
            description="Negative trust anchors for DNSSEC validation bypass (RFC 7646)"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={selectedItems.length === 0}
                  loading={deleteNta.isPending}
                  onClick={handleDelete}
                >
                  Remove
                </Button>
                <Button variant="primary" onClick={() => setShowAdd(true)}>
                  Add NTA
                </Button>
              </SpaceBetween>
            }
          >
            Negative trust anchors
          </Header>
        }
        stickyHeader
        variant="full-page"
        empty="No negative trust anchors configured"
      />

      <Modal
        visible={showAdd}
        onDismiss={() => setShowAdd(false)}
        header="Add negative trust anchor"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                loading={addNta.isPending}
                disabled={!newZone.trim()}
              >
                Add
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField
          label="Zone name"
          description="DNSSEC validation will be skipped for this zone"
        >
          <Input
            value={newZone}
            onChange={({ detail }) => setNewZone(detail.value)}
            placeholder="example.com"
            onKeyDown={({ detail }) => {
              if (detail.key === "Enter") handleAdd();
            }}
          />
        </FormField>
      </Modal>
    </SpaceBetween>
  );
}
