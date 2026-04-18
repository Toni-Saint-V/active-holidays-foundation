import type { EngineVersion } from "@shared/contracts";

// Bump ENGINE_REVISION in the same commit that changes engine logic, rule
// definitions, or anything that can flip a deterministic decision. The
// verify:engine drift gate reads this constant, so forgetting to bump it
// while changing engine behaviour will fail CI and force the review to be
// explicit.
export const ENGINE_VERSION: EngineVersion = "rdc.v1";
export const ENGINE_REVISION = "2026.04.18";
