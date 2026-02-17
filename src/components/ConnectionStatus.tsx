// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import StatusIndicator from "@cloudscape-design/components/status-indicator";
import type { ConnectionStatus as Status } from "../providers/WebSocketProvider";

interface Props {
  status: Status;
}

export default function ConnectionStatus({ status }: Props) {
  switch (status) {
    case "connected":
      return <StatusIndicator type="success">Connected</StatusIndicator>;
    case "connecting":
      return <StatusIndicator type="loading">Reconnecting...</StatusIndicator>;
    case "disconnected":
      return <StatusIndicator type="error">Disconnected</StatusIndicator>;
  }
}
