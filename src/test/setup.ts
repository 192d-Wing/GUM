// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import "@testing-library/jest-dom/vitest";

// Polyfill localStorage for jsdom — Node 22+ ships a built-in localStorage
// that conflicts with jsdom when no --localstorage-file is provided.
if (
  typeof localStorage === "undefined" ||
  typeof localStorage.getItem !== "function"
) {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    writable: true,
  });
}

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
