import "@testing-library/jest-dom/vitest";

// Mock matchMedia for ThemeProvider tests.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Cloudscape applyMode — it touches the DOM in ways jsdom doesn't support.
vi.mock("@cloudscape-design/global-styles", () => ({
  applyMode: vi.fn(),
  Mode: { Dark: "dark", Light: "light" },
}));
