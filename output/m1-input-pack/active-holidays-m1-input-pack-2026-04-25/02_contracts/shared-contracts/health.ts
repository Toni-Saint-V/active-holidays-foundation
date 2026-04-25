import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("active-holidays-foundation"),
  phase: z.literal("m1"),
  version: z.literal("rdc.v1")
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
