import { Component, type ErrorInfo, type ReactNode } from "react";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Box padding="xl">
          <Alert
            type="error"
            header="Something went wrong"
            action={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => this.setState({ error: null })}>
                  Try again
                </Button>
                <Button variant="link" onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              </SpaceBetween>
            }
          >
            An unexpected error occurred. Please try again or reload the page.
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
