import { z } from "zod";

export const m1FunnelEventNameSchema = z.enum([
  "m1_landing_primary_cta_clicked",
  "m1_intake_started",
  "m1_result_viewed",
  "m1_insurance_cta_viewed",
  "m1_insurance_cta_clicked",
  "m1_human_review_cta_viewed",
  "m1_human_review_cta_clicked",
  "m1_human_review_lead_submitted"
]);

export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("screen_view"), screen: z.string() }),
  z.object({ type: z.literal("section_toggle"), screen: z.string(), sectionId: z.string(), open: z.boolean() }),
  z.object({ type: z.literal("signal_drilldown"), signalId: z.string() }),
  z.object({ type: z.literal("path_compare"), pathIds: z.array(z.string()) }),
  z.object({ type: z.literal("path_switch"), pathId: z.string() }),
  z.object({ type: z.literal("intake_answered"), signalId: z.string(), informationGain: z.number() }),
  z.object({ type: z.literal("preview_seen"), verdict: z.string(), confidence: z.number() }),
  z.object({ type: z.literal("replay_opened"), caseId: z.string() }),
  z.object({ type: z.literal("replay_finished"), caseId: z.string(), steps: z.number() }),
  z.object({ type: z.literal("whatif_triggered"), signalId: z.string() }),
  z.object({ type: z.literal("temporal_slider_dragged"), delta: z.number() }),
  z.object({ type: z.literal("cta_visible"), cta: z.string() }),
  z.object({ type: z.literal("cta_clicked"), cta: z.string() }),
  z.object({
    type: z.literal("m1_funnel_event"),
    name: m1FunnelEventNameSchema,
    caseId: z.string().optional(),
    scenarioCaseId: z.string().optional(),
    productType: z.string().optional(),
    nextActionType: z.string().optional(),
    targetScreen: z.string().optional(),
    channel: z.string().optional(),
    reused: z.boolean().optional()
  }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
  z.object({ type: z.literal("engine_timing"), step: z.string(), tookMs: z.number() })
]);

export type InstrumentationEvent = z.infer<typeof eventSchema>;

const ringSize = 200;
const ring: InstrumentationEvent[] = [];
const listeners: Array<(event: InstrumentationEvent) => void> = [];

export function track(event: InstrumentationEvent): void {
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) {
    console.warn("[active-holidays] invalid event", event);
    return;
  }
  if (ring.length >= ringSize) ring.shift();
  ring.push(parsed.data);
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[active-holidays] event", parsed.data);
  }
  for (const listener of listeners) listener(parsed.data);
}

export function recentEvents(): InstrumentationEvent[] {
  return ring.slice();
}

export function onEvent(listener: (event: InstrumentationEvent) => void): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

export function clearEvents(): void {
  ring.length = 0;
}
