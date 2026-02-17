// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

import { getReconnectDelay, BASE_DELAY, MAX_DELAY } from "../backoff";

describe("getReconnectDelay", () => {
  it("attempt 0 returns delay around 1s", () => {
    const delay = getReconnectDelay(0);
    expect(delay).toBeGreaterThanOrEqual(BASE_DELAY * 0.5);
    expect(delay).toBeLessThanOrEqual(BASE_DELAY * 1.5);
  });

  it("delay doubles each attempt", () => {
    const delay = getReconnectDelay(1);
    expect(delay).toBeGreaterThanOrEqual(BASE_DELAY * 2 * 0.5);
    expect(delay).toBeLessThanOrEqual(BASE_DELAY * 2 * 1.5);
  });

  it("caps at MAX_DELAY", () => {
    const delay = getReconnectDelay(10);
    expect(delay).toBeLessThanOrEqual(MAX_DELAY);
  });

  it("jitter produces varying results", () => {
    const results = new Set<number>();
    for (let i = 0; i < 20; i++) {
      results.add(getReconnectDelay(3));
    }
    // With jitter, 20 calls should produce at least 2 distinct values
    expect(results.size).toBeGreaterThan(1);
  });
});
