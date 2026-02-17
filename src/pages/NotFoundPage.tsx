// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Link from "@cloudscape-design/components/link";

export default function NotFoundPage() {
  return (
    <Box textAlign="center" padding={{ top: "xxxl" }}>
      <Header variant="h1">404</Header>
      <Box variant="p" padding={{ top: "s" }}>
        Page not found. <Link href="/">Return to fleet overview</Link>
      </Box>
    </Box>
  );
}
