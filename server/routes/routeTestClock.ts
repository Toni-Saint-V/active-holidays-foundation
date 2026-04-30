import { afterAll, afterEach, beforeEach, vi } from "vitest";

export const STABLE_ROUTE_TEST_NOW = new Date("2026-04-17T09:00:00.000Z");

export function installStableRouteTestClock(now = STABLE_ROUTE_TEST_NOW): void {
  const freeze = () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  };

  beforeEach(freeze);
  afterEach(freeze);
  afterAll(() => {
    vi.useRealTimers();
  });
}
