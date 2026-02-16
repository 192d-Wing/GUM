import { useState, useEffect } from "react";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Flashbar from "@cloudscape-design/components/flashbar";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";
import {
  useBlocklist,
  useAllowlist,
  useUpdateBlocklist,
  useUpdateAllowlist,
} from "../api/hooks/useFirewall";

function DomainListEditor({
  title,
  description,
  domains,
  isLoading,
  isError,
  onSave,
  isSaving,
}: {
  title: string;
  description: string;
  domains: string[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onSave: (domains: string[]) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (domains) {
      setValue(domains.join("\n"));
      setDirty(false);
    }
  }, [domains]);

  if (isLoading) {
    return (
      <Container header={<Header variant="h2">{title}</Header>}>
        <Box textAlign="center" padding="l">
          <Spinner />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container header={<Header variant="h2">{title}</Header>}>
        <StatusIndicator type="error">Failed to load {title.toLowerCase()}</StatusIndicator>
      </Container>
    );
  }

  const handleSave = () => {
    const parsed = value
      .split("\n")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    onSave(parsed);
    setDirty(false);
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={description}
          counter={`(${(domains ?? []).length})`}
          actions={
            <Button
              variant="primary"
              disabled={!dirty || isSaving}
              loading={isSaving}
              onClick={handleSave}
            >
              Save
            </Button>
          }
        >
          {title}
        </Header>
      }
    >
      <Textarea
        value={value}
        onChange={({ detail }) => {
          setValue(detail.value);
          setDirty(true);
        }}
        rows={12}
        ariaLabel={`${title} domains, one per line`}
        placeholder="one domain per line, e.g.&#10;malware.example.com&#10;ads.tracker.net"
      />
    </Container>
  );
}

export default function FirewallPage() {
  const blocklist = useBlocklist();
  const allowlist = useAllowlist();
  const updateBlocklist = useUpdateBlocklist();
  const updateAllowlist = useUpdateAllowlist();
  const [flash, setFlash] = useState<FlashbarProps.MessageDefinition[]>([]);

  const handleBlocklistSave = (domains: string[]) => {
    updateBlocklist.mutate(
      { domains },
      {
        onSuccess: () =>
          setFlash([{ type: "success", content: "Blocklist updated", dismissible: true, onDismiss: () => setFlash([]) }]),
        onError: (e) =>
          setFlash([{ type: "error", content: `Failed to update blocklist: ${e.message}`, dismissible: true, onDismiss: () => setFlash([]) }]),
      },
    );
  };

  const handleAllowlistSave = (domains: string[]) => {
    updateAllowlist.mutate(
      { domains },
      {
        onSuccess: () =>
          setFlash([{ type: "success", content: "Allowlist updated", dismissible: true, onDismiss: () => setFlash([]) }]),
        onError: (e) =>
          setFlash([{ type: "error", content: `Failed to update allowlist: ${e.message}`, dismissible: true, onDismiss: () => setFlash([]) }]),
      },
    );
  };

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="DNS firewall blocklist and allowlist management">
        Firewall
      </Header>
      <Flashbar items={flash} />
      <DomainListEditor
        title="Blocklist"
        description="Blocked domains — queries matching these domains will be refused"
        domains={blocklist.data?.domains}
        isLoading={blocklist.isLoading}
        isError={blocklist.isError}
        onSave={handleBlocklistSave}
        isSaving={updateBlocklist.isPending}
      />
      <DomainListEditor
        title="Allowlist"
        description="Allowed domains — these domains bypass firewall rules"
        domains={allowlist.data?.domains}
        isLoading={allowlist.isLoading}
        isError={allowlist.isError}
        onSave={handleAllowlistSave}
        isSaving={updateAllowlist.isPending}
      />
    </SpaceBetween>
  );
}
