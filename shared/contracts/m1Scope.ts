export const m1AllowedPublicRoutes = [
  "/",
  "/intake",
  "/result",
  "/human-review"
] as const;
export type M1AllowedPublicRoute = (typeof m1AllowedPublicRoutes)[number];

export type M1NonScopeReason =
  | "supporting_surface"
  | "account_or_notification"
  | "separate_product_vertical";

export type M1KnownNonScopeRoute = {
  readonly path: string;
  readonly reason: M1NonScopeReason;
  readonly label: string;
};

export const m1KnownNonScopeRoutes: readonly M1KnownNonScopeRoute[] = [];

export type M1RequiredCapability = {
  readonly id: string;
  readonly label: string;
};

export const m1RequiredCapabilities = [
  {
    id: "landing",
    label: "Landing entry for visa readiness"
  },
  {
    id: "quick_intake",
    label: "Quick Visa Intake"
  },
  {
    id: "deterministic_verdict",
    label: "Deterministic Verdict"
  },
  {
    id: "trust_layer",
    label: "Trust Layer"
  },
  {
    id: "insurance_attach",
    label: "Insurance Attach"
  },
  {
    id: "human_review_lead",
    label: "Human Review Lead"
  }
] as const satisfies readonly M1RequiredCapability[];

export type M1RouteClassification =
  | { readonly kind: "allowed_m1"; readonly path: M1AllowedPublicRoute }
  | { readonly kind: "known_non_m1"; readonly route: M1KnownNonScopeRoute }
  | { readonly kind: "unknown"; readonly path: string };

export function isM1AllowedPublicRoute(path: string): path is M1AllowedPublicRoute {
  return m1AllowedPublicRoutes.includes(path as M1AllowedPublicRoute);
}

export function classifyM1Route(path: string): M1RouteClassification {
  if (isM1AllowedPublicRoute(path)) {
    return { kind: "allowed_m1", path };
  }

  const knownNonScopeRoute = m1KnownNonScopeRoutes.find((route) => route.path === path);
  if (knownNonScopeRoute) {
    return { kind: "known_non_m1", route: knownNonScopeRoute };
  }

  return { kind: "unknown", path };
}
