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
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Pagination from "@cloudscape-design/components/pagination";
import PropertyFilter from "@cloudscape-design/components/property-filter";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useUsers, useCreateUser } from "../api/hooks/useUsers";
import type { UserInfo } from "../api/types";

const COLUMN_DEFINITIONS = [
  {
    id: "username",
    header: "Username",
    cell: (item: UserInfo) => item.username,
    sortingField: "username",
    isRowHeader: true,
  },
  {
    id: "email",
    header: "Email",
    cell: (item: UserInfo) => item.email ?? "\u2014",
  },
  {
    id: "roles",
    header: "Roles",
    cell: (item: UserInfo) => item.roles || "\u2014",
    sortingField: "roles",
  },
  {
    id: "mfa_enabled",
    header: "MFA",
    cell: (item: UserInfo) => (
      <StatusIndicator type={item.mfa_enabled ? "success" : "stopped"}>
        {item.mfa_enabled ? "Enabled" : "Disabled"}
      </StatusIndicator>
    ),
    sortingField: "mfa_enabled",
  },
  {
    id: "disabled",
    header: "Status",
    cell: (item: UserInfo) => (
      <StatusIndicator type={item.disabled ? "error" : "success"}>
        {item.disabled ? "Disabled" : "Active"}
      </StatusIndicator>
    ),
    sortingField: "disabled",
  },
  {
    id: "created_at",
    header: "Created",
    cell: (item: UserInfo) =>
      new Date(item.created_at * 1000).toLocaleDateString(),
    sortingField: "created_at",
  },
  {
    id: "expires_at",
    header: "Expires",
    cell: (item: UserInfo) =>
      item.expires_at
        ? new Date(item.expires_at * 1000).toLocaleDateString()
        : "Never",
  },
];

const FILTERING_PROPERTIES = [
  {
    key: "username",
    propertyLabel: "Username",
    operators: [":", "!:", "=", "!="] as const,
    groupValuesLabel: "Username values",
  },
  {
    key: "roles",
    propertyLabel: "Roles",
    operators: [":", "="] as const,
    groupValuesLabel: "Role values",
  },
];

export default function UsersPage() {
  const { data: userData, isLoading } = useUsers();
  const createUser = useCreateUser();
  const users = userData?.users ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const {
    items,
    filteredItemsCount,
    collectionProps,
    propertyFilterProps,
    paginationProps,
  } = useCollection(users, {
    propertyFiltering: {
      filteringProperties: FILTERING_PROPERTIES,
      empty: "No users",
      noMatch: "No matching users",
    },
    pagination: { pageSize: 25 },
    sorting: {
      defaultState: {
        sortingColumn: COLUMN_DEFINITIONS[0],
        isDescending: false,
      },
    },
  });

  const handleCreate = () => {
    if (!username.trim()) return;
    createUser.mutate(
      {
        username: username.trim(),
        email: email.trim() || undefined,
        roles: roles.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setCreatedToken(data.token);
          setFlash([
            {
              type: "success",
              content: `User "${data.username}" created`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]);
          setUsername("");
          setEmail("");
          setRoles("");
        },
        onError: (e) =>
          setFlash([
            {
              type: "error",
              content: `Failed to create user: ${e.message}`,
              dismissible: true,
              onDismiss: () => setFlash([]),
            },
          ]),
      },
    );
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreatedToken(null);
    setUsername("");
    setEmail("");
    setRoles("");
  };

  return (
    <SpaceBetween size="l">
      <Flashbar items={flash} />
      <Table
        {...collectionProps}
        loading={isLoading}
        loadingText="Loading users..."
        items={items}
        columnDefinitions={COLUMN_DEFINITIONS}
        header={
          <Header
            variant="h1"
            counter={`(${filteredItemsCount ?? users.length})`}
            description="User accounts and MFA management"
            actions={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                Create user
              </Button>
            }
          >
            Users
          </Header>
        }
        filter={
          <PropertyFilter
            {...propertyFilterProps}
            i18nStrings={{
              filteringAriaLabel: "Filter users",
              filteringPlaceholder: "Filter users by property or value",
            }}
          />
        }
        pagination={<Pagination {...paginationProps} />}
        stickyHeader
        variant="full-page"
      />

      <Modal
        visible={showCreate}
        onDismiss={closeCreate}
        header={createdToken ? "User created" : "Create user"}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={closeCreate}>
                {createdToken ? "Close" : "Cancel"}
              </Button>
              {!createdToken && (
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  loading={createUser.isPending}
                  disabled={!username.trim()}
                >
                  Create
                </Button>
              )}
            </SpaceBetween>
          </Box>
        }
      >
        {createdToken ? (
          <SpaceBetween size="m">
            <Box>Copy the API token now — it will not be shown again.</Box>
            <CopyToClipboard
              variant="inline"
              textToCopy={createdToken}
              copyButtonAriaLabel="Copy API token"
              copySuccessText="Token copied"
              copyErrorText="Failed to copy"
            />
          </SpaceBetween>
        ) : (
          <SpaceBetween size="m">
            <FormField label="Username">
              <Input
                value={username}
                onChange={({ detail }) => setUsername(detail.value)}
                placeholder="jdoe"
              />
            </FormField>
            <FormField label="Email" description="Optional">
              <Input
                value={email}
                onChange={({ detail }) => setEmail(detail.value)}
                placeholder="jdoe@example.com"
                type="email"
              />
            </FormField>
            <FormField
              label="Roles"
              description="Comma-separated list of roles (optional)"
            >
              <Input
                value={roles}
                onChange={({ detail }) => setRoles(detail.value)}
                placeholder="admin,operator"
              />
            </FormField>
          </SpaceBetween>
        )}
      </Modal>
    </SpaceBetween>
  );
}
