import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

let shouldThrow = false;

function Throwing() {
  if (shouldThrow) throw new Error("test error");
  return <span>ok</span>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = false;
  });

  it("renders children normally", () => {
    render(
      <ErrorBoundary>
        <span>hello</span>
      </ErrorBoundary>,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("catches errors and shows alert", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    shouldThrow = true;

    render(
      <ErrorBoundary>
        <Throwing />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("try again clears error and re-renders", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    shouldThrow = true;

    render(
      <ErrorBoundary>
        <Throwing />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByText("ok")).toBeInTheDocument();

    spy.mockRestore();
  });
});
