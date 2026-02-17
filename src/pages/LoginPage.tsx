// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useNavigate } from "react-router";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import { useAuth } from "../providers/AuthProvider";

export default function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to home.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <Box textAlign="center" padding={{ top: "xxxl" }}>
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <Box padding={{ top: "xxxl" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Container header={<Header variant="h2">Sign in to GUM</Header>}>
          <SpaceBetween size="l">
            <Box variant="p" color="text-body-secondary">
              GUM uses Single Sign-On (SSO) for authentication. Click the button
              below to sign in with your organization's identity provider.
            </Box>
            <Button variant="primary" onClick={login} fullWidth>
              Sign in with SSO
            </Button>
          </SpaceBetween>
        </Container>
      </div>
    </Box>
  );
}
