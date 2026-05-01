import { describe, expect, it } from "vitest";
import {
  classifyM1Route,
  m1AllowedPublicRoutes,
  m1KnownNonScopeRoutes,
  m1RequiredCapabilities
} from "./m1Scope";

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("m1Scope contract", () => {
  it("keeps the allowed public M1 routes stable", () => {
    expect(m1AllowedPublicRoutes).toEqual([
      "/",
      "/intake",
      "/result",
      "/human-review"
    ]);
  });

  it("explicitly classifies known non-M1 routes", () => {
    expect(m1KnownNonScopeRoutes.map((route) => route.path)).toEqual([
      "/documents",
      "/trust",
      "/notifications",
      "/profile",
      "/residency-es",
      "/insurance-adult"
    ]);
    expect(m1KnownNonScopeRoutes.every((route) => route.reason && route.label)).toBe(true);
  });

  it("does not contain duplicate route or capability entries", () => {
    expectUnique(m1AllowedPublicRoutes);
    expectUnique(m1KnownNonScopeRoutes.map((route) => route.path));
    expectUnique(m1RequiredCapabilities.map((capability) => capability.id));
  });

  it("classifies allowed, known non-M1, and unknown routes", () => {
    expect(classifyM1Route("/result")).toEqual({
      kind: "allowed_m1",
      path: "/result"
    });
    expect(classifyM1Route("/profile")).toMatchObject({
      kind: "known_non_m1",
      route: { path: "/profile" }
    });
    expect(classifyM1Route("/experimental")).toEqual({
      kind: "unknown",
      path: "/experimental"
    });
  });
});
