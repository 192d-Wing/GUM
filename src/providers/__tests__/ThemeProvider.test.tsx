// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyMode } from "@cloudscape-design/global-styles";
import { ThemeProvider, useTheme } from "../ThemeProvider";

function ThemeConsumer() {
  const { mode, toggleMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggleMode}>Toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to system preference (dark) when nothing stored", () => {
    // matchMedia mock defaults to matching dark
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("reads stored preference from localStorage", () => {
    localStorage.setItem("crow_theme", "light");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("toggleMode switches and persists to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");

    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(localStorage.getItem("crow_theme")).toBe("light");

    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(localStorage.getItem("crow_theme")).toBe("dark");
  });

  it("calls applyMode on mode change", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Initial render calls applyMode with dark
    expect(applyMode).toHaveBeenCalledWith("dark");

    await user.click(screen.getByText("Toggle"));
    expect(applyMode).toHaveBeenCalledWith("light");
  });

  it("useTheme throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });
});
