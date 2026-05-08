import { afterEach, describe, expect, it, vi } from "vitest";
import { clearEvents, eventSchema, recentEvents, track } from "./events";

describe("instrumentation events", () => {
  afterEach(() => {
    clearEvents();
    vi.restoreAllMocks();
  });

  it("accepts a typed M1 funnel event with safe metadata", () => {
    const parsed = eventSchema.parse({
      type: "m1_funnel_event",
      name: "m1_result_viewed",
      caseId: "s1-rf-italy",
      productType: "travel"
    });

    expect(parsed.type).toBe("m1_funnel_event");
    if (parsed.type !== "m1_funnel_event") {
      throw new Error("Expected m1_funnel_event");
    }
    expect(parsed.name).toBe("m1_result_viewed");
  });

  it("drops invalid funnel event names instead of recording them", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    track({
      type: "m1_funnel_event",
      name: "custom_unknown_event"
    } as any);

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(recentEvents()).toEqual([]);
  });
});
