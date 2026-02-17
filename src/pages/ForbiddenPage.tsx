// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Link from "@cloudscape-design/components/link";

export default function ForbiddenPage() {
  return (
    <Box textAlign="center" padding={{ top: "xxxl" }}>
      <Header variant="h1">403</Header>
      <Box variant="p" padding={{ top: "s" }}>
        You don't have permission to view this page.{" "}
        <Link href="/">Return to fleet overview</Link>
      </Box>
    </Box>
  );
}
