import { useState } from "react";
import { useNavigate } from "react-router";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Alert from "@cloudscape-design/components/alert";
import { useAuth } from "../providers/AuthProvider";

export default function LoginPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!tokenInput.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await login(tokenInput.trim());
      navigate("/");
    } catch {
      setError("Invalid API token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding={{ top: "xxxl" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Container header={<Header variant="h2">Sign in to Crow DNS</Header>}>
          <SpaceBetween size="l">
            {error && (
              <Alert type="error" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            <FormField
              label="API Token"
              description="Enter your Bearer API token to authenticate."
            >
              <Input
                type="password"
                value={tokenInput}
                onChange={({ detail }) => setTokenInput(detail.value)}
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") handleSubmit();
                }}
                placeholder="Enter API token"
                disabled={loading}
              />
            </FormField>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!tokenInput.trim()}
            >
              Sign in
            </Button>
          </SpaceBetween>
        </Container>
      </div>
    </Box>
  );
}
